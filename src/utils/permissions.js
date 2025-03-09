const { PermissionsBitField } = require('discord.js');

/**
 * Utility for checking user permissions
 */
class PermissionsUtil {
    /**
     * Check if a user has the required permissions
     * @param {GuildMember} member - The guild member
     * @param {Array<string>} permissions - Array of permission flags
     * @returns {boolean} - Whether the user has all permissions
     */
    static checkPermissions(member, permissions = []) {
        if (!permissions || permissions.length === 0) return true;
        if (!member) return false;
        
        // Bot owners bypass permission checks
        if (this.isOwner(member.user.id)) return true;
        
        // Server owners bypass permission checks
        if (member.guild.ownerId === member.id) return true;
        
        return member.permissions.has(permissions);
    }
    
    /**
     * Check if a user is a bot owner
     * @param {string} userId - The user ID to check
     * @returns {boolean} - Whether the user is a bot owner
     */
    static isOwner(userId) {
        try {
            const config = require('../../config.json');
            return config.ownerIds && config.ownerIds.includes(userId);
        } catch (error) {
            console.error('Error checking owner status:', error);
            return false;
        }
    }
    
    /**
     * Get missing permissions
     * @param {GuildMember} member - The guild member
     * @param {Array<string>} permissions - Array of permission flags
     * @returns {Array<string>} - Array of missing permission names
     */
    static getMissingPermissions(member, permissions = []) {
        if (!permissions || permissions.length === 0) return [];
        if (!member) return permissions;
        
        // Bot owners bypass permission checks
        if (this.isOwner(member.user.id)) return [];
        
        // Server owners bypass permission checks
        if (member.guild.ownerId === member.id) return [];
        
        const missingPermissions = [];
        
        for (const permission of permissions) {
            if (!member.permissions.has(permission)) {
                missingPermissions.push(this.getReadableName(permission));
            }
        }
        
        return missingPermissions;
    }
    
    /**
     * Get a human-readable name for a permission flag
     * @param {string} permission - The permission flag
     * @returns {string} - The readable permission name
     */
    static getReadableName(permission) {
        // Convert permission flag to a more readable format
        // Example: 'MANAGE_MESSAGES' -> 'Manage Messages'
        return permission
            .replace(/_/g, ' ')
            .toLowerCase()
            .replace(/\b(\w)/g, char => char.toUpperCase());
    }
    
    /**
     * Check if the bot has required permissions in a channel
     * @param {TextChannel|VoiceChannel} channel - The channel to check
     * @param {Array<string>} permissions - Array of permission flags
     * @returns {boolean} - Whether the bot has all permissions
     */
    static botHasPermissions(channel, permissions = []) {
        if (!permissions || permissions.length === 0) return true;
        if (!channel) return false;
        
        const me = channel.guild.members.me;
        if (!me) return false;
        
        return channel.permissionsFor(me).has(permissions);
    }
    
    /**
     * Get missing bot permissions in a channel
     * @param {TextChannel|VoiceChannel} channel - The channel to check
     * @param {Array<string>} permissions - Array of permission flags
     * @returns {Array<string>} - Array of missing permission names
     */
    static getMissingBotPermissions(channel, permissions = []) {
        if (!permissions || permissions.length === 0) return [];
        if (!channel) return permissions;
        
        const me = channel.guild.members.me;
        if (!me) return permissions;
        
        const missingPermissions = [];
        const botPermissions = channel.permissionsFor(me);
        
        for (const permission of permissions) {
            if (!botPermissions.has(permission)) {
                missingPermissions.push(this.getReadableName(permission));
            }
        }
        
        return missingPermissions;
    }
}

module.exports = PermissionsUtil;