// Dashboard routes
const express = require('express');
const router = express.Router();
const isLoggedIn = require('../middleware/isLoggedIn');
const { client } = require('../../bot');
const { Guild } = require('../../database/models');
const fetch = require('node-fetch');
const { clientId } = require('../../../config/config');

// Main dashboard page - display user's servers
router.get('/', isLoggedIn, async (req, res) => {
  try {
    // Fetch guilds directly from Discord API
    const response = await fetch('https://discord.com/api/users/@me/guilds', {
      headers: {
        Authorization: `Bearer ${req.user.accessToken}`
      }
    });
    
    const guildsData = await response.json();
    console.log("Fetched guilds directly:", guildsData.length);
    // Filter user's guilds to only those where they have admin permission
    // and where the bot is present
    const userGuilds = guildsData || [];
    
    const adminGuilds = userGuilds.filter(guild => {
      const permissions = BigInt(guild.permissions);
      return (permissions & BigInt(0x8)) === BigInt(0x8); // Check for ADMINISTRATOR permission
    });
    console.log("Admin guilds:", adminGuilds.length);

    // Get the bot's guilds
    const botGuilds = client.guilds.cache;
    
    // Prepare guilds for display
     // Prepare guilds for display
    const guilds = adminGuilds.map(guild => {
      const botInGuild = client && client.guilds && client.guilds.cache.has(guild.id);
      console.log(`Guild ${guild.name} (${guild.id}): Bot in guild? ${botInGuild}`);
      
      return {
        ...guild,
        botIn: botInGuild,
        inviteUrl: !botInGuild 
          ? `https://discord.com/api/oauth2/authorize?client_id=${client?.user?.id || process.env.CLIENT_ID}&permissions=8&scope=bot%20applications.commands&guild_id=${guild.id}` 
          : null
      };
    });
    
    res.render('dashboard', {
      title: 'Dashboard',
      user: req.user,
      guilds: guilds,
      clientId: client?.user?.id || process.env.CLIENT_ID
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).render('error', { 
      title: 'Error',
      user: req.user,
      error: 'Failed to load dashboard. Please try again later.'
    });
  }
});

router.get('/server/:id', isLoggedIn, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if bot is in the guild
    const guild = client.guilds.cache.get(id);
    if (!guild) {
      return res.redirect('/dashboard?error=Bot%20is%20not%20in%20that%20server');
    }
    
    // Fetch guilds directly from Discord API
    const response = await fetch('https://discord.com/api/users/@me/guilds', {
      headers: {
        Authorization: `Bearer ${req.user.accessToken}`
      }
    });
    
    const userGuilds = await response.json();
    
    // Check if user has access to the guild
    const userGuild = userGuilds.find(g => g.id === id);
    
    if (!userGuild) {
      return res.redirect('/dashboard?error=You%20do%20not%20have%20access%20to%20that%20server');
    }
    
    // Check if user has admin permission in the guild
    const permissions = BigInt(userGuild.permissions);
    if ((permissions & BigInt(0x8)) !== BigInt(0x8)) {
      return res.redirect('/dashboard?error=You%20do%20not%20have%20administrator%20permissions%20in%20that%20server');
    }
    
    // Get or create guild settings
    let guildSettings = await Guild.findOne({ guildId: id });
    
    if (!guildSettings) {
      guildSettings = await Guild.create({
        guildId: id,
        name: guild.name,
        icon: guild.icon,
      });
    }
    
    // Get guild channels for welcome channel selection
    const textChannels = guild.channels.cache
      .filter(channel => channel.type === 0) // 0 is GUILD_TEXT
      .map(channel => ({
        id: channel.id,
        name: channel.name,
      }));
    
    // Get guild roles for auto role selection
    const roles = guild.roles.cache
      .filter(role => role.id !== guild.id && !role.managed) // Exclude @everyone and managed roles
      .sort((a, b) => b.position - a.position) // Sort by position (highest first)
      .map(role => ({
        id: role.id,
        name: role.name,
        color: role.hexColor,
      }));
    
    res.render('server', {
      title: `Server - ${guild.name}`,
      user: req.user,
      guild: {
        id: guild.id,
        name: guild.name,
        icon: guild.icon,
        memberCount: guild.memberCount,
      },
      settings: guildSettings,
      channels: textChannels,
      roles: roles,
      client: client // Pass the client to the template
    });
  } catch (error) {
    console.error('Server management error:', error);
    res.status(500).render('error', { 
      title: 'Error',
      user: req.user,
      error: 'Failed to load server settings. Please try again later.'
    });
  }
});

// Save server settings
router.post('/server/:id/settings', isLoggedIn, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if bot is in the guild
    const guild = client.guilds.cache.get(id);
    if (!guild) {
      return res.status(404).json({ error: 'Bot is not in that server' });
    }
    
    // Check if user has access to the guild and has admin permissions
    const userGuilds = req.user.guilds || [];
    const userGuild = userGuilds.find(g => g.id === id);
    
    if (!userGuild || (BigInt(userGuild.permissions) & BigInt(0x8)) !== BigInt(0x8)) {
      return res.status(403).json({ error: 'You do not have permission to modify this server' });
    }
    
    // Get guild settings
    let guildSettings = await Guild.findOne({ guildId: id });
    
    if (!guildSettings) {
      guildSettings = new Guild({
        guildId: id,
        name: guild.name,
        icon: guild.icon,
      });
    }
    
    // Update settings based on form data
    const { prefix, welcomeEnabled, welcomeChannel, welcomeMessage, autoRoleEnabled, autoRoleId } = req.body;
    
    guildSettings.prefix = prefix || '!';
    guildSettings.settings.welcomeEnabled = welcomeEnabled === 'true';
    guildSettings.settings.welcomeChannel = welcomeChannel || '';
    guildSettings.settings.welcomeMessage = welcomeMessage || 'Welcome {user} to {server}!';
    guildSettings.settings.autoRoleEnabled = autoRoleEnabled === 'true';
    guildSettings.settings.autoRoleId = autoRoleId || '';
    
    // Save settings
    await guildSettings.save();
    
    res.json({ success: true, message: 'Server settings saved successfully' });
  } catch (error) {
    console.error('Save settings error:', error);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

module.exports = router;