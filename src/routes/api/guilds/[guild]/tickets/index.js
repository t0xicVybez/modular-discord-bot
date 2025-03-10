const { isStaff } = require('../../../../../lib/users');
const { quick } = require('../../../../../lib/threads');

module.exports.post = fastify => ({
  handler: async (req, res) => {
    /** @type {import('client')} */
    const client = req.routeOptions.config.client;
    const guildId = req.params.guild;
    const { categoryId, topic, userId = req.user.id } = req.body;

    // Check if guild exists
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      return res.code(404).send({
        error: 'Not Found',
        message: 'Guild not found',
        statusCode: 404,
      });
    }

    // Get the category
    const category = await client.prisma.category.findUnique({
      where: { id: categoryId },
    });
    
    if (!category || category.guildId !== guildId) {
      return res.code(404).send({
        error: 'Not Found',
        message: 'Category not found',
        statusCode: 404,
      });
    }

    // Check user permissions if userId is provided
    if (userId !== req.user.id && !(await isStaff(guild, req.user.id))) {
      return res.code(403).send({
        error: 'Forbidden',
        message: 'You do not have permission to create tickets for other users',
        statusCode: 403,
      });
    }

    // Validate topic if category requires it
    if (category.requireTopic && !topic) {
      return res.code(400).send({
        error: 'Bad Request',
        message: 'Topic is required for this category',
        statusCode: 400,
      });
    }

    try {
      // Get user from Discord
      const member = await guild.members.fetch(userId);
      
      if (!member) {
        return res.code(404).send({
          error: 'Not Found',
          message: 'User not found in guild',
          statusCode: 404,
        });
      }
      
      // Check member limit
      const memberCount = await client.tickets.getMemberCount(categoryId, userId);
      if (memberCount >= category.memberLimit) {
        return res.code(429).send({
          error: 'Too Many Requests',
          message: 'User has reached the ticket limit for this category',
          statusCode: 429,
        });
      }

      // Check cooldown
      const cooldown = await client.tickets.getCooldown(categoryId, userId);
      if (cooldown) {
        return res.code(429).send({
          error: 'Too Many Requests',
          message: 'User is on cooldown for this category',
          statusCode: 429,
          cooldownExpiresAt: cooldown,
        });
      }

      // Create the channel for the ticket
      const number = await client.tickets.getNextNumber(guildId);
      const channelName = category.channelName
        .replace(/{+\s?(user)?name\s?}+/gi, member.user.username)
        .replace(/{+\s?(nick|display)(name)?\s?}+/gi, member.displayName)
        .replace(/{+\s?num(ber)?\s?}+/gi, number === 1488 ? '1487b' : number);

      const allow = ['ViewChannel', 'ReadMessageHistory', 'SendMessages', 'EmbedLinks', 'AttachFiles'];
      const channel = await guild.channels.create({
        name: channelName,
        parent: category.discordCategory,
        permissionOverwrites: [
          {
            deny: ['ViewChannel'],
            id: guild.roles.everyone.id,
          },
          {
            allow,
            id: client.user.id,
          },
          {
            allow,
            id: member.id,
          },
          ...category.staffRoles.map(id => ({
            allow,
            id,
          })),
        ],
        rateLimitPerUser: category.ratelimit,
        reason: `Web API ticket created for ${member.user.tag}`,
        topic: `${member}${topic ? ` | ${topic}` : ''}`,
      });

      // Send opening message
      const embeds = [{
        color: parseInt(category.guild.primaryColour.replace('#', ''), 16),
        author: {
          name: member.displayName,
          icon_url: member.displayAvatarURL(),
        },
        description: category.openingMessage
          .replace(/{+\s?(user)?name\s?}+/gi, member.user.toString())
          .replace(/{+\s?num(ber)?\s?}+/gi, number),
      }];

      if (category.image) {
        embeds[0].image = { url: category.image };
      }

      if (topic) {
        embeds.push({
          color: parseInt(category.guild.primaryColour.replace('#', ''), 16),
          fields: [{
            name: 'Topic',
            value: topic,
          }],
        });
      }

      const sent = await channel.send({
        content: `${member.toString()}, ${category.pingRoles.map(r => `<@&${r}>`).join(' ')}`,
        embeds,
      });

      await sent.pin({ reason: 'Ticket opening message' });

      // Create the ticket in database
      const data = {
        category: { connect: { id: categoryId } },
        createdBy: {
          connectOrCreate: {
            create: { id: member.id },
            where: { id: member.id },
          },
        },
        guild: { connect: { id: guildId } },
        id: channel.id,
        number,
        openingMessageId: sent.id,
        topic: topic ? await quick('crypto', worker => worker.encrypt(topic)) : null,
      };

      const ticket = await client.prisma.ticket.create({ data });

      // Update counters
      client.tickets.$count.categories[categoryId].total++;
      client.tickets.$count.categories[categoryId][member.id]++;

      // Set cooldown if applicable
      if (category.cooldown) {
        const cacheKey = `cooldowns/category-member:${category.id}-${member.id}`;
        const expiresAt = ticket.createdAt.getTime() + category.cooldown;
        const TTL = category.cooldown;
        await client.keyv.set(cacheKey, expiresAt, TTL);
      }

      return {
        ticketId: ticket.id,
        channelId: channel.id,
        createdAt: ticket.createdAt,
        number,
        url: `https://discord.com/channels/${guildId}/${channel.id}`
      };
    } catch (error) {
      req.log.error(error);
      return res.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to create ticket',
        statusCode: 500,
      });
    }
  },
  onRequest: [fastify.authenticate],
});