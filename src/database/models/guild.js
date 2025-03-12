// Guild model - for storing Discord server configuration using MySQL
const { pool } = require('../index');

class Guild {
  constructor(data = {}) {
    this.id = data.id;
    this.guildId = data.guildId;
    this.name = data.name;
    this.icon = data.icon;
    this.prefix = data.prefix || '!';
    
    // Settings object
    this.settings = {
      welcomeEnabled: data.welcomeEnabled === 1 || data.welcomeEnabled === true,
      welcomeChannel: data.welcomeChannel || '',
      welcomeMessage: data.welcomeMessage || 'Welcome {user} to {server}!', // Handle default here instead of DB
      autoRoleEnabled: data.autoRoleEnabled === 1 || data.autoRoleEnabled === true,
      autoRoleId: data.autoRoleId || '',
      disabledCommands: data.disabledCommands || [],
      permissions: data.permissions || new Map(),
    };
    
    // Stats object
    this.stats = {
      memberCount: data.memberCount || 0,
      commandsUsed: data.commandsUsed || 0,
      lastActive: data.lastActive || new Date(),
    };
    
    this.joinedAt = data.joinedAt || new Date();
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  // Find a guild by Discord guild ID
  static async findOne({ guildId }) {
    try {
      const [rows] = await pool.query(
        'SELECT * FROM guilds WHERE guildId = ?',
        [guildId]
      );
      
      if (rows.length === 0) return null;
      
      // Get disabled commands
      const [disabledCommandRows] = await pool.query(
        'SELECT commandName FROM guild_disabled_commands WHERE guildId = ?',
        [guildId]
      );
      
      const disabledCommands = disabledCommandRows.map(row => row.commandName);
      
      // Get permissions
      const [permissionRows] = await pool.query(
        'SELECT permissionName, roleId FROM guild_permissions WHERE guildId = ?',
        [guildId]
      );
      
      // Build permissions map
      const permissions = new Map();
      permissionRows.forEach(perm => {
        if (!permissions.has(perm.permissionName)) {
          permissions.set(perm.permissionName, []);
        }
        permissions.get(perm.permissionName).push(perm.roleId);
      });
      
      // Create Guild instance with the data
      const guild = new Guild({
        ...rows[0],
        disabledCommands,
        permissions
      });
      
      return guild;
    } catch (error) {
      console.error('Error finding guild:', error);
      throw error;
    }
  }
  
  // Create a new guild
  static async create(data) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      // Insert guild basic data
      // Set default welcome message value
      const welcomeMessage = data.settings?.welcomeMessage || 'Welcome {user} to {server}!';
      
      const [result] = await connection.query(
        `INSERT INTO guilds 
         (guildId, name, icon, prefix, welcomeEnabled, welcomeChannel, welcomeMessage, 
          autoRoleEnabled, autoRoleId, memberCount, commandsUsed, lastActive, joinedAt) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.guildId, 
          data.name, 
          data.icon || null,
          data.prefix || '!',
          data.settings?.welcomeEnabled || false,
          data.settings?.welcomeChannel || '',
          welcomeMessage,
          data.settings?.autoRoleEnabled || false,
          data.settings?.autoRoleId || '',
          data.stats?.memberCount || 0,
          data.stats?.commandsUsed || 0,
          data.stats?.lastActive || new Date(),
          data.joinedAt || new Date()
        ]
      );
      
      // Insert disabled commands if any
      if (data.settings?.disabledCommands?.length > 0) {
        const disabledCommands = data.settings.disabledCommands;
        for (const cmd of disabledCommands) {
          await connection.query(
            'INSERT INTO guild_disabled_commands (guildId, commandName) VALUES (?, ?)',
            [data.guildId, cmd]
          );
        }
      }
      
      // Insert permissions if any
      if (data.settings?.permissions?.size > 0) {
        for (const [perm, roles] of data.settings.permissions.entries()) {
          for (const roleId of roles) {
            await connection.query(
              'INSERT INTO guild_permissions (guildId, permissionName, roleId) VALUES (?, ?, ?)',
              [data.guildId, perm, roleId]
            );
          }
        }
      }
      
      await connection.commit();
      
      // Return the created guild instance
      return this.findOne({ guildId: data.guildId });
    } catch (error) {
      await connection.rollback();
      console.error('Error creating guild:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  // Save changes to the database
  async save() {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      // Update basic guild info and settings
      await connection.query(
        `UPDATE guilds SET
         name = ?,
         icon = ?,
         prefix = ?,
         welcomeEnabled = ?,
         welcomeChannel = ?,
         welcomeMessage = ?,
         autoRoleEnabled = ?,
         autoRoleId = ?,
         memberCount = ?,
         commandsUsed = ?,
         lastActive = ?
         WHERE guildId = ?`,
        [
          this.name,
          this.icon,
          this.prefix,
          this.settings.welcomeEnabled,
          this.settings.welcomeChannel,
          this.settings.welcomeMessage,
          this.settings.autoRoleEnabled, 
          this.settings.autoRoleId,
          this.stats.memberCount,
          this.stats.commandsUsed,
          this.stats.lastActive,
          this.guildId
        ]
      );
      
      // Handle disabled commands - first delete existing
      await connection.query(
        'DELETE FROM guild_disabled_commands WHERE guildId = ?',
        [this.guildId]
      );
      
      // Then insert new ones
      if (this.settings.disabledCommands?.length > 0) {
        for (const cmd of this.settings.disabledCommands) {
          await connection.query(
            'INSERT INTO guild_disabled_commands (guildId, commandName) VALUES (?, ?)',
            [this.guildId, cmd]
          );
        }
      }
      
      // Handle permissions - first delete existing
      await connection.query(
        'DELETE FROM guild_permissions WHERE guildId = ?',
        [this.guildId]
      );
      
      // Then insert new ones
      if (this.settings.permissions?.size > 0) {
        for (const [perm, roles] of this.settings.permissions.entries()) {
          for (const roleId of roles) {
            await connection.query(
              'INSERT INTO guild_permissions (guildId, permissionName, roleId) VALUES (?, ?, ?)',
              [this.guildId, perm, roleId]
            );
          }
        }
      }
      
      await connection.commit();
      return this;
    } catch (error) {
      await connection.rollback();
      console.error('Error saving guild:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  // Update guild statistics
  async updateStats(memberCount) {
    this.stats.memberCount = memberCount;
    this.stats.lastActive = new Date();
    this.stats.commandsUsed += 1;
    return this.save();
  }

  // Static method to find or create a guild
  static async findOrCreate(guildData) {
    let guild = await this.findOne({ guildId: guildData.id });
    
    if (!guild) {
      guild = await this.create({
        guildId: guildData.id,
        name: guildData.name,
        icon: guildData.icon,
        stats: {
          memberCount: guildData.memberCount || 0,
        },
      });
    } else {
      // Update guild with new data
      guild.name = guildData.name;
      guild.icon = guildData.icon;
      if (guildData.memberCount) guild.stats.memberCount = guildData.memberCount;
      await guild.save();
    }
    
    return guild;
  }
}

module.exports = Guild;