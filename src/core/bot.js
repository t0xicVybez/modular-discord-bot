const { Client, GatewayIntentBits, Partials } = require('discord.js');
const CommandHandler = require('./command-handler');
const EventHandler = require('./event-handler');
const PluginManager = require('./plugin-manager');
const Logger = require('./logger');
const fs = require('fs');
const path = require('path');

class Bot {
    constructor() {
        // Initialize config
        this.config = require('../../config.json');
        
        // Set up Logger
        this.logger = new Logger();
        
        // Create Discord.js client with necessary intents
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildMessageReactions
            ],
            partials: [
                Partials.Message,
                Partials.Channel,
                Partials.Reaction
            ]
        });
        
        // Initialize handlers
        this.commandHandler = new CommandHandler(this);
        this.eventHandler = new EventHandler(this);
        this.pluginManager = new PluginManager(this);
    }
    
    /**
     * Start the bot
     * @returns {Promise<void>}
     */
    async start() {
        this.logger.info('Starting bot...');
        
        // Register core events
        await this.eventHandler.registerCoreEvents();
        
        // Load plugins
        await this.pluginManager.loadPlugins();
        
        // Login to Discord
        await this.client.login(process.env.DISCORD_TOKEN);
        
        this.logger.info(`Bot started successfully. Logged in as ${this.client.user.tag}`);
    }
    
    /**
     * Shutdown the bot gracefully
     * @returns {Promise<void>}
     */
    async shutdown() {
        this.logger.info('Shutting down bot...');
        
        // Unload plugins
        await this.pluginManager.unloadAllPlugins();
        
        // Destroy client
        if (this.client) {
            this.client.destroy();
        }
        
        this.logger.info('Bot shutdown complete.');
    }
    
    /**
     * Reload all plugins
     * @returns {Promise<void>}
     */
    async reloadPlugins() {
        this.logger.info('Reloading all plugins...');
        await this.pluginManager.unloadAllPlugins();
        await this.pluginManager.loadPlugins();
        this.logger.info('All plugins reloaded successfully.');
    }
}

module.exports = { Bot };