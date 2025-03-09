const express = require('express');
const router = express.Router();
const { isAuthenticated, hasGuildPermission } = require('../config/middleware');
const database = require('../config/database');

/**
 * @route GET /api/user
 * @desc Get current user data
 */
router.get('/user', isAuthenticated, (req, res) => {
    // Remove sensitive information
    const { accessToken, refreshToken, ...user } = req.user;
    
    res.json({
        success: true,
        user
    });
});

/**
 * @route GET /api/guilds
 * @desc Get user's guilds
 */
router.get('/guilds', isAuthenticated, (req, res) => {
    const userGuilds = req.user.guilds || [];
    
    // Filter guilds where user has MANAGE_GUILD permission or is owner
    const managedGuilds = userGuilds.filter(guild => {
        const permissions = BigInt(guild.permissions);
        const hasManageGuild = (permissions & BigInt(0x20)) === BigInt(0x20); // MANAGE_GUILD permission
        const isAdmin = (permissions & BigInt(0x8)) === BigInt(0x8); // ADMINISTRATOR permission
        return guild.owner || isAdmin || hasManageGuild;
    });
    
    // Get bot guilds
    const botGuilds = res.locals.client.guilds.cache;
    
    // Merge data to determine which guilds the bot is in
    const guilds = managedGuilds.map(guild => ({
        ...guild,
        hasBot: botGuilds.has(guild.id)
    }));
    
    res.json({
        success: true,
        guilds
    });
});

/**
 * @route GET /api/guilds/:guildId
 * @desc Get guild data
 */
router.get('/guilds/:guildId', isAuthenticated, hasGuildPermission('MANAGE_GUILD'), async (req, res) => {
    try {
        const { guildId } = req.params;
        
        // Get guild from Discord
        let guild;
        try {
            guild = await res.locals.client.guilds.fetch(guildId);
            
            // Get guild info
            const guildInfo = {
                id: guild.id,
                name: guild.name,
                icon: guild.icon,
                memberCount: guild.memberCount,
                channels: guild.channels.cache.map(channel => ({
                    id: channel.id,
                    name: channel.name,
                    type: channel.type
                })),
                roles: guild.roles.cache.map(role => ({
                    id: role.id,
                    name: role.name,
                    color: role.color,
                    position: role.position
                }))
            };
            
            return res.json({
                success: true,
                guild: guildInfo
            });
        } catch (error) {
            return res.status(404).json({
                success: false,
                error: 'Guild not found or bot is not in this guild'
            });
        }
    } catch (error) {
        console.error('Error fetching guild data:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * @route GET /api/guilds/:guildId/settings
 * @desc Get guild settings
 */
router.get('/guilds/:guildId/settings', isAuthenticated, hasGuildPermission('MANAGE_GUILD'), async (req, res) => {
    try {
        const { guildId } = req.params;
        
        // Get settings
        const prefix = await database.getSetting('prefix', guildId, '!');
        const welcomeChannel = await database.getSetting('welcomeChannel', guildId, null);
        const welcomeMessage = await database.getSetting('welcomeMessage', guildId, 'Welcome {user} to {server}!');
        const logChannel = await database.getSetting('logChannel', guildId, null);
        
        res.json({
            success: true,
            settings: {
                prefix,
                welcomeChannel,
                welcomeMessage,
                logChannel
            }
        });
    } catch (error) {
        console.error('Error fetching guild settings:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * @route PUT /api/guilds/:guildId/settings
 * @desc Update guild settings
 */
router.put('/guilds/:guildId/settings', isAuthenticated, hasGuildPermission('MANAGE_GUILD'), async (req, res) => {
    try {
        const { guildId } = req.params;
        const { prefix, welcomeChannel, welcomeMessage, logChannel } = req.body;
        
        // Validate the inputs
        if (prefix && (typeof prefix !== 'string' || prefix.length > 10)) {
            return res.status(400).json({
                success: false,
                error: 'Prefix must be a string of 10 characters or less'
            });
        }
        
        // Update settings
        if (prefix !== undefined) {
            await database.setSetting('prefix', prefix, guildId, req.user.id);
        }
        
        if (welcomeChannel !== undefined) {
            await database.setSetting('welcomeChannel', welcomeChannel, guildId, req.user.id);
        }
        
        if (welcomeMessage !== undefined) {
            await database.setSetting('welcomeMessage', welcomeMessage, guildId, req.user.id);
        }
        
        if (logChannel !== undefined) {
            await database.setSetting('logChannel', logChannel, guildId, req.user.id);
        }
        
        // Return updated settings
        const updatedSettings = {
            prefix: await database.getSetting('prefix', guildId, '!'),
            welcomeChannel: await database.getSetting('welcomeChannel', guildId, null),
            welcomeMessage: await database.getSetting('welcomeMessage', guildId, 'Welcome {user} to {server}!'),
            logChannel: await database.getSetting('logChannel', guildId, null)
        };
        
        res.json({
            success: true,
            settings: updatedSettings
        });
    } catch (error) {
        console.error('Error updating guild settings:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * @route GET /api/guilds/:guildId/commands
 * @desc Get guild commands
 */
router.get('/guilds/:guildId/commands', isAuthenticated, hasGuildPermission('MANAGE_GUILD'), async (req, res) => {
    try {
        const { guildId } = req.params;
        
        // This is just a placeholder - you'll need to implement this based on your bot structure
        // Ideally, you'd fetch this from the bot through an IPC mechanism
        
        const commands = [];
        
        res.json({
            success: true,
            commands
        });
    } catch (error) {
        console.error('Error fetching guild commands:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * @route GET /api/plugins
 * @desc Get all plugins
 */
router.get('/plugins', isAuthenticated, (req, res) => {
    const pluginsInfo = req.app.get('dashboardPluginManager')?.getPluginsInfo() || [];
    
    res.json({
        success: true,
        plugins: pluginsInfo
    });
});

/**
 * @route GET /api/audit-log
 * @desc Get audit log entries
 */
router.get('/audit-log', isAuthenticated, async (req, res) => {
    try {
        const { guildId, limit = 50, offset = 0 } = req.query;
        
        // Admin can view all logs, others can only view their guilds
        if (!req.user.is_admin && guildId) {
            // Verify user has access to this guild
            const userGuilds = req.user.guilds || [];
            const guild = userGuilds.find(g => g.id === guildId);
            
            if (!guild) {
                return res.status(403).json({
                    success: false,
                    error: 'You do not have permission to view this guild\'s audit log'
                });
            }
        }
        
        // Get audit log entries
        const entries = await database.getAuditLog({
            guildId: guildId || null,
            userId: req.user.is_admin ? null : req.user.id,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
        
        res.json({
            success: true,
            entries
        });
    } catch (error) {
        console.error('Error fetching audit log:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

module.exports = router;