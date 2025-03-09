/**
 * Base class for dashboard plugins
 */
class DashboardPlugin {
    /**
     * Create a new DashboardPlugin
     * @param {Object} options - Plugin options
     * @param {string} options.name - The name of the plugin
     * @param {string} options.version - The version of the plugin
     * @param {string} [options.description=''] - The description of the plugin
     * @param {string} [options.author=''] - The author of the plugin
     * @param {string} [options.routePrefix=''] - The route prefix for this plugin
     */
    constructor(options) {
        this.name = options.name;
        this.version = options.version;
        this.description = options.description || '';
        this.author = options.author || '';
        this.routePrefix = options.routePrefix || '';
    }
    
    /**
     * Initialize the plugin
     * @param {Express} app - The Express app instance
     * @param {Object} context - The plugin context
     * @param {Object} context.logger - The logger instance
     * @param {string} context.pluginsDir - The plugins directory path
     * @param {string} context.pluginDir - This plugin's directory path
     * @returns {Promise<void>}
     */
    async initialize(app, context) {
        // This method should be overridden by the plugin
        throw new Error(`Plugin ${this.name} must implement the initialize method`);
    }
    
    /**
     * Shutdown the plugin
     * @param {Express} app - The Express app instance
     * @returns {Promise<void>}
     */
    async shutdown(app) {
        // Optional method, can be overridden by the plugin
    }
    
    /**
     * Register plugin routes with the Express app
     * @param {Express} app - The Express app instance
     * @param {string} routesPath - Path to the routes directory
     * @returns {Promise<void>}
     */
    async registerRoutes(app, routesPath) {
        try {
            const fs = require('fs');
            const path = require('path');
            
            if (!fs.existsSync(routesPath)) {
                return;
            }
            
            const routeFiles = fs.readdirSync(routesPath)
                .filter(file => file.endsWith('.js'));
            
            for (const file of routeFiles) {
                const filePath = path.join(routesPath, file);
                const route = require(filePath);
                
                // If route exports a router, use it
                if (typeof route === 'function' && route.name === 'router') {
                    app.use(this.routePrefix, route);
                }
                // If route exports a registerRoutes function, call it
                else if (typeof route.registerRoutes === 'function') {
                    await route.registerRoutes(app, this.routePrefix);
                }
            }
        } catch (error) {
            console.error(`Error registering routes for plugin ${this.name}:`, error);
        }
    }
    
    /**
     * Register plugin views with the Express app
     * @param {Express} app - The Express app instance
     * @param {string} viewsPath - Path to the views directory
     * @returns {Promise<void>}
     */
    async registerViews(app, viewsPath) {
        try {
            const fs = require('fs');
            
            if (!fs.existsSync(viewsPath)) {
                return;
            }
            
            // Add the plugin's views directory to the view lookup paths
            const existingViews = app.get('views');
            if (Array.isArray(existingViews)) {
                // If already an array, push to it
                if (!existingViews.includes(viewsPath)) {
                    app.set('views', [...existingViews, viewsPath]);
                }
            } else {
                // If not an array, make it an array
                app.set('views', [existingViews, viewsPath]);
            }
        } catch (error) {
            console.error(`Error registering views for plugin ${this.name}:`, error);
        }
    }
    
    /**
     * Register plugin static assets with the Express app
     * @param {Express} app - The Express app instance
     * @param {string} publicPath - Path to the public directory
     * @returns {Promise<void>}
     */
    async registerStatic(app, publicPath) {
        try {
            const fs = require('fs');
            const path = require('path');
            const express = require('express');
            
            if (!fs.existsSync(publicPath)) {
                return;
            }
            
            // Serve static files under the plugin's route prefix
            const staticPrefix = path.join('/static', this.name);
            app.use(staticPrefix, express.static(publicPath));
            
            // Store the static prefix for templates to use
            app.locals.pluginStatic = app.locals.pluginStatic || {};
            app.locals.pluginStatic[this.name] = staticPrefix;
        } catch (error) {
            console.error(`Error registering static assets for plugin ${this.name}:`, error);
        }
    }
}

module.exports = DashboardPlugin;