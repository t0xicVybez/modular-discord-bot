const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');
const fs = require('fs');

/**
 * Database utility for handling SQLite database operations
 */
class Database {
    constructor() {
        this.db = null;
        this.dataDir = path.join(process.cwd(), 'data');
        this.dbPath = path.join(this.dataDir, 'database.sqlite');
    }
    
    /**
     * Initialize the database connection
     * @returns {Promise<void>}
     */
    async init() {
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
        
        // Initialize core tables
        await this.initCoreTables();
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
     * Initialize core database tables
     * @returns {Promise<void>}
     */
    async initCoreTables() {
        // Create guild settings table
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS guild_settings (
                guild_id TEXT PRIMARY KEY,
                prefix TEXT DEFAULT '!',
                welcome_channel_id TEXT,
                welcome_message TEXT,
                log_channel_id TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Create plugin data table
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS plugin_data (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                plugin_name TEXT NOT NULL,
                guild_id TEXT,
                key TEXT NOT NULL,
                value TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(plugin_name, guild_id, key)
            )
        `);
    }
    
    /**
     * Get guild settings
     * @param {string} guildId - The ID of the guild
     * @returns {Promise<Object>} - The guild settings
     */
    async getGuildSettings(guildId) {
        const settings = await this.db.get('SELECT * FROM guild_settings WHERE guild_id = ?', guildId);
        
        if (!settings) {
            // Insert default settings
            await this.db.run(
                'INSERT INTO guild_settings (guild_id, prefix) VALUES (?, ?)',
                guildId, '!'
            );
            
            return { guild_id: guildId, prefix: '!' };
        }
        
        return settings;
    }
    
    /**
     * Update guild settings
     * @param {string} guildId - The ID of the guild
     * @param {Object} settings - The settings to update
     * @returns {Promise<void>}
     */
    async updateGuildSettings(guildId, settings) {
        const existingSettings = await this.getGuildSettings(guildId);
        
        // Create SET part of the query
        const keys = Object.keys(settings).filter(key => key !== 'guild_id');
        if (keys.length === 0) return existingSettings;
        
        const setClause = keys.map(key => `${key} = ?`).join(', ');
        const values = keys.map(key => settings[key]);
        values.push(new Date().toISOString());
        values.push(guildId);
        
        // Update the settings
        await this.db.run(
            `UPDATE guild_settings SET ${setClause}, updated_at = ? WHERE guild_id = ?`,
            ...values
        );
        
        return { ...existingSettings, ...settings };
    }
    
    /**
     * Set plugin data
     * @param {string} pluginName - The name of the plugin
     * @param {string} key - The data key
     * @param {any} value - The data value
     * @param {string} [guildId=null] - The ID of the guild (null for global data)
     * @returns {Promise<void>}
     */
    async setPluginData(pluginName, key, value, guildId = null) {
        const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
        
        await this.db.run(`
            INSERT INTO plugin_data (plugin_name, guild_id, key, value, updated_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT (plugin_name, guild_id, key)
            DO UPDATE SET value = ?, updated_at = ?
        `, pluginName, guildId, key, stringValue, new Date().toISOString(),
           stringValue, new Date().toISOString());
    }
    
    /**
     * Get plugin data
     * @param {string} pluginName - The name of the plugin
     * @param {string} key - The data key
     * @param {string} [guildId=null] - The ID of the guild (null for global data)
     * @param {any} [defaultValue=null] - Default value if not found
     * @returns {Promise<any>} - The data value
     */
    async getPluginData(pluginName, key, guildId = null, defaultValue = null) {
        const data = await this.db.get(`
            SELECT value FROM plugin_data
            WHERE plugin_name = ? AND guild_id = ? AND key = ?
        `, pluginName, guildId, key);
        
        if (!data) return defaultValue;
        
        try {
            return JSON.parse(data.value);
        } catch {
            return data.value;
        }
    }
    
    /**
     * Delete plugin data
     * @param {string} pluginName - The name of the plugin
     * @param {string} key - The data key
     * @param {string} [guildId=null] - The ID of the guild (null for global data)
     * @returns {Promise<boolean>} - Whether the data was deleted
     */
    async deletePluginData(pluginName, key, guildId = null) {
        const result = await this.db.run(`
            DELETE FROM plugin_data
            WHERE plugin_name = ? AND guild_id = ? AND key = ?
        `, pluginName, guildId, key);
        
        return result.changes > 0;
    }
    
    /**
     * Get all plugin data for a plugin
     * @param {string} pluginName - The name of the plugin
     * @param {string} [guildId=null] - The ID of the guild (null for global data)
     * @returns {Promise<Object>} - Object with key-value pairs
     */
    async getAllPluginData(pluginName, guildId = null) {
        const rows = await this.db.all(`
            SELECT key, value FROM plugin_data
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
     * Clear all data for a plugin
     * @param {string} pluginName - The name of the plugin
     * @returns {Promise<number>} - Number of rows deleted
     */
    async clearPluginData(pluginName) {
        const result = await this.db.run(`
            DELETE FROM plugin_data
            WHERE plugin_name = ?
        `, pluginName);
        
        return result.changes;
    }
}

module.exports = new Database();