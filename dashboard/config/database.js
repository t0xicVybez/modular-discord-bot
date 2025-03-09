const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');
const fs = require('fs');

/**
 * Dashboard database utility for handling SQLite database operations
 */
class DashboardDatabase {
    constructor() {
        this.db = null;
        this.dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../data/database.sqlite');
        this.dataDir = path.dirname(this.dbPath);
    }
    
    /**
     * Initialize the database connection
     * @returns {Promise<void>}
     */
    async initialize() {
        // Ensure data directory exists
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
        
        // Open database connection
        this.db = await open({
            filename: this.dbPath,
            driver: sqlite3.Database
        });
        
        // Enable foreign keys
        await this.db.run('PRAGMA foreign_keys = ON');
        
        // Initialize dashboard tables
        await this.initDashboardTables();
    }
    
    /**
     * Close the database connection
     * @returns {Promise<void>}
     */
    async close() {
        if (this.db) {
            await this.db.close();
            this.db = null;
        }
    }
    
    /**
     * Initialize dashboard database tables
     * @returns {Promise<void>}
     */
    async initDashboardTables() {
        // Create dashboard users table
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS dashboard_users (
                id TEXT PRIMARY KEY,
                username TEXT NOT NULL,
                discriminator TEXT,
                avatar TEXT,
                access_token TEXT,
                refresh_token TEXT,
                is_admin BOOLEAN DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Create dashboard settings table
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS dashboard_settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                guild_id TEXT,
                key TEXT NOT NULL,
                value TEXT,
                created_by TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by) REFERENCES dashboard_users(id),
                UNIQUE(guild_id, key)
            )
        `);
        
        // Create dashboard plugin settings table
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS dashboard_plugin_settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                plugin_name TEXT NOT NULL,
                guild_id TEXT,
                key TEXT NOT NULL,
                value TEXT,
                created_by TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by) REFERENCES dashboard_users(id),
                UNIQUE(plugin_name, guild_id, key)
            )
        `);
        
        // Create dashboard audit log table
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS dashboard_audit_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                guild_id TEXT,
                action TEXT NOT NULL,
                details TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES dashboard_users(id)
            )
        `);
    }
    
    /**
     * Get a dashboard user by ID
     * @param {string} userId - The user ID
     * @returns {Promise<Object|null>} - The user object or null if not found
     */
    async getUser(userId) {
        return await this.db.get('SELECT * FROM dashboard_users WHERE id = ?', userId);
    }
    
    /**
     * Create or update a dashboard user
     * @param {Object} user - The user data from Discord OAuth
     * @returns {Promise<Object>} - The updated user
     */
    async upsertUser(user) {
        const { id, username, discriminator, avatar, accessToken, refreshToken } = user;
        
        // Check if user exists
        const existingUser = await this.getUser(id);
        
        if (existingUser) {
            // Update existing user
            await this.db.run(`
                UPDATE dashboard_users
                SET username = ?, discriminator = ?, avatar = ?, 
                    access_token = ?, refresh_token = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, username, discriminator, avatar, accessToken, refreshToken, id);
            
            return { ...existingUser, username, discriminator, avatar, accessToken, refreshToken };
        } else {
            // Insert new user
            await this.db.run(`
                INSERT INTO dashboard_users 
                (id, username, discriminator, avatar, access_token, refresh_token)
                VALUES (?, ?, ?, ?, ?, ?)
            `, id, username, discriminator, avatar, accessToken, refreshToken);
            
            return { id, username, discriminator, avatar, accessToken, refreshToken, is_admin: 0 };
        }
    }
    
    /**
     * Set a user as admin
     * @param {string} userId - The user ID
     * @param {boolean} isAdmin - Admin status
     * @returns {Promise<void>}
     */
    async setUserAdmin(userId, isAdmin = true) {
        await this.db.run(`
            UPDATE dashboard_users
            SET is_admin = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, isAdmin ? 1 : 0, userId);
    }
    
    /**
     * Get dashboard setting
     * @param {string} key - The setting key
     * @param {string} [guildId=null] - The guild ID (null for global settings)
     * @param {any} [defaultValue=null] - Default value if not found
     * @returns {Promise<any>} - The setting value
     */
    async getSetting(key, guildId = null, defaultValue = null) {
        const setting = await this.db.get(`
            SELECT value FROM dashboard_settings
            WHERE key = ? AND guild_id = ?
        `, key, guildId);
        
        if (!setting) return defaultValue;
        
        try {
            return JSON.parse(setting.value);
        } catch {
            return setting.value;
        }
    }
    
    /**
     * Set dashboard setting
     * @param {string} key - The setting key
     * @param {any} value - The setting value
     * @param {string} [guildId=null] - The guild ID (null for global settings)
     * @param {string} [userId=null] - The user ID making the change
     * @returns {Promise<void>}
     */
    async setSetting(key, value, guildId = null, userId = null) {
        const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
        
        await this.db.run(`
            INSERT INTO dashboard_settings (guild_id, key, value, created_by)
            VALUES (?, ?, ?, ?)
            ON CONFLICT (guild_id, key)
            DO UPDATE SET value = ?, created_by = ?, updated_at = CURRENT_TIMESTAMP
        `, guildId, key, stringValue, userId, stringValue, userId);
        
        // Log the action
        if (userId) {
            await this.logAction(userId, guildId, 'UPDATE_SETTING', `Updated setting: ${key}`);
        }
    }
    
    /**
     * Get plugin setting
     * @param {string} pluginName - The plugin name
     * @param {string} key - The setting key
     * @param {string} [guildId=null] - The guild ID (null for global settings)
     * @param {any} [defaultValue=null] - Default value if not found
     * @returns {Promise<any>} - The setting value
     */
    async getPluginSetting(pluginName, key, guildId = null, defaultValue = null) {
        const setting = await this.db.get(`
            SELECT value FROM dashboard_plugin_settings
            WHERE plugin_name = ? AND key = ? AND guild_id = ?
        `, pluginName, key, guildId);
        
        if (!setting) return defaultValue;
        
        try {
            return JSON.parse(setting.value);
        } catch {
            return setting.value;
        }
    }
    
    /**
     * Set plugin setting
     * @param {string} pluginName - The plugin name
     * @param {string} key - The setting key
     * @param {any} value - The setting value
     * @param {string} [guildId=null] - The guild ID (null for global settings)
     * @param {string} [userId=null] - The user ID making the change
     * @returns {Promise<void>}
     */
    async setPluginSetting(pluginName, key, value, guildId = null, userId = null) {
        const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
        
        await this.db.run(`
            INSERT INTO dashboard_plugin_settings (plugin_name, guild_id, key, value, created_by)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT (plugin_name, guild_id, key)
            DO UPDATE SET value = ?, created_by = ?, updated_at = CURRENT_TIMESTAMP
        `, pluginName, guildId, key, stringValue, userId, stringValue, userId);
        
        // Log the action
        if (userId) {
            await this.logAction(userId, guildId, 'UPDATE_PLUGIN_SETTING', `Updated ${pluginName} setting: ${key}`);
        }
    }
    
    /**
     * Get all plugin settings
     * @param {string} pluginName - The plugin name
     * @param {string} [guildId=null] - The guild ID (null for global settings)
     * @returns {Promise<Object>} - Object with key-value pairs
     */
    async getAllPluginSettings(pluginName, guildId = null) {
        const rows = await this.db.all(`
            SELECT key, value FROM dashboard_plugin_settings
            WHERE plugin_name = ? AND guild_id = ?
        `, pluginName, guildId);
        
        const result = {};
        for (const row of rows) {
            try {
                result[row.key] = JSON.parse(row.value);
            } catch {
                result[row.key] = row.value;
            }
        }
        
        return result;
    }
    
    /**
     * Log an action in the audit log
     * @param {string} userId - The user ID
     * @param {string} [guildId=null] - The guild ID
     * @param {string} action - The action performed
     * @param {string} [details=null] - Additional details
     * @returns {Promise<void>}
     */
    async logAction(userId, guildId = null, action, details = null) {
        await this.db.run(`
            INSERT INTO dashboard_audit_log (user_id, guild_id, action, details)
            VALUES (?, ?, ?, ?)
        `, userId, guildId, action, details);
    }
    
    /**
     * Get audit log entries
     * @param {Object} options - Query options
     * @param {string} [options.userId] - Filter by user ID
     * @param {string} [options.guildId] - Filter by guild ID
     * @param {string} [options.action] - Filter by action
     * @param {number} [options.limit=50] - Maximum number of entries to return
     * @param {number} [options.offset=0] - Offset for pagination
     * @returns {Promise<Array>} - Array of audit log entries
     */
    async getAuditLog(options = {}) {
        const { userId, guildId, action, limit = 50, offset = 0 } = options;
        
        // Build the query
        let query = 'SELECT * FROM dashboard_audit_log';
        const params = [];
        
        // Add where clauses
        const clauses = [];
        
        if (userId) {
            clauses.push('user_id = ?');
            params.push(userId);
        }
        
        if (guildId) {
            clauses.push('guild_id = ?');
            params.push(guildId);
        }
        
        if (action) {
            clauses.push('action = ?');
            params.push(action);
        }
        
        if (clauses.length > 0) {
            query += ' WHERE ' + clauses.join(' AND ');
        }
        
        // Add ordering and limits
        query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);
        
        // Execute the query
        return await this.db.all(query, ...params);
    }
}

module.exports = new DashboardDatabase();