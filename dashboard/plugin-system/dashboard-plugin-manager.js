const fs = require('fs');
const path = require('path');
const { Collection } = require('discord.js');

/**
 * Manages dashboard plugins
 */
class DashboardPluginManager {
    /**
     * Create a new DashboardPluginManager
     * @param {Express} app - The Express app instance
     * @param {Object} logger - The logger instance
     */
    constructor(app, logger) {
        this.app = app;
        this.logger = logger;
        this.plugins = new Collection();
        this.pluginsDir = path.join(process.cwd(), '..', 'dashboard-plugins');
    }
    
    /**
     * Load all plugins from the dashboard-plugins directory
     * @returns {Promise<void>}
     */
    async loadPlugins() {
        if (!fs.existsSync(this.pluginsDir)) {
            this.logger.warn('Dashboard plugins directory does not exist. Creating it...');
            fs.mkdirSync(this.pluginsDir, { recursive: true });
            return;
        }
        
        const pluginFolders = fs.readdirSync(this.pluginsDir, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);
        
        this.logger.info(`Found ${pluginFolders.length} potential dashboard plugins to load`);
        
        for (const folder of pluginFolders) {
            await this.loadPlugin(folder);
        }
        
        this.logger.info(`Successfully loaded ${this.plugins.size} dashboard plugins`);
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
            this.logger.warn(`Dashboard plugin ${pluginName} does not have an index.js file`);
            return false;
        }
        
        try {
            // Clear require cache to ensure we get the latest version
            delete require.cache[require.resolve(pluginFile)];
            
            // Load the plugin
            const plugin = require(pluginFile);
            
            // Validate plugin
            if (!plugin.name || !plugin.version || typeof plugin.initialize !== 'function') {
                this.logger.error(`Invalid dashboard plugin ${pluginName}: missing required properties`);
                return false;
            }
            
            // Check if plugin is already loaded
            if (this.plugins.has(plugin.name)) {
                this.logger.warn(`Dashboard plugin ${plugin.name} is already loaded. Unloading first...`);
                await this.unloadPlugin(plugin.name);
            }
            
            // Initialize the plugin
            this.logger.info(`Loading dashboard plugin: ${plugin.name} v${plugin.version}`);
            await plugin.initialize(this.app, {
                logger: this.logger,
                pluginsDir: this.pluginsDir,
                pluginDir: pluginPath
            });
            
            // Store the plugin
            this.plugins.set(plugin.name, {
                ...plugin,
                path: pluginPath
            });
            
            this.logger.info(`Dashboard plugin ${plugin.name} loaded successfully`);
            return true;
        } catch (error) {
            this.logger.error(`Error loading dashboard plugin ${pluginName}:`);
            this.logger.error(error);
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
            this.logger.warn(`Cannot unload dashboard plugin ${pluginName}: plugin not found`);
            return false;
        }
        
        try {
            this.logger.info(`Unloading dashboard plugin: ${plugin.name}`);
            
            // Call shutdown method if it exists
            if (typeof plugin.shutdown === 'function') {
                await plugin.shutdown(this.app);
            }
            
            // Remove from plugins collection
            this.plugins.delete(plugin.name);
            
            // Clear require cache
            const pluginPath = path.join(plugin.path, 'index.js');
            delete require.cache[require.resolve(pluginPath)];
            
            // Clean up plugin routes if possible
            // This is not entirely reliable because Express doesn't provide a clean way to remove routes
            if (plugin.routePrefix && this.app._router && this.app._router.stack) {
                const routeRegex = new RegExp(`^${plugin.routePrefix}`);
                this.app._router.stack = this.app._router.stack.filter(layer => {
                    if (layer.route && layer.route.path) {
                        return !routeRegex.test(layer.route.path);
                    }
                    return true;
                });
            }
            
            this.logger.info(`Dashboard plugin ${plugin.name} unloaded successfully`);
            return true;
        } catch (error) {
            this.logger.error(`Error unloading dashboard plugin ${pluginName}:`);
            this.logger.error(error);
            return false;
        }
    }
    
    /**
     * Unload all plugins
     * @returns {Promise<void>}
     */
    async unloadAllPlugins() {
        this.logger.info(`Unloading all dashboard plugins (${this.plugins.size})...`);
        
        for (const [pluginName] of this.plugins) {
            await this.unloadPlugin(pluginName);
        }
        
        this.logger.info('All dashboard plugins unloaded');
    }
    
    /**
     * Reload a plugin by name
     * @param {string} pluginName - The name of the plugin to reload
     * @returns {Promise<boolean>} - Whether the plugin was reloaded successfully
     */
    async reloadPlugin(pluginName) {
        this.logger.info(`Reloading dashboard plugin: ${pluginName}`);
        
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
                routePrefix: plugin.routePrefix || null,
                path: plugin.path
            });
        }
        
        return plugins;
    }
}

module.exports = DashboardPluginManager;