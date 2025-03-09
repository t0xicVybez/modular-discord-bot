const fs = require('fs');
const path = require('path');
const Plugin = require('../../src/structures/Plugin');

// Create the plugin instance
module.exports = new Plugin({
    name: 'admin',
    version: '1.0.0',
    description: 'Administrative commands for server management',
    author: 'Bot Developer'
});

/**
 * Initialize the plugin
 * @param {Bot} bot - The bot instance
 * @returns {Promise<void>}
 */
module.exports.initialize = async (bot) => {
    // Register commands
    const commandsPath = path.join(__dirname, 'commands');
    
    // Create commands directory if it doesn't exist
    if (!fs.existsSync(commandsPath)) {
        fs.mkdirSync(commandsPath, { recursive: true });
    }
    
    const commandFiles = fs.readdirSync(commandsPath)
        .filter(file => file.endsWith('.js'));
    
    for (const file of commandFiles) {
        const command = require(path.join(commandsPath, file));
        bot.commandHandler.registerCommand(command, module.exports.name);
    }
    
    // Register events
    const eventsPath = path.join(__dirname, 'events');
    
    // Create events directory if it doesn't exist
    if (!fs.existsSync(eventsPath)) {
        fs.mkdirSync(eventsPath, { recursive: true });
    }
    
    const eventFiles = fs.readdirSync(eventsPath)
        .filter(file => file.endsWith('.js'));
    
    for (const file of eventFiles) {
        const event = require(path.join(eventsPath, file));
        bot.eventHandler.registerEvent(event, module.exports.name);
    }
    
    bot.logger.info(`Plugin ${module.exports.name} v${module.exports.version} initialized`);
};

/**
 * Shutdown the plugin
 * @param {Bot} bot - The bot instance
 * @returns {Promise<void>}
 */
module.exports.shutdown = async (bot) => {
    bot.logger.info(`Plugin ${module.exports.name} shut down`);
};

/**
 * Handle button interactions from this plugin
 * @param {ButtonInteraction} interaction - The button interaction
 * @param {string} actionName - The action name from the custom ID
 * @param {string} data - Additional data from the custom ID
 * @param {Bot} bot - The bot instance
 * @returns {Promise<void>}
 */
module.exports.handleButton = async (interaction, actionName, data, bot) => {
    if (actionName === 'confirm_ban') {
        // Example of handling a button interaction to confirm a ban
        const userId = data;
        try {
            const user = await bot.client.users.fetch(userId);
            await interaction.guild.members.ban(user, { reason: 'Confirmed ban via button' });
            await interaction.update({ 
                content: `User ${user.tag} has been banned.`, 
                components: [] 
            });
        } catch (error) {
            bot.logger.error('Error banning user:', error);
            await interaction.update({ 
                content: 'Failed to ban user. They may have already left the server.',
                components: []
            });
        }
    }
};