/**
 * Configuration for Express middleware
 */

/**
 * Check if user is authenticated
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    
    // Store the original URL for redirection after login
    req.session.returnTo = req.originalUrl;
    res.redirect('/auth/login');
};

/**
 * Check if user is an admin
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const isAdmin = (req, res, next) => {
    if (req.isAuthenticated() && req.user.is_admin) {
        return next();
    }
    
    res.status(403).render('error', {
        title: '403 - Forbidden',
        message: 'You do not have permission to access this page',
        status: 403
    });
};

/**
 * Check if user has guild permissions
 * @param {string} permission - The permission to check
 * @returns {Function} - Express middleware function
 */
const hasGuildPermission = (permission) => {
    return (req, res, next) => {
        // Must be authenticated
        if (!req.isAuthenticated()) {
            req.session.returnTo = req.originalUrl;
            return res.redirect('/auth/login');
        }
        
        // Admin bypass
        if (req.user.is_admin) {
            return next();
        }
        
        // Get guild ID from params
        const guildId = req.params.guildId;
        
        // Check if user has the guild in their guild list
        if (!req.user.guilds || !Array.isArray(req.user.guilds)) {
            return res.status(403).render('error', {
                title: '403 - Forbidden',
                message: 'Guild data not available',
                status: 403
            });
        }
        
        // Find the guild
        const guild = req.user.guilds.find(g => g.id === guildId);
        
        if (!guild) {
            return res.status(403).render('error', {
                title: '403 - Forbidden',
                message: 'You do not have access to this server',
                status: 403
            });
        }
        
        // Check if user is owner or has ADMINISTRATOR permission
        const isOwner = guild.owner;
        const isAdmin = (BigInt(guild.permissions) & BigInt(0x8)) === BigInt(0x8); // ADMINISTRATOR permission
        
        if (isOwner || isAdmin) {
            return next();
        }
        
        // Check for specific permission
        if (permission) {
            // Map of permission names to bit positions
            const permissionFlags = {
                MANAGE_GUILD: 0x20,
                KICK_MEMBERS: 0x2,
                BAN_MEMBERS: 0x4,
                MANAGE_CHANNELS: 0x10,
                MANAGE_ROLES: 0x10000000,
                MANAGE_WEBHOOKS: 0x80000000,
                MANAGE_MESSAGES: 0x2000,
                MUTE_MEMBERS: 0x400000,
                DEAFEN_MEMBERS: 0x800000,
                MOVE_MEMBERS: 0x1000000
                // Add other permissions as needed
            };
            
            const permBit = permissionFlags[permission];
            
            if (permBit && (BigInt(guild.permissions) & BigInt(permBit)) === BigInt(permBit)) {
                return next();
            }
        }
        
        // No permission
        return res.status(403).render('error', {
            title: '403 - Forbidden',
            message: 'You do not have the required permissions to access this page',
            status: 403
        });
    };
};

/**
 * Load user's guilds into cache
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const cacheUserGuilds = async (req, res, next) => {
    if (req.isAuthenticated() && req.user.accessToken) {
        try {
            // Only fetch if we don't have guilds in cache or it's been more than 5 minutes
            const cacheTime = req.session.guildsCacheTime || 0;
            const now = Date.now();
            
            if (!req.user.guilds || (now - cacheTime > 5 * 60 * 1000)) {
                // Fetch guilds from Discord API
                const response = await fetch('https://discord.com/api/v10/users/@me/guilds', {
                    headers: {
                        Authorization: `Bearer ${req.user.accessToken}`
                    }
                });
                
                if (response.ok) {
                    const guilds = await response.json();
                    
                    // Initialize cache if it doesn't exist
                    if (!global.userGuildsCache) {
                        global.userGuildsCache = {};
                    }
                    
                    // Store in the global cache
                    global.userGuildsCache[req.user.id] = guilds;
                    
                    // Add to user object
                    req.user.guilds = guilds;
                    
                    // Update cache time
                    req.session.guildsCacheTime = now;
                }
            }
        } catch (error) {
            console.error('Error fetching user guilds:', error);
        }
    }
    
    next();
};

// Export the middleware functions
module.exports = {
    isAuthenticated,
    isAdmin,
    hasGuildPermission,
    cacheUserGuilds
};