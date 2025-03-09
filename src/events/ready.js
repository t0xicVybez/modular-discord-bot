const Event = require('../structures/Event');
const db = require('../utils/database');

module.exports = new Event({
    name: 'ready',
    once: true,
    async execute(bot) {
        const { client, logger } = bot;
        
        logger.info(`Ready! Logged in as ${client.user.tag}`);
        
        // Initialize database
        try {
            await db.init();
            logger.info('Database initialized successfully');
        } catch (error) {
            logger.error('Error initializing database:');
            logger.error(error);
        }
        
        // Set presence
        try {
            await client.user.setPresence({
                activities: [{ 
                    name: bot.config.activity || 'commands',
                    type: bot.config.activityType || 0
                }],
                status: bot.config.status || 'online'
            });
            
            logger.info('Bot presence set successfully');
        } catch (error) {
            logger.error('Error setting bot presence:');
            logger.error(error);
        }
        
        // Register slash commands with Discord API
        try {
            await bot.commandHandler.registerSlashCommands();
            logger.info('Slash commands registered successfully');
        } catch (error) {
            logger.error('Error registering slash commands:');
            logger.error(error);
        }
        
        // Log some stats
        logger.info(`Bot is now serving ${client.guilds.cache.size} servers`);
        logger.info(`Loaded ${bot.commandHandler.commands.size} commands`);
        logger.info(`Loaded ${bot.pluginManager.plugins.size} plugins`);
    }
});