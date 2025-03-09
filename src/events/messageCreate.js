const Event = require('../structures/Event');
const db = require('../utils/database');
const PermissionsUtil = require('../utils/permissions');
const Helpers = require('../utils/helpers');
const { Collection } = require('discord.js');

module.exports = new Event({
    name: 'messageCreate',
    async execute(message, bot) {
        // Ignore messages from bots and webhooks
        if (message.author.bot || message.webhookId) return;
        
        // Handle DMs differently if needed
        if (!message.guild) {
            return handleDirectMessage(message, bot);
        }
        
        // Get guild settings from database
        let settings;
        try {
            settings = await db.getGuildSettings(message.guild.id);
        } catch (error) {
            bot.logger.error(`Error getting guild settings for ${message.guild.id}`);
            bot.logger.error(error);
            settings = { prefix: bot.config.defaultPrefix || '!' };
        }
        
        const prefix = settings.prefix;
        
        // Check if message starts with the prefix
        if (!message.content.startsWith(prefix)) return;
        
        // Parse the command name and arguments
        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();
        
        // Find the command
        const command = bot.commandHandler.commands.get(commandName) || 
                        bot.commandHandler.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));
        
        if (!command) return;
        
        // Check if command is guild-only
        if (command.guildOnly && !message.guild) {
            return message.reply('This command can only be used in a server.');
        }
        
        // Check if command is owner-only
        if (command.ownerOnly && !PermissionsUtil.isOwner(message.author.id)) {
            return message.reply('This command can only be used by the bot owner.');
        }
        
        // Check if user has required permissions
        if (command.permissions && command.permissions.length > 0) {
            if (!PermissionsUtil.checkPermissions(message.member, command.permissions)) {
                const missingPermissions = PermissionsUtil.getMissingPermissions(message.member, command.permissions);
                return message.reply(
                    `You don't have permission to use this command. Missing: ${missingPermissions.join(', ')}`
                );
            }
        }
        
        // Execute the command
        try {
            await bot.commandHandler.executeCommand(commandName, message, args);
        } catch (error) {
            bot.logger.error(`Error executing command ${commandName}`);
            bot.logger.error(error);
            message.reply('There was an error trying to execute that command!');
        }
    }
});

/**
 * Handle direct messages to the bot
 * @param {Message} message - The direct message
 * @param {Bot} bot - The bot instance
 * @returns {Promise<void>}
 */
async function handleDirectMessage(message, bot) {
    // Get the default prefix
    const prefix = bot.config.defaultPrefix || '!';
    
    // Check if message starts with the prefix
    if (!message.content.startsWith(prefix)) return;
    
    // Parse the command name and arguments
    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();
    
    // Find the command
    const command = bot.commandHandler.commands.get(commandName) || 
                    bot.commandHandler.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));
    
    if (!command) return;
    
    // Check if command can be used in DMs
    if (command.guildOnly) {
        return message.reply('This command can only be used in a server.');
    }
    
    // Check if command is owner-only
    if (command.ownerOnly && !PermissionsUtil.isOwner(message.author.id)) {
        return message.reply('This command can only be used by the bot owner.');
    }
    
    // Execute the command
    try {
        await bot.commandHandler.executeCommand(commandName, message, args);
    } catch (error) {
        bot.logger.error(`Error executing DM command ${commandName}`);
        bot.logger.error(error);
        message.reply('There was an error trying to execute that command!');
    }
}