// Tag management routes
const express = require('express');
const router = express.Router();
const isLoggedIn = require('../middleware/isLoggedIn');
const { client } = require('../../bot');
const { Tag } = require('../../database/models');
const fetch = require('node-fetch');

// Get tags for a server
router.get('/:id', isLoggedIn, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if bot is in the guild
    const guild = client.guilds.cache.get(id);
    if (!guild) {
      return res.redirect('/dashboard?error=Bot%20is%20not%20in%20that%20server');
    }
    
    // Verify user has permission to access this guild
    const userGuilds = req.user.guilds || [];
    const userGuild = userGuilds.find(g => g.id === id);
    
    if (!userGuild) {
      return res.redirect('/dashboard?error=You%20do%20not%20have%20access%20to%20that%20server');
    }
    
    // Check if user has admin permission in the guild
    const permissions = BigInt(userGuild.permissions);
    if ((permissions & BigInt(0x8)) !== BigInt(0x8)) {
      return res.redirect('/dashboard?error=You%20do%20not%20have%20administrator%20permissions%20in%20that%20server');
    }
    
    // Get all tags for this guild
    const tags = await Tag.findAllByGuild(id);
    
    res.render('tags', {
      title: `Tags - ${guild.name}`,
      user: req.user,
      guild: {
        id: guild.id,
        name: guild.name,
        icon: guild.icon,
      },
      tags: tags
    });
  } catch (error) {
    console.error('Tags page error:', error);
    res.status(500).render('error', { 
      title: 'Error',
      user: req.user,
      error: 'Failed to load tags. Please try again later.'
    });
  }
});

// Create a new tag
router.post('/:id/create', isLoggedIn, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if bot is in the guild
    const guild = client.guilds.cache.get(id);
    if (!guild) {
      return res.status(404).json({ error: 'Bot is not in that server' });
    }
    
    // Verify user has permission to modify this guild
    const userGuilds = req.user.guilds || [];
    const userGuild = userGuilds.find(g => g.id === id);
    
    if (!userGuild) {
      return res.status(403).json({ error: 'You do not have access to this server' });
    }
    
    // Check if user has admin permission in the guild
    const permissions = BigInt(userGuild.permissions);
    if ((permissions & BigInt(0x8)) !== BigInt(0x8)) {
      return res.status(403).json({ error: 'You do not have administrator permissions in this server' });
    }
    
    // Validate the tag data
    const { name, pattern, response, isRegex } = req.body;
    
    if (!name || !pattern || !response) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    // Test if pattern is a valid regex if isRegex is true
    if (isRegex) {
      try {
        new RegExp(pattern);
      } catch (e) {
        return res.status(400).json({ error: 'Invalid regex pattern' });
      }
    }
    
    // Check if a tag with this name already exists
    const existingTag = await Tag.findByName(id, name);
    if (existingTag) {
      return res.status(400).json({ error: 'A tag with this name already exists' });
    }
    
    // Create the tag
    const tag = await Tag.create({
      guildId: id,
      name,
      pattern,
      response,
      createdBy: req.user.discordId,
      isRegex: isRegex === 'on' || isRegex === true
    });
    
    res.json({ success: true, tag });
  } catch (error) {
    console.error('Create tag error:', error);
    res.status(500).json({ error: 'Failed to create tag' });
  }
});

// Update an existing tag
router.put('/:id/update/:tagId', isLoggedIn, async (req, res) => {
  try {
    const { id, tagId } = req.params;
    
    // Check if bot is in the guild
    const guild = client.guilds.cache.get(id);
    if (!guild) {
      return res.status(404).json({ error: 'Bot is not in that server' });
    }
    
    // Verify user has permission to modify this guild
    const userGuilds = req.user.guilds || [];
    const userGuild = userGuilds.find(g => g.id === id);
    
    if (!userGuild) {
      return res.status(403).json({ error: 'You do not have access to this server' });
    }
    
    // Check if user has admin permission in the guild
    const permissions = BigInt(userGuild.permissions);
    if ((permissions & BigInt(0x8)) !== BigInt(0x8)) {
      return res.status(403).json({ error: 'You do not have administrator permissions in this server' });
    }
    
    // Find the tag
    const tag = await Tag.findById(tagId);
    if (!tag) {
      return res.status(404).json({ error: 'Tag not found' });
    }
    
    // Verify tag belongs to this guild
    if (tag.guildId !== id) {
      return res.status(403).json({ error: 'Tag does not belong to this server' });
    }
    
    // Validate the tag data
    const { name, pattern, response, isRegex } = req.body;
    
    if (!name || !pattern || !response) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    // Test if pattern is a valid regex if isRegex is true
    if (isRegex) {
      try {
        new RegExp(pattern);
      } catch (e) {
        return res.status(400).json({ error: 'Invalid regex pattern' });
      }
    }
    
    // Check if a tag with this name already exists (exclude current tag)
    if (name !== tag.name) {
      const existingTag = await Tag.findByName(id, name);
      if (existingTag) {
        return res.status(400).json({ error: 'A tag with this name already exists' });
      }
    }
    
    // Update the tag
    tag.name = name;
    tag.pattern = pattern;
    tag.response = response;
    tag.isRegex = isRegex === 'on' || isRegex === true;
    
    await tag.save();
    
    res.json({ success: true, tag });
  } catch (error) {
    console.error('Update tag error:', error);
    res.status(500).json({ error: 'Failed to update tag' });
  }
});

// Delete a tag
router.delete('/:id/delete/:tagId', isLoggedIn, async (req, res) => {
  try {
    const { id, tagId } = req.params;
    
    // Check if bot is in the guild
    const guild = client.guilds.cache.get(id);
    if (!guild) {
      return res.status(404).json({ error: 'Bot is not in that server' });
    }
    
    // Verify user has permission to modify this guild
    const userGuilds = req.user.guilds || [];
    const userGuild = userGuilds.find(g => g.id === id);
    
    if (!userGuild) {
      return res.status(403).json({ error: 'You do not have access to this server' });
    }
    
    // Check if user has admin permission in the guild
    const permissions = BigInt(userGuild.permissions);
    if ((permissions & BigInt(0x8)) !== BigInt(0x8)) {
      return res.status(403).json({ error: 'You do not have administrator permissions in this server' });
    }
    
    // Find the tag
    const tag = await Tag.findById(tagId);
    if (!tag) {
      return res.status(404).json({ error: 'Tag not found' });
    }
    
    // Verify tag belongs to this guild
    if (tag.guildId !== id) {
      return res.status(403).json({ error: 'Tag does not belong to this server' });
    }
    
    // Delete the tag
    await Tag.delete(tagId);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Delete tag error:', error);
    res.status(500).json({ error: 'Failed to delete tag' });
  }
});

module.exports = router;