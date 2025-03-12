// Main routes for the dashboard
const express = require('express');
const router = express.Router();
const { client } = require('../../bot');
const { pool } = require('../../database');

// Home page
router.get('/', (req, res) => {
  res.render('index', { 
    title: 'Discord Bot Dashboard',
    user: req.user,
    botStats: {
      clientId: client.user?.id,
      servers: client.guilds.cache.size,
      users: client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0),
      uptime: client.uptime,
      ping: client.ws.ping
    }
  });
});

// About page
router.get('/about', (req, res) => {
  res.render('about', { 
    title: 'About',
    user: req.user
  });
});

// Commands list with status
router.get('/commands', async (req, res) => {
  try {
    // Get all commands
    const commands = Array.from(client.commands.values()).map(cmd => ({
      name: cmd.data.name,
      description: cmd.data.description,
      disabled: false // Default to enabled
    }));
    
    // Fetch disabled commands from database
    const [rows] = await pool.query('SELECT commandName FROM global_disabled_commands');
    const disabledCommands = rows.map(row => row.commandName);
    
    // Mark disabled commands
    commands.forEach(cmd => {
      if (disabledCommands.includes(cmd.name)) {
        cmd.disabled = true;
      }
    });
    
    // Sort commands alphabetically
    commands.sort((a, b) => a.name.localeCompare(b.name));
    
    res.render('commands', { 
      title: 'Commands',
      user: req.user,
      commands: commands
    });
  } catch (error) {
    console.error('Error fetching commands:', error);
    res.status(500).render('error', { 
      title: 'Error',
      user: req.user,
      error: 'Failed to load commands. Please try again later.'
    });
  }
});

module.exports = router;