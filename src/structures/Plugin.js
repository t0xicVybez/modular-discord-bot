/**
 * Base Plugin class for creating plugins
 */
class Plugin {
    /**
     * Create a new Plugin
     * @param {Object} options - Plugin options
     * @param {string} options.name - The name of the plugin
     * @param {string} options.version - The version of the plugin
     * @param {string} [options.description=''] - The description of the plugin
     * @param {string} [options.author=''] - The author of the plugin
     */
    constructor(options) {
        this.name = options.name;
        this.version = options.version;
        this.description = options.description || '';
        this.author = options.author || '';
    }
    
    /**
     * Initialize the plugin
     * @param {Bot} bot - The bot instance
     * @returns {Promise<void>}
     */
    async initialize(bot) {
        // This method should be overridden by the plugin
        throw new Error(`Plugin ${this.name} must implement the initialize method`);
    }
    
    /**
     * Shutdown the plugin
     * @param {Bot} bot - The bot instance
     * @returns {Promise<void>}
     */
    async shutdown(bot) {
        // Optional method, can be overridden by the plugin
    }
}

module.exports = Plugin;