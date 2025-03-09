const path = require('path');
const DashboardPlugin = require('../../dashboard/plugin-system/dashboard-plugin');
const express = require('express');
const { isAuthenticated, hasGuildPermission } = require('../../dashboard/config/middleware');
const database = require('../../dashboard/config/database');

// Create the plugin instance
module.exports = new DashboardPlugin({
    name: 'analytics',
    version: '1.0.0',
    description: 'Server analytics and statistics',
    author: 'Bot Developer',
    routePrefix: '/analytics'
});

/**
 * Initialize the plugin
 * @param {Express} app - The Express app instance
 * @param {Object} context - The plugin context
 * @returns {Promise<void>}
 */
module.exports.initialize = async (app, context) => {
    const { logger, pluginDir } = context;
    
    logger.info(`Initializing ${module.exports.name} dashboard plugin`);
    
    // Register views
    const viewsPath = path.join(pluginDir, 'views');
    await module.exports.registerViews(app, viewsPath);
    
    // Register static assets
    const publicPath = path.join(pluginDir, 'public');
    await module.exports.registerStatic(app, publicPath);
    
    // Register routes
    const router = express.Router();
    
    // Main analytics page
    router.get('/:guildId', isAuthenticated, hasGuildPermission('MANAGE_GUILD'), async (req, res) => {
        try {
            const { guildId } = req.params;
            
            // Get guild from Discord
            let guild;
            try {
                guild = await res.locals.client.guilds.fetch(guildId);
            } catch (error) {
                return res.status(404).render('error', {
                    title: '404 - Server Not Found',
                    message: 'The server was not found or the bot is not in this server',
                    status: 404
                });
            }
            
            // Get plugin settings
            const settings = await database.getAllPluginSettings(module.exports.name, guildId);
            
            // Set default settings if none exist
            if (!Object.keys(settings).length) {
                await database.setPluginSetting(module.exports.name, 'enabledCharts', ['members', 'messages', 'commands'], guildId, req.user.id);
                await database.setPluginSetting(module.exports.name, 'timeRange', '30d', guildId, req.user.id);
                
                // Reload settings
                settings.enabledCharts = ['members', 'messages', 'commands'];
                settings.timeRange = '30d';
            }
            
            // Set active items for sidebar
            res.locals.activePage = 'dashboard';
            res.locals.activePlugin = 'analytics';
            
            // Render the analytics dashboard
            res.render('analytics/dashboard', {
                title: `Analytics - ${guild.name}`,
                guild,
                settings
            });
        } catch (error) {
            logger.error('Error rendering analytics dashboard:', error);
            res.status(500).render('error', {
                title: '500 - Server Error',
                message: 'Error loading analytics dashboard',
                status: 500
            });
        }
    });
    
    // API endpoint to get analytics data
    router.get('/api/:guildId/data', isAuthenticated, hasGuildPermission('MANAGE_GUILD'), async (req, res) => {
        try {
            const { guildId } = req.params;
            const { timeRange = '30d' } = req.query;
            
            // This is just sample data - in a real implementation, you would fetch actual metrics
            const data = generateSampleData(timeRange);
            
            res.json({
                success: true,
                data
            });
        } catch (error) {
            logger.error('Error fetching analytics data:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    });
    
    // Register the router
    app.use(module.exports.routePrefix, router);
    
    logger.info(`${module.exports.name} dashboard plugin initialized successfully`);
};

/**
 * Shutdown the plugin
 * @param {Express} app - The Express app instance
 * @returns {Promise<void>}
 */
module.exports.shutdown = async (app) => {
    // Clean up resources if needed
};

/**
 * Generate sample analytics data
 * @param {string} timeRange - The time range (7d, 30d, 90d)
 * @returns {Object} - Sample analytics data
 */
function generateSampleData(timeRange) {
    let days;
    
    switch (timeRange) {
        case '7d':
            days = 7;
            break;
        case '90d':
            days = 90;
            break;
        case '30d':
        default:
            days = 30;
            break;
    }
    
    // Generate dates for the specified range
    const dates = [];
    const now = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(now.getDate() - i);
        dates.push(date.toISOString().split('T')[0]);
    }
    
    // Generate sample data
    return {
        members: {
            joined: generateRandomData(dates, 0, 10),
            left: generateRandomData(dates, 0, 5),
            total: generateCumulativeData(dates, 500, 10, 5)
        },
        messages: {
            total: generateRandomData(dates, 50, 200),
            users: generateRandomData(dates, 10, 50),
            channels: generateChannelData(days)
        },
        commands: {
            used: generateRandomData(dates, 10, 50),
            popular: generatePopularCommandsData()
        },
        voice: {
            minutes: generateRandomData(dates, 100, 500),
            users: generateRandomData(dates, 5, 15)
        }
    };
}

/**
 * Generate random data points
 * @param {string[]} dates - Array of date strings
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {Array} - Array of data points
 */
function generateRandomData(dates, min, max) {
    return dates.map(date => ({
        date,
        value: Math.floor(Math.random() * (max - min + 1)) + min
    }));
}

/**
 * Generate cumulative data with random fluctuations
 * @param {string[]} dates - Array of date strings
 * @param {number} startValue - Starting value
 * @param {number} joinRate - Average join rate
 * @param {number} leaveRate - Average leave rate
 * @returns {Array} - Array of data points
 */
function generateCumulativeData(dates, startValue, joinRate, leaveRate) {
    let currentValue = startValue;
    
    return dates.map(date => {
        const joined = Math.floor(Math.random() * joinRate * 2);
        const left = Math.floor(Math.random() * leaveRate);
        
        currentValue += (joined - left);
        
        return {
            date,
            value: currentValue
        };
    });
}

/**
 * Generate channel activity data
 * @param {number} days - Number of days
 * @returns {Array} - Array of channel data
 */
function generateChannelData(days) {
    const channels = [
        { id: '1', name: 'general' },
        { id: '2', name: 'welcome' },
        { id: '3', name: 'announcements' },
        { id: '4', name: 'bot-commands' },
        { id: '5', name: 'off-topic' }
    ];
    
    return channels.map(channel => ({
        id: channel.id,
        name: channel.name,
        messages: Math.floor(Math.random() * 500 * days)
    })).sort((a, b) => b.messages - a.messages);
}

/**
 * Generate popular commands data
 * @returns {Array} - Array of popular commands
 */
function generatePopularCommandsData() {
    const commands = [
        { name: 'help', count: Math.floor(Math.random() * 100) + 50 },
        { name: 'ping', count: Math.floor(Math.random() * 80) + 40 },
        { name: 'ban', count: Math.floor(Math.random() * 30) + 10 },
        { name: 'kick', count: Math.floor(Math.random() * 25) + 5 },
        { name: 'clear', count: Math.floor(Math.random() * 40) + 20 },
        { name: '8ball', count: Math.floor(Math.random() * 60) + 30 },
        { name: 'roll', count: Math.floor(Math.random() * 50) + 25 }
    ];
    
    return commands.sort((a, b) => b.count - a.count);
}