const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('./auth'); // Import the middleware
const db = require('../../database');

// Home page
router.get('/', (req, res) => {
  res.render('index', {
    title: 'Discord Bot Dashboard',
    user: req.user,
    error: req.query.error,
    loggedOut: req.query.loggedOut === 'true'
  });
});

// Dashboard home
router.get('/dashboard', isAuthenticated, (req, res) => {
  // Get mutual guilds (where the bot and user are both present)
  const userGuilds = req.user.guilds || [];
  const botGuilds = req.client.guilds.cache;
  
  // Filter for guilds where the user has MANAGE_SERVER permission (0x20 is the flag for MANAGE_SERVER)
  const mutualGuilds = userGuilds.filter(guild => {
    return (guild.permissions & 0x20) === 0x20 && botGuilds.has(guild.id);
  });
  
  res.render('dashboard', {
    title: 'Dashboard',
    user: req.user,
    mutualGuilds
  });
});

// Guild management page
router.get('/dashboard/:guildId', isAuthenticated, async (req, res, next) => {
  try {
    const { guildId } = req.params;
    
    // Check if the guild exists and the user has access
    const userGuilds = req.user.guilds || [];
    const userGuild = userGuilds.find(g => g.id === guildId && (g.permissions & 0x20) === 0x20);
    
    if (!userGuild) {
      return res.status(403).render('error', {
        title: 'Access Denied',
        message: 'You do not have permission to manage this server',
        error: {}
      });
    }
    
    // Get guild from bot's cache
    const guild = req.client.guilds.cache.get(guildId);
    if (!guild) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'The bot is not in this server',
        error: {}
      });
    }
    
    // Get or create guild settings from database
    const [guildSettings] = await db.models.Guild.findOrCreate({
      where: { id: guildId },
      defaults: { name: guild.name }
    });
    
    // Get channels for welcome message setup
    const textChannels = guild.channels.cache
      .filter(channel => channel.type === 0) // 0 is GUILD_TEXT
      .map(channel => ({
        id: channel.id,
        name: channel.name
      }));
    
    res.render('guild', {
      title: `Manage ${guild.name}`,
      user: req.user,
      guild: {
        ...userGuild,
        icon: guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png` : null,
        memberCount: guild.memberCount
      },
      settings: guildSettings,
      channels: textChannels
    });
  } catch (error) {
    next(error);
  }
});

// Commands list page
router.get('/commands', (req, res) => {
  // Get all commands from the bot
  const commands = Array.from(req.client.commands.values()).map(cmd => ({
    name: cmd.data.name,
    description: cmd.data.description,
    options: cmd.data.options
  }));
  
  res.render('commands', {
    title: 'Bot Commands',
    user: req.user,
    commands
  });
});

module.exports = router;