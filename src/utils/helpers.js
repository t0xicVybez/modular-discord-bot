/**
 * General helper functions
 */
class Helpers {
    /**
     * Format a duration in milliseconds to a readable string
     * @param {number} ms - The duration in milliseconds
     * @returns {string} - The formatted duration string
     */
    static formatDuration(ms) {
        if (!ms || isNaN(ms)) return '0 seconds';
        
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        const secondsLeft = seconds % 60;
        const minutesLeft = minutes % 60;
        const hoursLeft = hours % 24;
        
        const parts = [];
        
        if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
        if (hoursLeft > 0) parts.push(`${hoursLeft} hour${hoursLeft !== 1 ? 's' : ''}`);
        if (minutesLeft > 0) parts.push(`${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''}`);
        if (secondsLeft > 0) parts.push(`${secondsLeft} second${secondsLeft !== 1 ? 's' : ''}`);
        
        return parts.join(', ');
    }
    
    /**
     * Format a date to a readable string
     * @param {Date|number|string} date - The date to format
     * @returns {string} - The formatted date string
     */
    static formatDate(date) {
        const d = new Date(date);
        return d.toLocaleString();
    }
    
    /**
     * Truncate a string to a maximum length
     * @param {string} str - The string to truncate
     * @param {number} maxLength - The maximum length
     * @returns {string} - The truncated string
     */
    static truncate(str, maxLength = 100) {
        if (!str) return '';
        if (str.length <= maxLength) return str;
        return str.substring(0, maxLength - 3) + '...';
    }
    
    /**
     * Generate a random integer between min and max (inclusive)
     * @param {number} min - The minimum value
     * @param {number} max - The maximum value
     * @returns {number} - A random integer
     */
    static getRandomInt(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    
    /**
     * Chunk an array into smaller arrays
     * @param {Array} array - The array to chunk
     * @param {number} size - The size of each chunk
     * @returns {Array} - Array of chunks
     */
    static chunkArray(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }
    
    /**
     * Parse command arguments with support for quoted arguments
     * @param {string} argsString - The raw arguments string
     * @returns {string[]} - Array of parsed arguments
     */
    static parseArgs(argsString) {
        if (!argsString) return [];
        
        const args = [];
        let current = '';
        let inQuotes = false;
        let quoteChar = '';
        
        for (let i = 0; i < argsString.length; i++) {
            const char = argsString[i];
            
            if ((char === '"' || char === "'") && (i === 0 || argsString[i - 1] !== '\\')) {
                if (!inQuotes) {
                    inQuotes = true;
                    quoteChar = char;
                } else if (char === quoteChar) {
                    inQuotes = false;
                    quoteChar = '';
                } else {
                    current += char;
                }
            } else if (char === ' ' && !inQuotes) {
                if (current) {
                    args.push(current);
                    current = '';
                }
            } else {
                current += char;
            }
        }
        
        if (current) {
            args.push(current);
        }
        
        return args;
    }
    
    /**
     * Clean text for code blocks
     * @param {string} text - The text to clean
     * @returns {string} - The cleaned text
     */
    static cleanCodeBlockText(text) {
        return text
            .replace(/```/g, '`\u200b`\u200b`')
            .replace(/\\`/g, '`');
    }
    
    /**
     * Get a user from mention or ID
     * @param {Client} client - Discord.js client
     * @param {string} mention - The user mention or ID
     * @returns {Promise<User|null>} - The user or null if not found
     */
    static async getUserFromMention(client, mention) {
        if (!mention) return null;
        
        // Extract the ID from a mention
        const matches = mention.match(/^<@!?(\d+)>$/);
        
        // Try to get the user by the extracted ID or by the raw ID
        const id = matches ? matches[1] : mention;
        
        try {
            return await client.users.fetch(id);
        } catch (error) {
            return null;
        }
    }
    
    /**
     * Get a member from mention or ID
     * @param {Guild} guild - Discord.js guild
     * @param {string} mention - The member mention or ID
     * @returns {Promise<GuildMember|null>} - The member or null if not found
     */
    static async getMemberFromMention(guild, mention) {
        if (!mention || !guild) return null;
        
        // Extract the ID from a mention
        const matches = mention.match(/^<@!?(\d+)>$/);
        
        // Try to get the member by the extracted ID or by the raw ID
        const id = matches ? matches[1] : mention;
        
        try {
            return await guild.members.fetch(id);
        } catch (error) {
            return null;
        }
    }
    
    /**
     * Get a channel from mention or ID
     * @param {Guild} guild - Discord.js guild
     * @param {string} mention - The channel mention or ID
     * @returns {Channel|null} - The channel or null if not found
     */
    static getChannelFromMention(guild, mention) {
        if (!mention || !guild) return null;
        
        // Extract the ID from a mention
        const matches = mention.match(/^<#(\d+)>$/);
        
        // Try to get the channel by the extracted ID or by the raw ID
        const id = matches ? matches[1] : mention;
        
        return guild.channels.cache.get(id);
    }
    
    /**
     * Get a role from mention or ID
     * @param {Guild} guild - Discord.js guild
     * @param {string} mention - The role mention or ID
     * @returns {Role|null} - The role or null if not found
     */
    static getRoleFromMention(guild, mention) {
        if (!mention || !guild) return null;
        
        // Extract the ID from a mention
        const matches = mention.match(/^<@&(\d+)>$/);
        
        // Try to get the role by the extracted ID or by the raw ID
        const id = matches ? matches[1] : mention;
        
        return guild.roles.cache.get(id);
    }
    
    /**
     * Generate paginated embeds
     * @param {Array} items - The items to paginate
     * @param {number} itemsPerPage - Number of items per page
     * @param {Function} embedGenerator - Function to generate an embed for a page
     * @returns {Array} - Array of embeds
     */
    static generatePaginatedEmbeds(items, itemsPerPage, embedGenerator) {
        const pages = this.chunkArray(items, itemsPerPage);
        return pages.map((page, index) => embedGenerator(page, index, pages.length));
    }
}

module.exports = Helpers;