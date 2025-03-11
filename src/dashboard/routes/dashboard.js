// Dashboard routes
const express = require('express');
const router = express.Router();
const isLoggedIn = require('../middleware/isLoggedIn');
const { client } = require('../../bot');
const { Guild, User } = require('../../database/models');
const fetch = require('node-fetch');
const { clientId } = require('../../../config/config');

// Add a simple delay function for rate limiting
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Main dashboard page - display user's servers
router.get('/', isLoggedIn, async (req, res) => {
  try {
    // Fetch guilds directly from Discord API
    const response = await fetch('https://discord.com/api/users/@me/guilds', {
      headers: {
        Authorization: `Bearer ${req.user.accessToken}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Discord API error: ${response.status} ${response.statusText}`);
    }
    
    const guildsData = await response.json();
    console.log("Fetched guilds directly:", guildsData.length);
    
    // Update user with the fetched guilds for future use
    if (guildsData && guildsData.length > 0) {
      const user = await User.findOne({ discordId: req.user.discordId });
      if (user) {
        user.guilds = guildsData;
        await user.save();
        console.log("Updated user with fetched guilds");
      }
    }
    
    // Filter user's guilds to only those where they have admin permission
    const userGuilds = guildsData || [];
    
    const adminGuilds = userGuilds.filter(guild => {
      const permissions = BigInt(guild.permissions);
      return (permissions & BigInt(0x8)) === BigInt(0x8); // Check for ADMINISTRATOR permission
    });
    console.log("Admin guilds:", adminGuilds.length);

    // Get the bot's guilds
    const botGuilds = client.guilds.cache;
    
    // Prepare guilds for display
    const guilds = adminGuilds.map(guild => {
      const botInGuild = client && client.guilds && client.guilds.cache.has(guild.id);
      console.log(`Guild ${guild.name} (${guild.id}): Bot in guild? ${botInGuild}`);
      
      return {
        ...guild,
        botIn: botInGuild,
        inviteUrl: !botInGuild 
          ? `https://discord.com/api/oauth2/authorize?client_id=${client?.user?.id || clientId}&permissions=8&scope=bot%20applications.commands&guild_id=${guild.id}` 
          : null
      };
    });
    
    res.render('dashboard', {
      title: 'Dashboard',
      user: req.user,
      guilds: guilds,
      clientId: client?.user?.id || clientId
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
    
    // Fetch guilds directly from Discord API with rate limit handling
    let response;
    let retries = 3;
    
    while (retries > 0) {
      response = await fetch('https://discord.com/api/users/@me/guilds', {
        headers: {
          Authorization: `Bearer ${req.user.accessToken}`
        }
      });
      
      if (response.status === 429) {
        console.log('Rate limited, waiting before retry...');
        await delay(1000); // Wait 1 second before retry
        retries--;
      } else {
        break;
      }
    }
    
    if (!response.ok) {
      throw new Error(`Discord API error: ${response.status} ${response.statusText}`);
    }
    
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
        // Initialize settings explicitly
        settings: {
          welcomeEnabled: false,
          welcomeChannel: '',
          welcomeMessage: 'Welcome {user} to {server}!',
          autoRoleEnabled: false,
          autoRoleId: '',
          disabledCommands: [],
          permissions: new Map()
        }
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
    
    console.log('Loading server settings:', {
      prefix: guildSettings.prefix,
      welcomeEnabled: guildSettings.settings.welcomeEnabled,
      welcomeChannel: guildSettings.settings.welcomeChannel,
      autoRoleEnabled: guildSettings.settings.autoRoleEnabled,
      autoRoleId: guildSettings.settings.autoRoleId
    });
    
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
      client: client, // Pass the client to the template
      basedir: req.app.get('views')
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
    
    // Fetch fresh permissions data directly from Discord API with rate limit handling
    let freshGuilds;
    let fetchSuccess = false;
    let retries = 3;
    
    while (retries > 0 && !fetchSuccess) {
      try {
        const response = await fetch('https://discord.com/api/users/@me/guilds', {
          headers: {
            Authorization: `Bearer ${req.user.accessToken}`
          }
        });
        
        if (response.status === 429) {
          console.log('Rate limited, waiting before retry...');
          await delay(1000 * (4 - retries)); // Increase wait time with each retry
          retries--;
          continue;
        }
        
        if (!response.ok) {
          console.error('Failed to fetch guilds from Discord API:', response.status, response.statusText);
          return res.status(500).json({ error: 'Failed to verify permissions' });
        }
        
        freshGuilds = await response.json();
        fetchSuccess = true;
      } catch (error) {
        console.error('Error fetching guilds:', error);
        retries--;
        if (retries > 0) {
          await delay(1000);
        }
      }
    }
    
    if (!fetchSuccess) {
      // If API request fails, try to use cached guild data
      console.log('Falling back to cached guild data');
      const user = await User.findOne({ discordId: req.user.discordId });
      freshGuilds = user?.guilds || [];
      
      if (!freshGuilds.length) {
        return res.status(500).json({ error: 'Failed to verify permissions' });
      }
    }
    
    const userGuild = freshGuilds.find(g => g.id === id);
    
    console.log('User guild permissions for server settings:', userGuild ? {
      id: userGuild.id,
      name: userGuild.name,
      permissions: userGuild.permissions
    } : 'Not found');
    
    if (!userGuild) {
      return res.status(403).json({ error: 'You do not have access to this server' });
    }
    
    // Check admin permissions
    const permissions = BigInt(userGuild.permissions);
    if ((permissions & BigInt(0x8)) !== BigInt(0x8)) {
      return res.status(403).json({ error: 'You do not have administrator permissions in this server' });
    }
    
    // Get guild settings
    let guildSettings = await Guild.findOne({ guildId: id });
    
    if (!guildSettings) {
      guildSettings = await Guild.create({
        guildId: id,
        name: guild.name,
        icon: guild.icon,
        settings: {
          welcomeEnabled: false,
          welcomeChannel: '',
          welcomeMessage: 'Welcome {user} to {server}!',
          autoRoleEnabled: false,
          autoRoleId: '',
          disabledCommands: [],
          permissions: new Map()
        }
      });
    }

    // Log the current settings before update
    console.log('Current settings before update:', {
      prefix: guildSettings.prefix,
      welcomeEnabled: guildSettings.settings.welcomeEnabled,
      welcomeChannel: guildSettings.settings.welcomeChannel,
      autoRoleEnabled: guildSettings.settings.autoRoleEnabled,
      autoRoleId: guildSettings.settings.autoRoleId
    });
    
    // Debug request body
    console.log('Request body:', req.body);

    // Handle checkboxes specifically (they might not be included in the request body when unchecked)
    const welcomeEnabled = req.body.hasOwnProperty('welcomeEnabled') ? 
      (req.body.welcomeEnabled === 'true' || req.body.welcomeEnabled === true) : false;
      
    const autoRoleEnabled = req.body.hasOwnProperty('autoRoleEnabled') ? 
      (req.body.autoRoleEnabled === 'true' || req.body.autoRoleEnabled === true) : false;

    // Get other form values
    const { prefix, welcomeChannel, welcomeMessage, autoRoleId } = req.body;
    
    // Update settings
    guildSettings.prefix = prefix || '!';
    guildSettings.settings.welcomeEnabled = welcomeEnabled;
    guildSettings.settings.welcomeChannel = welcomeChannel || '';
    guildSettings.settings.welcomeMessage = welcomeMessage || 'Welcome {user} to {server}!';
    guildSettings.settings.autoRoleEnabled = autoRoleEnabled;
    guildSettings.settings.autoRoleId = autoRoleId || '';
    
    // Log the settings after update
    console.log('Settings after update:', {
      prefix: guildSettings.prefix,
      welcomeEnabled: guildSettings.settings.welcomeEnabled,
      welcomeChannel: guildSettings.settings.welcomeChannel,
      autoRoleEnabled: guildSettings.settings.autoRoleEnabled,
      autoRoleId: guildSettings.settings.autoRoleId
    });
    
    // Save settings
    await guildSettings.save();
    
    res.json({ success: true, message: 'Server settings saved successfully' });
  } catch (error) {
    console.error('Save settings error:', error);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

module.exports = router;