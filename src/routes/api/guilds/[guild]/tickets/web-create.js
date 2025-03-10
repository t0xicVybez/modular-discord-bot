module.exports.post = fastify => ({
  handler: async (req, res) => {
    /** @type {import('client')} */
    const client = req.routeOptions.config.client;
    const guildId = req.params.guild;
    const { categoryId, topic } = req.body;
    const userId = req.user.id; // From the session

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
      let member;
      try {
        member = await guild.members.fetch(userId);
      } catch (error) {
        return res.code(404).send({
          error: 'Not Found',
          message: 'You are not a member of this Discord server',
          statusCode: 404,
        });
      }
      
      // Check member limit
      const memberCount = await client.tickets.getMemberCount(categoryId, userId);
      if (memberCount >= category.memberLimit) {
        return res.code(429).send({
          error: 'Too Many Requests',
          message: 'You have reached the ticket limit for this category',
          statusCode: 429,
        });
      }

      // Check cooldown
      const cooldown = await client.tickets.getCooldown(categoryId, userId);
      if (cooldown) {
        return res.code(429).send({
          error: 'Too Many Requests',
          message: 'You are on cooldown for this category',
          statusCode: 429,
          cooldownExpiresAt: cooldown,
        });
      }

      // Check if category has required roles
      if (category.requiredRoles.length > 0) {
        const hasRequiredRole = category.requiredRoles.some(roleId => 
          member.roles.cache.has(roleId)
        );
        
        if (!hasRequiredRole) {
          return res.code(403).send({
            error: 'Forbidden',
            message: 'You do not have the required roles to create a ticket in this category',
            statusCode: 403,
          });
        }
      }

      // Check if user is blocked
      if (category.guild.blocklist.length > 0) {
        const isBlocked = category.guild.blocklist.some(roleId => 
          member.roles.cache.has(roleId)
        );
        
        if (isBlocked) {
          return res.code(403).send({
            error: 'Forbidden',
            message: 'You are blocked from creating tickets',
            statusCode: 403,
          });
        }
      }

      // Check if Discord category is full (50 channels)
      const discordCategory = guild.channels.cache.get(category.discordCategory);
      if (discordCategory.children.cache.size >= 50) {
        return res.code(507).send({
          error: 'Insufficient Storage',
          message: 'The category is full (max 50 channels)',
          statusCode: 507,
        });
      }

      // Check total limit for the category
      const totalCount = await client.tickets.getTotalCount(categoryId);
      if (totalCount >= category.totalLimit) {
        return res.code(507).send({
          error: 'Insufficient Storage',
          message: 'The category has reached its total ticket limit',
          statusCode: 507,
        });
      }

      // Create the ticket
      const ticketData = {
        categoryId,
        topic,
        webCreator: {
          id: userId,
          member,
          user: member.user
        }
      };

      const ticket = await client.tickets.createFromWeb(ticketData);

      return {
        ticketId: ticket.id,
        channelId: ticket.channelId,
        createdAt: ticket.createdAt,
        number: ticket.number,
        url: `https://discord.com/channels/${guildId}/${ticket.channelId}`
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