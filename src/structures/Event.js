/**
 * Base Event class for creating event handlers
 */
class Event {
    /**
     * Create a new Event
     * @param {Object} options - Event options
     * @param {string} options.name - The name of the event (Discord.js event name)
     * @param {boolean} [options.once=false] - Whether the event should only be triggered once
     * @param {Function} options.execute - The function to execute when the event is triggered
     */
    constructor(options) {
        this.name = options.name;
        this.once = options.once || false;
        this.execute = options.execute;
        
        // Plugin name will be set when the event is registered
        this.plugin = null;
    }
}

module.exports = Event;