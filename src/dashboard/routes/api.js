// API routes for the dashboard
const express = require('express');
const router = express.Router();
const isLoggedIn = require('../middleware/isLoggedIn');
const { client } = require('../../bot');
const { Guild, User } = require('../../database/models');
const { pool } = require('../../database/index');
const fetch = require('node-fetch');

// Get bot status
router.get('/status', async (req, res) => {
  try {
    const botUser = client.user;
    
    if (!botUser) {
      return res.status(503).json({ 
        error: 'Bot not fully initialized yet',
        status: 'initializing'
      });
    }
    
    // Gather stats
    const stats = {
      username: botUser.username,
      discriminator: botUser.discriminator,
      avatar: botUser.displayAvatarURL({ dynamic: true }),
      status: client.ws.status,
      ping: client.ws.ping,
      uptime: client.uptime,
      guilds: client.guilds.cache.size,
      users: client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0),
    };
    
    res.json(stats);
  } catch (error) {
    console.error('API status error:', error);
    res.status(500).json({ error: 'Failed to fetch bot status' });
  }
});

// Get user's guilds
router.get('/guilds', isLoggedIn, async (req, res) => {
  try {
    const userGuilds = req.user.guilds || [];
    const botGuilds = client.guilds.cache;
    
    // Process guilds for display
    const guilds = userGuilds.map(guild => {
      const permissions = BigInt(guild.permissions);
      const hasAdmin = (permissions & BigInt(0x8)) === BigInt(0x8);
      
      return {
        id: guild.id,
        name: guild.name,
        icon: guild.icon,
        owner: guild.owner,
        hasAdmin: hasAdmin,
        botIn: botGuilds.has(guild.id),
      };
    });
    
    res.json(guilds);
  } catch (error) {
    console.error('API guilds error:', error);
    res.status(500).json({ error: 'Failed to fetch guilds' });
  }
});

// Get command usage statistics
router.get('/stats/commands', isLoggedIn, async (req, res) => {
  try {
    // Query top used commands from database
    const [mostUsedRows] = await pool.query(`
      SELECT commandName, COUNT(*) as count
      FROM command_usage
      GROUP BY commandName
      ORDER BY count DESC
      LIMIT 10
    `);
    
    // Query most recent command usages
    const [recentRows] = await pool.query(`
      SELECT commandName, usedAt as time
      FROM command_usage
      ORDER BY usedAt DESC
      LIMIT 10
    `);
    
    // If no data yet, return mock data
    const commandStats = {
      mostUsed: mostUsedRows.length > 0 ? mostUsedRows : [
        { name: 'ping', count: 150 },
        { name: 'help', count: 120 },
        { name: 'play', count: 90 },
      ],
      recent: recentRows.length > 0 ? recentRows : [
        { name: 'ping', time: new Date() },
        { name: 'help', time: new Date(Date.now() - 60000) },
        { name: 'play', time: new Date(Date.now() - 120000) },
      ],
    };
    
    res.json(commandStats);
  } catch (error) {
    console.error('API command stats error:', error);
    res.status(500).json({ error: 'Failed to fetch command statistics' });
  }
});

// Get guild settings
router.get('/guild/:id/settings', isLoggedIn, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check user permissions
    const userGuilds = req.user.guilds || [];
    const userGuild = userGuilds.find(g => g.id === id);
    
    if (!userGuild) {
      return res.status(403).json({ error: 'You do not have access to this server' });
    }
    
    // Check if bot is in the guild
    const botGuild = client.guilds.cache.get(id);
    if (!botGuild) {
      return res.status(404).json({ error: 'Bot is not in this server' });
    }
    
    // Get guild settings
    const guildSettings = await Guild.findOne({ guildId: id });
    
    if (!guildSettings) {
      return res.status(404).json({ error: 'Guild settings not found' });
    }
    
    res.json(guildSettings);
  } catch (error) {
    console.error('API guild settings error:', error);
    res.status(500).json({ error: 'Failed to fetch guild settings' });
  }
});

// NEW: Save global command settings (enable/disable)
router.post('/settings/commands', isLoggedIn, async (req, res) => {
  try {
    // Check if user is admin
    const userGuilds = req.user.guilds || [];
    const hasAdminAnywhere = userGuilds.some(guild => {
      const permissions = BigInt(guild.permissions);
      return (permissions & BigInt(0x8)) === BigInt(0x8);
    });

    if (!hasAdminAnywhere) {
      return res.status(403).json({ error: 'You need to be a server admin to manage command settings' });
    }
    
    const { disabledCommands = [] } = req.body;
    
    // Validate all commands exist
    const availableCommands = Array.from(client.commands.keys());
    const invalidCommands = disabledCommands.filter(cmd => !availableCommands.includes(cmd));
    
    if (invalidCommands.length > 0) {
      return res.status(400).json({ 
        error: `Invalid commands: ${invalidCommands.join(', ')}` 
      });
    }
    
    // Store settings in database - we'll create a new table for this
    await pool.query('DELETE FROM global_disabled_commands');
    
    if (disabledCommands.length > 0) {
      // Create query with multiple value sets
      const placeholders = disabledCommands.map(() => '(?)').join(',');
      const query = `INSERT INTO global_disabled_commands (commandName) VALUES ${placeholders}`;
      
      await pool.query(query, disabledCommands);
    }
    
    res.json({ 
      success: true, 
      message: 'Command settings saved successfully',
      disabledCommands
    });
  } catch (error) {
    console.error('API command settings error:', error);
    res.status(500).json({ error: 'Failed to save command settings' });
  }
});

// Get global command settings
router.get('/settings/commands', async (req, res) => {
  try {
    // Fetch disabled commands from database
    const [rows] = await pool.query('SELECT commandName FROM global_disabled_commands');
    const disabledCommands = rows.map(row => row.commandName);
    
    res.json({ disabledCommands });
  } catch (error) {
    console.error('API get command settings error:', error);
    res.status(500).json({ error: 'Failed to fetch command settings' });
  }
});

module.exports = router;