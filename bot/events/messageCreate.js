// Event handler for when a message is sent
const { Tag } = require('../../database/models');

module.exports = {
  name: 'messageCreate',
  once: false,
  async execute(message) {
    // Ignore bot messages to prevent loops
    if (message.author.bot) return;
    
    // Don't process DMs
    if (!message.guild) return;
    
    try {
      // Fetch all tags for this guild
      const tags = await Tag.findAllByGuild(message.guild.id);
      
      // Skip processing if no tags
      if (!tags || tags.length === 0) return;
      
      const content = message.content.trim();
      
      // Check for matching tags
      for (const tag of tags) {
        let matches = false;
        
        if (tag.isRegex) {
          // For regex tags, test the pattern against the message content
          try {
            const regex = new RegExp(tag.pattern, 'i'); // Case insensitive
            matches = regex.test(content);
          } catch (e) {
            console.error(`[TAG] Invalid regex pattern in tag ${tag.name}:`, e);
            // Continue to next tag
            continue;
          }
        } else {
          // For plain text tags, check if message content includes the pattern
          matches = content.toLowerCase().includes(tag.pattern.toLowerCase());
        }
        
        // If message matches, send the tag response and update usage count
        if (matches) {
          try {
            // Send the response
            await message.channel.send(tag.response);
            
            // Update the usage count
            await tag.incrementUsage();
            console.log(`[TAG] Used tag "${tag.name}" in ${message.guild.name}, new count: ${tag.usageCount}`);
            
            // Only match one tag per message, so break after first match
            break;
          } catch (error) {
            console.error(`[TAG] Error sending tag response for "${tag.name}":`, error);
          }
        }
      }
    } catch (error) {
      console.error('[TAG] Error processing tags for message:', error);
    }
  },
};