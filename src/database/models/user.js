// User model - for storing Discord user data using MySQL
const { pool } = require('../index');

class User {
  constructor(data = {}) {
    this.id = data.id;
    this.discordId = data.discordId;
    this.username = data.username;
    this.discriminator = data.discriminator;
    this.avatar = data.avatar;
    this.guilds = data.guilds || [];
    this.accessToken = data.accessToken;
    this.refreshToken = data.refreshToken;
    this.dashboardTheme = data.dashboardTheme || 'dark';
    this.createdAt = data.createdAt;
    this.lastLogin = data.lastLogin || new Date();
    this.updatedAt = data.updatedAt;
  }

  // Find a user by Discord ID
  static async findOne({ discordId }) {
    try {
      const [rows] = await pool.query(
        'SELECT * FROM users WHERE discordId = ?',
        [discordId]
      );
      
      if (rows.length === 0) return null;
      
      // Get user's guilds
      const [guildRows] = await pool.query(
        'SELECT guildData FROM user_guilds WHERE userId = ?',
        [rows[0].id]
      );
      
      const guilds = guildRows.map(row => JSON.parse(row.guildData));
      
      // Create User instance with the data
      const user = new User({
        ...rows[0],
        guilds
      });
      
      return user;
    } catch (error) {
      console.error('Error finding user:', error);
      throw error;
    }
  }
  
  // Find a user by database ID
  static async findById(id) {
    try {
      const [rows] = await pool.query(
        'SELECT * FROM users WHERE id = ?',
        [id]
      );
      
      if (rows.length === 0) return null;
      
      // Get user's guilds
      const [guildRows] = await pool.query(
        'SELECT guildData FROM user_guilds WHERE userId = ?',
        [rows[0].id]
      );
      
      const guilds = guildRows.map(row => JSON.parse(row.guildData));
      
      // Create User instance with the data
      const user = new User({
        ...rows[0],
        guilds
      });
      
      return user;
    } catch (error) {
      console.error('Error finding user by ID:', error);
      throw error;
    }
  }
  
  // Create a new user
  static async create(data) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      // Insert user basic data
      const [result] = await connection.query(
        `INSERT INTO users 
         (discordId, username, discriminator, avatar, accessToken, refreshToken, dashboardTheme, lastLogin) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.discordId, 
          data.username, 
          data.discriminator,
          data.avatar || null,
          data.accessToken || null,
          data.refreshToken || null,
          data.dashboardTheme || 'dark',
          new Date()
        ]
      );
      
      const userId = result.insertId;
      
      // Insert guilds if any
      if (data.guilds && data.guilds.length > 0) {
        for (const guild of data.guilds) {
          await connection.query(
            'INSERT INTO user_guilds (userId, guildId, guildData) VALUES (?, ?, ?)',
            [userId, guild.id, JSON.stringify(guild)]
          );
        }
      }
      
      await connection.commit();
      
      // Return the created user instance
      return this.findById(userId);
    } catch (error) {
      await connection.rollback();
      console.error('Error creating user:', error);
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
      
      // Update user info
      await connection.query(
        `UPDATE users SET
         username = ?,
         discriminator = ?,
         avatar = ?,
         accessToken = ?,
         refreshToken = ?,
         dashboardTheme = ?,
         lastLogin = ?
         WHERE id = ?`,
        [
          this.username,
          this.discriminator,
          this.avatar,
          this.accessToken,
          this.refreshToken,
          this.dashboardTheme,
          this.lastLogin,
          this.id
        ]
      );
      
      // Handle guilds - first delete existing
      await connection.query(
        'DELETE FROM user_guilds WHERE userId = ?',
        [this.id]
      );
      
      // Then insert new ones
      if (this.guilds && this.guilds.length > 0) {
        for (const guild of this.guilds) {
          await connection.query(
            'INSERT INTO user_guilds (userId, guildId, guildData) VALUES (?, ?, ?)',
            [this.id, guild.id, JSON.stringify(guild)]
          );
        }
      }
      
      await connection.commit();
      return this;
    } catch (error) {
      await connection.rollback();
      console.error('Error saving user:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  // Static method to find or create a user
  static async findOrCreate(profile, accessToken, refreshToken) {
    console.log('findOrCreate received profile with guilds:', {
      hasGuilds: !!profile.guilds,
      guildCount: profile.guilds ? profile.guilds.length : 0
    });

    let user = await this.findOne({ discordId: profile.id });
    
    if (!user) {
      console.log('Creating new user with guilds');
      user = await this.create({
        discordId: profile.id,
        username: profile.username,
        discriminator: profile.discriminator,
        avatar: profile.avatar,
        guilds: profile.guilds || [],
        accessToken,
        refreshToken,
      });
    } else {
      console.log('Updating existing user with guilds');
      user.username = profile.username;
      user.discriminator = profile.discriminator;
      user.avatar = profile.avatar;
      user.guilds = profile.guilds || [];
      user.accessToken = accessToken;
      user.refreshToken = refreshToken;
      user.lastLogin = new Date();
      await user.save();
    }
    
    return user;
  }
}

module.exports = User;