// Main routes for the dashboard
const express = require('express');
const router = express.Router();
const { client } = require('../../bot');

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

// Commands list
router.get('/commands', (req, res) => {
  const commands = Array.from(client.commands.values()).map(cmd => ({
    name: cmd.data.name,
    description: cmd.data.description
  }));
  
  res.render('commands', { 
    title: 'Commands',
    user: req.user,
    commands: commands
  });
});

module.exports = router;