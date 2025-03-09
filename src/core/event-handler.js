const fs = require('fs');
const path = require('path');
const { Collection } = require('discord.js');

/**
 * Handles Discord.js events registration and execution
 */
class EventHandler {
    /**
     * Create a new EventHandler
     * @param {Bot} bot - The bot instance
     */
    constructor(bot) {
        this.bot = bot;
        this.events = new Collection();
    }
    
    /**
     * Register core event handlers
     * @returns {Promise<void>}
     */
    async registerCoreEvents() {
        const eventsPath = path.join(process.cwd(), 'src', 'events');
        const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
        
        for (const file of eventFiles) {
            const filePath = path.join(eventsPath, file);
            const event = require(filePath);
            
            // Register the event
            this.registerEvent(event, 'core');
        }
    }
    
    /**
     * Register an event handler
     * @param {Event} event - The event to register
     * @param {string} pluginName - The name of the plugin that owns this event
     * @returns {boolean} - Whether the event was registered successfully
     */
    registerEvent(event, pluginName) {
        // Validate event
        if (!event.name || !event.execute) {
            this.bot.logger.error(`Invalid event from plugin ${pluginName}: missing required properties`);
            return false;
        }
        
        // Add plugin name to event for tracking
        event.plugin = pluginName;
        
        // Store event in collection
        if (!this.events.has(event.name)) {
            this.events.set(event.name, []);
        }
        
        const handlers = this.events.get(event.name);
        handlers.push(event);
        
        // Register event listener if this is the first handler for this event
        if (handlers.length === 1) {
            this.bot.client[event.once ? 'once' : 'on'](event.name, (...args) => this.handleEvent(event.name, ...args));
            this.bot.logger.debug(`Registered primary listener for event "${event.name}" from plugin "${pluginName}"`);
        } else {
            this.bot.logger.debug(`Added handler for event "${event.name}" from plugin "${pluginName}"`);
        }
        
        return true;
    }
    
    /**
     * Handle a Discord.js event
     * @param {string} eventName - The name of the event
     * @param {...any} args - The event arguments
     * @returns {Promise<void>}
     */
    async handleEvent(eventName, ...args) {
        const handlers = this.events.get(eventName);
        
        if (!handlers || handlers.length === 0) {
            return;
        }
        
        // Execute all handlers for this event
        for (const handler of handlers) {
            try {
                await handler.execute(...args, this.bot);
            } catch (error) {
                this.bot.logger.error(`Error in event handler "${eventName}" from plugin "${handler.plugin}"`);
                this.bot.logger.error(error);
            }
        }
    }
    
    /**
     * Unregister all events from a specific plugin
     * @param {string} pluginName - The name of the plugin
     * @returns {number} - Number of event handlers unregistered
     */
    unregisterPluginEvents(pluginName) {
        let count = 0;
        
        // Remove event handlers
        for (const [eventName, handlers] of this.events.entries()) {
            const originalLength = handlers.length;
            
            // Filter out handlers from this plugin
            const filteredHandlers = handlers.filter(handler => handler.plugin !== pluginName);
            this.events.set(eventName, filteredHandlers);
            
            count += originalLength - filteredHandlers.length;
            
            // If all handlers were removed, remove the event listener
            if (originalLength > 0 && filteredHandlers.length === 0) {
                // Unfortunately, Discord.js doesn't provide a way to remove specific listeners,
                // so we'll rely on our collection to filter handlers
                this.bot.logger.debug(`All handlers for event "${eventName}" were removed`);
            }
        }
        
        return count;
    }
}

module.exports = EventHandler;