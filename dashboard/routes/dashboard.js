const express = require('express');
const router = express.Router();
const { isAuthenticated, isAdmin, cacheUserGuilds, hasGuildPermission } = require('../config/middleware');
const { Client } = require('discord.js');
const database = require('../config/database');

// Initialize Discord client for bot actions
const client = new Client({
    intents: []  // No intents needed for API actions
});

// Login the bot
client.login(process.env.BOT_TOKEN).catch(console.error);

// Add client to the app locals so it can be used in routes
router.use((req, res, next) => {
    res.locals.client = client;
    next();
});

// Cache user guilds middleware for all dashboard routes
router.use(cacheUserGuilds);

/**
 * @route GET /
 * @desc Home page
 */
router.get('/', (req, res) => {
    res.render('index', {
        title: 'Bot Dashboard'
    });
});

/**
 * @route GET /dashboard
 * @desc Dashboard overview - shows list of servers
 */
router.get('/dashboard', isAuthenticated, async (req, res) => {
    try {
        // Get user guilds
        const userGuilds = req.user.guilds || [];
        
        // Filter guilds where user has MANAGE_GUILD permission or is owner
        const managedGuilds = userGuilds.filter(guild => {
            const permissions = BigInt(guild.permissions);
            const hasManageGuild = (permissions & BigInt(0x20)) === BigInt(0x20); // MANAGE_GUILD permission
            const isAdmin = (permissions & BigInt(0x8)) === BigInt(0x8); // ADMINISTRATOR permission
            return guild.owner || isAdmin || hasManageGuild;
        });
        
        // Get bot guilds
        const botGuilds = client.guilds.cache;
        
        // Merge data to determine which guilds the bot is in
        const guilds = managedGuilds.map(guild => ({
            ...guild,
            hasBot: botGuilds.has(guild.id)
        }));
        
        res.render('dashboard', {
            title: 'Dashboard',
            guilds
        });
    } catch (error) {
        console.error('Error loading dashboard:', error);
        res.status(500).render('error', {
            title: '500 - Server Error',
            message: 'Error loading dashboard',
            status: 500
        });
    }
});

/**
 * @route GET /dashboard/:guildId
 * @desc Server dashboard page
 */
router.get('/dashboard/:guildId', isAuthenticated, hasGuildPermission('MANAGE_GUILD'), async (req, res) => {
    try {
        const { guildId } = req.params;
        
        // Get guild from Discord
        let guild;
        try {
            guild = await client.guilds.fetch(guildId);
        } catch (error) {
            return res.status(404).render('error', {
                title: '404 - Server Not Found',
                message: 'The server was not found or the bot is not in this server',
                status: 404
            });
        }
        
        // Get guild settings
        const prefix = await database.getSetting('prefix', guildId, '!');
        const welcomeChannel = await database.getSetting('welcomeChannel', guildId, null);
        const welcomeMessage = await database.getSetting('welcomeMessage', guildId, 'Welcome {user} to {server}!');
        const logChannel = await database.getSetting('logChannel', guildId, null);
        
        // Get channels from the guild
        const textChannels = guild.channels.cache
            .filter(channel => channel.type === 0) // GUILD_TEXT
            .map(channel => ({
                id: channel.id,
                name: channel.name
            }));
        
        // Get plugins
        const pluginsInfo = req.app.get('dashboardPluginManager')?.getPluginsInfo() || [];
        
        // Render the guild dashboard
        res.render('guild', {
            title: `Dashboard - ${guild.name}`,
            guild,
            settings: {
                prefix,
                welcomeChannel,
                welcomeMessage,
                logChannel
            },
            channels: textChannels,
            plugins: pluginsInfo
        });
    } catch (error) {
        console.error('Error loading guild dashboard:', error);
        res.status(500).render('error', {
            title: '500 - Server Error',
            message: 'Error loading server dashboard',
            status: 500
        });
    }
});

/**
 * @route GET /dashboard/:guildId/commands
 * @desc Commands configuration page
 */
router.get('/dashboard/:guildId/commands', isAuthenticated, hasGuildPermission('MANAGE_GUILD'), async (req, res) => {
    try {
        const { guildId } = req.params;
        
        // Get guild from Discord
        let guild;
        try {
            guild = await client.guilds.fetch(guildId);
        } catch (error) {
            return res.status(404).render('error', {
                title: '404 - Server Not Found',
                message: 'The server was not found or the bot is not in this server',
                status: 404
            });
        }
        
        // Get commands
        // This is just a placeholder - you'll need to implement this based on your bot structure
        const commands = [];
        
        // Render the commands page
        res.render('commands', {
            title: `Commands - ${guild.name}`,
            guild,
            commands
        });
    } catch (error) {
        console.error('Error loading commands page:', error);
        res.status(500).render('error', {
            title: '500 - Server Error',
            message: 'Error loading commands page',
            status: 500
        });
    }
});

/**
 * @route GET /dashboard/:guildId/plugins
 * @desc Plugins configuration page
 */
router.get('/dashboard/:guildId/plugins', isAuthenticated, hasGuildPermission('MANAGE_GUILD'), async (req, res) => {
    try {
        const { guildId } = req.params;
        
        // Get guild from Discord
        let guild;
        try {
            guild = await client.guilds.fetch(guildId);
        } catch (error) {
            return res.status(404).render('error', {
                title: '404 - Server Not Found',
                message: 'The server was not found or the bot is not in this server',
                status: 404
            });
        }
        
        // Get plugins
        const pluginsInfo = req.app.get('dashboardPluginManager')?.getPluginsInfo() || [];
        
        // Render the plugins page
        res.render('plugins', {
            title: `Plugins - ${guild.name}`,
            guild,
            plugins: pluginsInfo
        });
    } catch (error) {
        console.error('Error loading plugins page:', error);
        res.status(500).render('error', {
            title: '500 - Server Error',
            message: 'Error loading plugins page',
            status: 500
        });
    }
});

/**
 * @route GET /admin
 * @desc Admin dashboard
 */
router.get('/admin', isAuthenticated, isAdmin, (req, res) => {
    res.render('admin', {
        title: 'Admin Dashboard'
    });
});

module.exports = router;