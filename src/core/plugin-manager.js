const fs = require('fs');
const path = require('path');
const { Collection } = require('discord.js');

/**
 * Manages bot plugins
 */
class PluginManager {
    /**
     * Create a new PluginManager
     * @param {Bot} bot - The bot instance
     */
    constructor(bot) {
        this.bot = bot;
        this.plugins = new Collection();
        this.pluginsDir = path.join(process.cwd(), 'plugins');
    }
    
    /**
     * Load all plugins from the plugins directory
     * @returns {Promise<void>}
     */
    async loadPlugins() {
        if (!fs.existsSync(this.pluginsDir)) {
            this.bot.logger.warn('Plugins directory does not exist. Creating it...');
            fs.mkdirSync(this.pluginsDir, { recursive: true });
            return;
        }
        
        const pluginFolders = fs.readdirSync(this.pluginsDir, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);
        
        this.bot.logger.info(`Found ${pluginFolders.length} potential plugins to load`);
        
        for (const folder of pluginFolders) {
            await this.loadPlugin(folder);
        }
        
        this.bot.logger.info(`Successfully loaded ${this.plugins.size} plugins`);
        
        // Register slash commands with Discord API
        if (this.bot.client.isReady()) {
            await this.bot.commandHandler.registerSlashCommands();
        }
    }
    
    /**
     * Load a single plugin
     * @param {string} pluginName - The name of the plugin to load
     * @returns {Promise<boolean>} - Whether the plugin was loaded successfully
     */
    async loadPlugin(pluginName) {
        const pluginPath = path.join(this.pluginsDir, pluginName);
        const pluginFile = path.join(pluginPath, 'index.js');
        
        if (!fs.existsSync(pluginFile)) {
            this.bot.logger.warn(`Plugin ${pluginName} does not have an index.js file`);
            return false;
        }
        
        try {
            // Clear require cache to ensure we get the latest version
            delete require.cache[require.resolve(pluginFile)];
            
            // Load the plugin
            const plugin = require(pluginFile);
            
            // Validate plugin
            if (!plugin.name || !plugin.version || typeof plugin.initialize !== 'function') {
                this.bot.logger.error(`Invalid plugin ${pluginName}: missing required properties`);
                return false;
            }
            
            // Check if plugin is already loaded
            if (this.plugins.has(plugin.name)) {
                this.bot.logger.warn(`Plugin ${plugin.name} is already loaded. Unloading first...`);
                await this.unloadPlugin(plugin.name);
            }
            
            // Initialize the plugin
            this.bot.logger.info(`Loading plugin: ${plugin.name} v${plugin.version}`);
            await plugin.initialize(this.bot);
            
            // Store the plugin
            this.plugins.set(plugin.name, {
                ...plugin,
                path: pluginPath
            });
            
            this.bot.logger.info(`Plugin ${plugin.name} loaded successfully`);
            return true;
        } catch (error) {
            this.bot.logger.error(`Error loading plugin ${pluginName}:`);
            this.bot.logger.error(error);
            return false;
        }
    }
    
    /**
     * Unload a plugin by name
     * @param {string} pluginName - The name of the plugin to unload
     * @returns {Promise<boolean>} - Whether the plugin was unloaded successfully
     */
    async unloadPlugin(pluginName) {
        const plugin = this.plugins.get(pluginName);
        
        if (!plugin) {
            this.bot.logger.warn(`Cannot unload plugin ${pluginName}: plugin not found`);
            return false;
        }
        
        try {
            this.bot.logger.info(`Unloading plugin: ${plugin.name}`);
            
            // Call shutdown method if it exists
            if (typeof plugin.shutdown === 'function') {
                await plugin.shutdown(this.bot);
            }
            
            // Unregister commands and events
            const commandsRemoved = this.bot.commandHandler.unregisterPluginCommands(plugin.name);
            const eventsRemoved = this.bot.eventHandler.unregisterPluginEvents(plugin.name);
            
            this.bot.logger.debug(`Removed ${commandsRemoved} commands and ${eventsRemoved} event handlers from plugin ${plugin.name}`);
            
            // Remove from plugins collection
            this.plugins.delete(plugin.name);
            
            // Clear require cache
            const pluginPath = path.join(plugin.path, 'index.js');
            delete require.cache[require.resolve(pluginPath)];
            
            this.bot.logger.info(`Plugin ${plugin.name} unloaded successfully`);
            return true;
        } catch (error) {
            this.bot.logger.error(`Error unloading plugin ${pluginName}:`);
            this.bot.logger.error(error);
            return false;
        }
    }
    
    /**
     * Unload all plugins
     * @returns {Promise<void>}
     */
    async unloadAllPlugins() {
        this.bot.logger.info(`Unloading all plugins (${this.plugins.size})...`);
        
        for (const [pluginName] of this.plugins) {
            await this.unloadPlugin(pluginName);
        }
        
        this.bot.logger.info('All plugins unloaded');
    }
    
    /**
     * Reload a plugin by name
     * @param {string} pluginName - The name of the plugin to reload
     * @returns {Promise<boolean>} - Whether the plugin was reloaded successfully
     */
    async reloadPlugin(pluginName) {
        this.bot.logger.info(`Reloading plugin: ${pluginName}`);
        
        const success = await this.unloadPlugin(pluginName);
        if (!success) {
            return false;
        }
        
        return await this.loadPlugin(pluginName);
    }
    
    /**
     * Get information about all loaded plugins
     * @returns {Object[]} - Array of plugin information objects
     */
    getPluginsInfo() {
        const plugins = [];
        
        for (const [, plugin] of this.plugins) {
            plugins.push({
                name: plugin.name,
                version: plugin.version,
                description: plugin.description || 'No description provided',
                author: plugin.author || 'Unknown',
                path: plugin.path
            });
        }
        
        return plugins;
    }
}

module.exports = PluginManager;