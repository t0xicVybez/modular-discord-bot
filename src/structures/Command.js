/**
 * Base Command class for creating commands
 */
class Command {
    /**
     * Create a new Command
     * @param {Object} options - Command options
     * @param {string} options.name - The name of the command
     * @param {string} options.description - The description of the command
     * @param {string[]} [options.aliases=[]] - Command aliases
     * @param {boolean} [options.guildOnly=false] - Whether the command can only be used in guilds
     * @param {boolean} [options.ownerOnly=false] - Whether the command can only be used by the bot owner
     * @param {number} [options.cooldown=3] - Command cooldown in seconds
     * @param {string[]} [options.permissions=[]] - Permissions required to use the command
     * @param {Object} [options.slashCommand=null] - Slash command data
     * @param {Function} options.execute - The function to execute when the command is run
     * @param {Function} [options.executeInteraction=null] - The function to execute when the slash command is used
     */
    constructor(options) {
        this.name = options.name;
        this.description = options.description;
        this.aliases = options.aliases || [];
        this.guildOnly = options.guildOnly || false;
        this.ownerOnly = options.ownerOnly || false;
        this.cooldown = options.cooldown || 3;
        this.permissions = options.permissions || [];
        this.slashCommand = options.slashCommand || null;
        this.execute = options.execute;
        this.executeInteraction = options.executeInteraction || null;
        
        // Plugin name will be set when the command is registered
        this.plugin = null;
    }
}

module.exports = Command;