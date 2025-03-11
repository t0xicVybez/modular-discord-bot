// Dashboard routes
const express = require('express');
const router = express.Router();
const isLoggedIn = require('../middleware/isLoggedIn');
const { client } = require('../../bot');
const { Guild, User } = require('../../database/models');
const fetch = require('node-fetch');

// Get client ID from environment
const clientId = process.env.DISCORD_CLIENT_ID || '1333299729332699196';

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
    
    // Verify user permissions (authentication check)
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
      welcomeMessage: guildSettings.settings.welcomeMessage,
      autoRoleEnabled: guildSettings.settings.autoRoleEnabled,
      autoRoleId: guildSettings.settings.autoRoleId,
      disabledCommands: guildSettings.settings.disabledCommands || []
    });
    
    // Debug request body
    console.log('Request body:', req.body);

    // Detect which form was submitted based on form data
    // Look for form-specific identifiers in the request
    const hasWelcomeSettings = 'welcomeMessage' in req.body || 'welcomeChannel' in req.body || 'welcomeEnabled' in req.body;
    const hasAutoRoleSettings = 'autoRoleId' in req.body || 'autoRoleEnabled' in req.body;
    const hasPrefixSetting = 'prefix' in req.body;
    
    // If none of the above are found, assume it's the commands form
    const isCommandsForm = !hasWelcomeSettings && !hasAutoRoleSettings && !hasPrefixSetting;
    
    // Determine form type for logging
    let formType = 'unknown';
    if (hasWelcomeSettings) formType = 'welcome';
    else if (hasAutoRoleSettings) formType = 'autoRole';
    else if (hasPrefixSetting) formType = 'general';
    else if (isCommandsForm) formType = 'commands';
    
    console.log('Form type detected:', formType);
    
    // Update only the settings related to the submitted form
    if (hasWelcomeSettings) {
      // Welcome settings form
      guildSettings.settings.welcomeEnabled = req.body.welcomeEnabled === 'on';
      guildSettings.settings.welcomeChannel = req.body.welcomeChannel || '';
      guildSettings.settings.welcomeMessage = req.body.welcomeMessage || 'Welcome {user} to {server}!';
    } 
    else if (hasAutoRoleSettings) {
      // Auto role settings form
      guildSettings.settings.autoRoleEnabled = req.body.autoRoleEnabled === 'on';
      guildSettings.settings.autoRoleId = req.body.autoRoleId || '';
    } 
    else if (isCommandsForm) {
      // Commands form - important change: if form is commands but no disabledCommands in request,
      // it means all commands are enabled (no checkboxes checked)
      let disabledCommands = [];
      
      if (req.body.disabledCommands) {
        // If disabledCommands exists in request, use it
        disabledCommands = Array.isArray(req.body.disabledCommands) 
          ? req.body.disabledCommands 
          : [req.body.disabledCommands];
      }
      
      console.log('Updating disabled commands to:', disabledCommands);
      guildSettings.settings.disabledCommands = disabledCommands;
    }
    else if (hasPrefixSetting) {
      // General settings form
      guildSettings.prefix = req.body.prefix || '!';
    }
    
    // Log the settings after update
    console.log('Settings after update (will be saved):', {
      prefix: guildSettings.prefix,
      welcomeEnabled: guildSettings.settings.welcomeEnabled,
      welcomeChannel: guildSettings.settings.welcomeChannel,
      welcomeMessage: guildSettings.settings.welcomeMessage,
      autoRoleEnabled: guildSettings.settings.autoRoleEnabled,
      autoRoleId: guildSettings.settings.autoRoleId,
      disabledCommands: guildSettings.settings.disabledCommands || []
    });
    
    // Save settings
    console.log('Guild save method called with settings:', JSON.stringify(guildSettings.settings));
    await guildSettings.save();
    console.log('Guild settings saved successfully to database');
    
    // Verify settings were saved (for debugging)
    const verifySettings = await Guild.findOne({ guildId: id });
    console.log('Settings after save (from DB):', {
      prefix: verifySettings.prefix,
      welcomeEnabled: verifySettings.settings.welcomeEnabled,
      welcomeChannel: verifySettings.settings.welcomeChannel,
      welcomeMessage: verifySettings.settings.welcomeMessage,
      autoRoleEnabled: verifySettings.settings.autoRoleEnabled,
      autoRoleId: verifySettings.settings.autoRoleId,
      disabledCommands: verifySettings.settings.disabledCommands || []
    });
    
    res.json({ success: true, message: 'Server settings saved successfully' });
  } catch (error) {
    console.error('Save settings error:', error);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

module.exports = router;