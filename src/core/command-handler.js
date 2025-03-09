const { Collection } = require('discord.js');
const path = require('path');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');

/**
 * Handles registration and execution of commands
 */
class CommandHandler {
    /**
     * Create a new CommandHandler
     * @param {Bot} bot - The bot instance
     */
    constructor(bot) {
        this.bot = bot;
        this.commands = new Collection();
        this.slashCommands = new Collection();
        this.cooldowns = new Collection();
        this.rest = new REST({ version: '9' }).setToken(process.env.DISCORD_TOKEN);
    }
    
    /**
     * Register a command
     * @param {Command} command - The command to register
     * @param {string} pluginName - The name of the plugin that owns this command
     * @returns {boolean} - Whether the command was registered successfully
     */
    registerCommand(command, pluginName) {
        // Validate command
        if (!command.name || !command.execute) {
            this.bot.logger.error(`Invalid command from plugin ${pluginName}: missing required properties`);
            return false;
        }
        
        // Add plugin name to command for tracking
        command.plugin = pluginName;
        
        // Register the command
        const commandName = command.name.toLowerCase();
        
        // Check for conflicts
        if (this.commands.has(commandName)) {
            const existing = this.commands.get(commandName);
            this.bot.logger.warn(`Command conflict: "${commandName}" from plugin "${pluginName}" ` +
                `conflicts with existing command from plugin "${existing.plugin}"`);
            return false;
        }
        
        // Store the command
        this.commands.set(commandName, command);
        
        // If it's a slash command, add it to slash commands collection
        if (command.slashCommand) {
            this.slashCommands.set(commandName, command);
        }
        
        this.bot.logger.debug(`Registered command "${commandName}" from plugin "${pluginName}"`);
        return true;
    }
    
    /**
     * Unregister all commands from a specific plugin
     * @param {string} pluginName - The name of the plugin
     * @returns {number} - Number of commands unregistered
     */
    unregisterPluginCommands(pluginName) {
        let count = 0;
        
        // Remove traditional commands
        for (const [name, command] of this.commands.entries()) {
            if (command.plugin === pluginName) {
                this.commands.delete(name);
                count++;
            }
        }
        
        // Remove slash commands
        for (const [name, command] of this.slashCommands.entries()) {
            if (command.plugin === pluginName) {
                this.slashCommands.delete(name);
                // We don't increment count here since we already counted it above
            }
        }
        
        return count;
    }
    
    /**
     * Register all slash commands with Discord API
     * @returns {Promise<void>}
     */
    async registerSlashCommands() {
        if (this.slashCommands.size === 0) {
            return;
        }
        
        try {
            this.bot.logger.info(`Registering ${this.slashCommands.size} slash commands with Discord API...`);
            
            const slashCommandsData = [...this.slashCommands.values()].map(cmd => cmd.slashCommand.toJSON());
            
            if (this.bot.config.devMode) {
                // In development mode, register commands to dev guild only
                const devGuildId = this.bot.config.devGuildId;
                if (!devGuildId) {
                    this.bot.logger.error('Dev mode is enabled but no devGuildId is specified in config');
                    return;
                }
                
                await this.rest.put(
                    Routes.applicationGuildCommands(this.bot.client.user.id, devGuildId),
                    { body: slashCommandsData }
                );
                
                this.bot.logger.info(`Registered slash commands to development guild: ${devGuildId}`);
            } else {
                // In production mode, register commands globally
                await this.rest.put(
                    Routes.applicationCommands(this.bot.client.user.id),
                    { body: slashCommandsData }
                );
                
                this.bot.logger.info('Registered slash commands globally');
            }
        } catch (error) {
            this.bot.logger.error('Error registering slash commands:');
            this.bot.logger.error(error);
        }
    }
    
    /**
     * Execute a command by name
     * @param {string} commandName - The name of the command to execute
     * @param {Message} message - The message that triggered the command
     * @param {string[]} args - The command arguments
     * @returns {Promise<any>} - The result of the command execution
     */
    async executeCommand(commandName, message, args) {
        const command = this.commands.get(commandName);
        
        if (!command) {
            return null;
        }
        
        // Check cooldowns
        if (command.cooldown) {
            const now = Date.now();
            if (!this.cooldowns.has(command.name)) {
                this.cooldowns.set(command.name, new Collection());
            }
            
            const timestamps = this.cooldowns.get(command.name);
            const cooldownAmount = (command.cooldown || 3) * 1000;
            
            if (timestamps.has(message.author.id)) {
                const expirationTime = timestamps.get(message.author.id) + cooldownAmount;
                
                if (now < expirationTime) {
                    const timeLeft = (expirationTime - now) / 1000;
                    message.reply(`Please wait ${timeLeft.toFixed(1)} more second(s) before reusing the \`${command.name}\` command.`);
                    return;
                }
            }
            
            timestamps.set(message.author.id, now);
            setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);
        }
        
        // Execute the command
        try {
            this.bot.logger.debug(`Executing command "${commandName}" from plugin "${command.plugin}"`);
            return await command.execute(message, args, this.bot);
        } catch (error) {
            this.bot.logger.error(`Error executing command "${commandName}" from plugin "${command.plugin}"`);
            this.bot.logger.error(error);
            message.reply('There was an error trying to execute that command!');
        }
    }
    
    /**
     * Handle slash command interactions
     * @param {Interaction} interaction - The interaction object
     * @returns {Promise<void>}
     */
    async handleInteraction(interaction) {
        if (!interaction.isCommand()) return;
        
        const command = this.slashCommands.get(interaction.commandName);
        
        if (!command) {
            this.bot.logger.warn(`Received interaction for unknown command: ${interaction.commandName}`);
            return;
        }
        
        try {
            this.bot.logger.debug(`Executing slash command "${interaction.commandName}" from plugin "${command.plugin}"`);
            await command.executeInteraction(interaction, this.bot);
        } catch (error) {
            this.bot.logger.error(`Error executing slash command "${interaction.commandName}" from plugin "${command.plugin}"`);
            this.bot.logger.error(error);
            
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ 
                    content: 'There was an error while executing this command!',
                    ephemeral: true 
                });
            } else {
                await interaction.reply({ 
                    content: 'There was an error while executing this command!', 
                    ephemeral: true 
                });
            }
        }
    }
}

module.exports = CommandHandler;