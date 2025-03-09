const logger = require('../utils/logger');
const db = require('../../database');

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    try {
      // Log successful bot login
      logger.info(`Logged in as ${client.user.tag}!`);
      
      // Set bot status
      client.user.setActivity('/help', { type: 'LISTENING' });
      
      // Make sure database is initialized
      await db.init();
      
      // Log guild information
      const guildCount = client.guilds.cache.size;
      logger.info(`Bot is in ${guildCount} guild(s)`);
      
      // Sync guilds with database
      for (const guild of client.guilds.cache.values()) {
        // Check if guild exists in DB and create if not
        const [guildData, created] = await db.models.Guild.findOrCreate({
          where: { id: guild.id },
          defaults: {
            name: guild.name
          }
        });
        
        // If guild exists but name has changed, update the name
        if (!created && guildData.name !== guild.name) {
          guildData.name = guild.name;
          await guildData.save();
        }
        
        logger.debug(`Guild synced: ${guild.name} (${guild.id})`);
      }
      
      logger.info('Bot is ready!');
    } catch (error) {
      logger.error('Error during bot initialization:', error);
    }
  }
};