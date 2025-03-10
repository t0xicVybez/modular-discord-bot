// Utility functions for the bot
const { EmbedBuilder } = require('discord.js');

/**
 * Creates a standardized embed with common styling
 * @param {Object} options - Options for the embed
 * @returns {EmbedBuilder} The created embed
 */
function createEmbed(options = {}) {
  const {
    title = '',
    description = '',
    color = '#5865F2', // Discord Blurple
    thumbnail = null,
    image = null,
    author = null,
    footer = null,
    fields = [],
    timestamp = false,
  } = options;

  const embed = new EmbedBuilder()
    .setColor(color);
  
  if (title) embed.setTitle(title);
  if (description) embed.setDescription(description);
  if (thumbnail) embed.setThumbnail(thumbnail);
  if (image) embed.setImage(image);
  if (timestamp) embed.setTimestamp();
  
  if (author) {
    embed.setAuthor({
      name: author.name,
      iconURL: author.iconURL || null,
      url: author.url || null,
    });
  }
  
  if (footer) {
    embed.setFooter({
      text: footer.text,
      iconURL: footer.iconURL || null,
    });
  }
  
  if (fields.length > 0) {
    embed.addFields(fields);
  }
  
  return embed;
}

/**
 * Formats milliseconds into a human-readable time string
 * @param {number} ms - Time in milliseconds
 * @returns {string} Formatted time string
 */
function formatTime(ms) {
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));

  const parts = [];
  if (days > 0) parts.push(`${days} day${days === 1 ? '' : 's'}`);
  if (hours > 0) parts.push(`${hours} hour${hours === 1 ? '' : 's'}`);
  if (minutes > 0) parts.push(`${minutes} minute${minutes === 1 ? '' : 's'}`);
  if (seconds > 0) parts.push(`${seconds} second${seconds === 1 ? '' : 's'}`);

  return parts.join(', ');
}

module.exports = {
  createEmbed,
  formatTime,
};