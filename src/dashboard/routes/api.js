const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('./auth');
const db = require('../../database');
const logger = require('../../bot/utils/logger');

// JSON response middleware
router.use(express.json());

// Authentication middleware for API routes
const apiAuth = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  
  res.status(401).json({
    error: 'Unauthorized',
    message: 'You must be logged in to access this endpoint'
  });
};

// API route to update guild settings
router.post('/guilds/:guildId/settings', apiAuth, async (req, res) => {
  try {
    const { guildId } = req.params;
    const { prefix, welcomeChannelId, welcomeMessage } = req.body;
    
    // Verify user has permission to manage this guild
    const userGuilds = req.user.guilds || [];
    const userGuild = userGuilds.find(g => g.id === guildId && (g.permissions & 0x20) === 0x20);
    
    if (!userGuild) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to manage this server'
      });
    }
    
    // Get guild settings from database
    const guildSettings = await db.models.Guild.findByPk(guildId);
    if (!guildSettings) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Guild not found in database'
      });
    }
    
    // Update settings
    guildSettings.prefix = prefix;
    guildSettings.welcomeChannelId = welcomeChannelId;
    guildSettings.welcomeMessage = welcomeMessage;
    
    await guildSettings.save();
    
    logger.info(`Updated settings for guild ${guildId} by user ${req.user.username}#${req.user.discriminator}`);
    
    res.json({
      success: true,
      message: 'Guild settings updated successfully',
      settings: guildSettings
    });
  } catch (error) {
    logger.error('Error updating guild settings:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred while updating guild settings'
    });
  }
});

// API route to get bot stats
router.get('/stats', async (req, res) => {
  try {
    const client = req.client;
    
    const stats = {
      guilds: client.guilds.cache.size,
      users: client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0),
      channels: client.channels.cache.size,
      uptime: client.uptime,
      ping: client.ws.ping,
      commandCount: client.commands.size
    };
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    logger.error('Error fetching bot stats:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred while fetching bot stats'
    });
  }
});

module.exports = router;