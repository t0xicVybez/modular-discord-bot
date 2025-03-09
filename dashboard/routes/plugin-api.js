const express = require('express');
const router = express.Router();
const { isAuthenticated, isAdmin, hasGuildPermission } = require('../config/middleware');
const database = require('../config/database');
const path = require('path');
const fs = require('fs');

/**
 * @route GET /api/plugins/:pluginName/settings/:guildId?
 * @desc Get plugin settings for a guild
 */
router.get('/:pluginName/settings/:guildId?', isAuthenticated, async (req, res) => {
    try {
        const { pluginName, guildId } = req.params;
        
        // Validate access to guild if specified
        if (guildId) {
            // Admin bypass
            if (!req.user.is_admin) {
                // Check if user has the guild in their guild list
                if (!req.user.guilds || !Array.isArray(req.user.guilds)) {
                    return res.status(403).json({
                        success: false,
                        error: 'Guild data not available'
                    });
                }
                
                // Find the guild
                const guild = req.user.guilds.find(g => g.id === guildId);
                
                if (!guild) {
                    return res.status(403).json({
                        success: false,
                        error: 'You do not have access to this server'
                    });
                }
                
                // Check if user has MANAGE_GUILD permission
                const permissions = BigInt(guild.permissions);
                const hasManageGuild = (permissions & BigInt(0x20)) === BigInt(0x20);
                const isGuildAdmin = (permissions & BigInt(0x8)) === BigInt(0x8);
                
                if (!guild.owner && !isGuildAdmin && !hasManageGuild) {
                    return res.status(403).json({
                        success: false,
                        error: 'You do not have permission to manage this server'
                    });
                }
            }
        }
        
        // Get plugin settings
        const settings = await database.getAllPluginSettings(pluginName, guildId);
        
        res.json({
            success: true,
            settings
        });
    } catch (error) {
        console.error(`Error fetching plugin settings for ${req.params.pluginName}:`, error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * @route PUT /api/plugins/:pluginName/settings/:guildId?
 * @desc Update plugin settings for a guild
 */
router.put('/:pluginName/settings/:guildId?', isAuthenticated, async (req, res) => {
    try {
        const { pluginName, guildId } = req.params;
        const { settings } = req.body;
        
        if (!settings || typeof settings !== 'object') {
            return res.status(400).json({
                success: false,
                error: 'Settings must be an object'
            });
        }
        
        // Validate access to guild if specified
        if (guildId) {
            // Admin bypass
            if (!req.user.is_admin) {
                // Verify permission using middleware functionality
                const permissionMiddleware = hasGuildPermission('MANAGE_GUILD');
                
                // Create mock request with params
                const mockReq = {
                    ...req,
                    params: { guildId }
                };
                
                // Create mock response
                const mockRes = {
                    status: (code) => ({
                        render: () => {
                            throw new Error('Permission denied');
                        }
                    })
                };
                
                // Check permission
                try {
                    await new Promise((resolve, reject) => {
                        permissionMiddleware(mockReq, mockRes, resolve);
                    });
                } catch (error) {
                    return res.status(403).json({
                        success: false,
                        error: 'You do not have permission to manage this server'
                    });
                }
            }
        }
        
        // Update plugin settings
        for (const [key, value] of Object.entries(settings)) {
            await database.setPluginSetting(pluginName, key, value, guildId, req.user.id);
        }
        
        // Get updated settings
        const updatedSettings = await database.getAllPluginSettings(pluginName, guildId);
        
        res.json({
            success: true,
            settings: updatedSettings
        });
    } catch (error) {
        console.error(`Error updating plugin settings for ${req.params.pluginName}:`, error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * @route GET /api/plugins/reload/:pluginName
 * @desc Reload a dashboard plugin
 */
router.get('/reload/:pluginName', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { pluginName } = req.params;
        
        const dashboardPluginManager = req.app.get('dashboardPluginManager');
        
        if (!dashboardPluginManager) {
            return res.status(500).json({
                success: false,
                error: 'Dashboard plugin manager not available'
            });
        }
        
        const success = await dashboardPluginManager.reloadPlugin(pluginName);
        
        if (!success) {
            return res.status(400).json({
                success: false,
                error: `Failed to reload plugin: ${pluginName}`
            });
        }
        
        res.json({
            success: true,
            message: `Successfully reloaded plugin: ${pluginName}`
        });
    } catch (error) {
        console.error(`Error reloading plugin ${req.params.pluginName}:`, error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * @route GET /api/plugins/status
 * @desc Get status of all plugins
 */
router.get('/status', isAuthenticated, isAdmin, (req, res) => {
    try {
        const dashboardPluginManager = req.app.get('dashboardPluginManager');
        
        if (!dashboardPluginManager) {
            return res.status(500).json({
                success: false,
                error: 'Dashboard plugin manager not available'
            });
        }
        
        const plugins = dashboardPluginManager.getPluginsInfo();
        
        // Get available (but not loaded) plugins
        const pluginsDir = path.join(process.cwd(), '..', 'dashboard-plugins');
        let availablePlugins = [];
        
        if (fs.existsSync(pluginsDir)) {
            const pluginFolders = fs.readdirSync(pluginsDir, { withFileTypes: true })
                .filter(dirent => dirent.isDirectory())
                .map(dirent => dirent.name);
            
            // Filter out already loaded plugins
            availablePlugins = pluginFolders.filter(folder => {
                return !plugins.some(plugin => plugin.name === folder);
            });
        }
        
        res.json({
            success: true,
            plugins,
            availablePlugins
        });
    } catch (error) {
        console.error('Error getting plugin status:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * @route POST /api/plugins/load/:pluginName
 * @desc Load a dashboard plugin
 */
router.post('/load/:pluginName', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { pluginName } = req.params;
        
        const dashboardPluginManager = req.app.get('dashboardPluginManager');
        
        if (!dashboardPluginManager) {
            return res.status(500).json({
                success: false,
                error: 'Dashboard plugin manager not available'
            });
        }
        
        const success = await dashboardPluginManager.loadPlugin(pluginName);
        
        if (!success) {
            return res.status(400).json({
                success: false,
                error: `Failed to load plugin: ${pluginName}`
            });
        }
        
        res.json({
            success: true,
            message: `Successfully loaded plugin: ${pluginName}`
        });
    } catch (error) {
        console.error(`Error loading plugin ${req.params.pluginName}:`, error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * @route POST /api/plugins/unload/:pluginName
 * @desc Unload a dashboard plugin
 */
router.post('/unload/:pluginName', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { pluginName } = req.params;
        
        const dashboardPluginManager = req.app.get('dashboardPluginManager');
        
        if (!dashboardPluginManager) {
            return res.status(500).json({
                success: false,
                error: 'Dashboard plugin manager not available'
            });
        }
        
        const success = await dashboardPluginManager.unloadPlugin(pluginName);
        
        if (!success) {
            return res.status(400).json({
                success: false,
                error: `Failed to unload plugin: ${pluginName}`
            });
        }
        
        res.json({
            success: true,
            message: `Successfully unloaded plugin: ${pluginName}`
        });
    } catch (error) {
        console.error(`Error unloading plugin ${req.params.pluginName}:`, error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

module.exports = router;