// Database setup script - creates MySQL tables for the application
require('dotenv').config();
const mysql = require('mysql2/promise');

// Get connection URL from environment
const connectionUrl = process.env.DB_CONNECTION_URL;

// Function to parse MySQL connection URL
function parseMySqlConnectionUrl(url) {
  try {
    // Expected format: mysql://username:password@hostname:port/database
    const regex = /^mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)$/;
    const matches = url.match(regex);
    
    if (!matches || matches.length < 6) {
      throw new Error('Invalid MySQL connection URL format');
    }
    
    return {
      user: matches[1],
      password: matches[2],
      host: matches[3],
      port: parseInt(matches[4], 10),
      database: matches[5]
    };
  } catch (error) {
    console.error('[DATABASE SETUP] Error parsing connection URL:', error);
    return null;
  }
}

const mysqlConfig = parseMySqlConnectionUrl(connectionUrl);

if (!mysqlConfig) {
  console.error('[DATABASE SETUP] Failed to parse MySQL connection URL');
  process.exit(1);
}

console.log('[DATABASE SETUP] Using MySQL config:', {
  host: mysqlConfig.host,
  port: mysqlConfig.port,
  user: mysqlConfig.user,
  database: mysqlConfig.database
});

// SQL statements to create tables
const CREATE_TABLES = [
  // Guilds table - Updated without default for TEXT field
  `CREATE TABLE IF NOT EXISTS guilds (
    id INT AUTO_INCREMENT PRIMARY KEY,
    guildId VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    icon VARCHAR(255),
    prefix VARCHAR(10) DEFAULT '!',
    
    /* Settings */
    welcomeEnabled BOOLEAN DEFAULT false,
    welcomeChannel VARCHAR(255) DEFAULT '',
    welcomeMessage TEXT,
    autoRoleEnabled BOOLEAN DEFAULT false,
    autoRoleId VARCHAR(255) DEFAULT '',
    
    /* Stats */
    memberCount INT DEFAULT 0,
    commandsUsed INT DEFAULT 0,
    lastActive DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    /* Timestamps */
    joinedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    /* Indexes */
    INDEX (guildId)
  )`,
  
  // Guild disabled commands table
  `CREATE TABLE IF NOT EXISTS guild_disabled_commands (
    id INT AUTO_INCREMENT PRIMARY KEY,
    guildId VARCHAR(255) NOT NULL,
    commandName VARCHAR(255) NOT NULL,
    UNIQUE KEY guild_command (guildId, commandName),
    FOREIGN KEY (guildId) REFERENCES guilds(guildId) ON DELETE CASCADE
  )`,
  
  // Guild permissions table
  `CREATE TABLE IF NOT EXISTS guild_permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    guildId VARCHAR(255) NOT NULL,
    permissionName VARCHAR(255) NOT NULL,
    roleId VARCHAR(255) NOT NULL,
    FOREIGN KEY (guildId) REFERENCES guilds(guildId) ON DELETE CASCADE
  )`,
  
  // Users table
  `CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    discordId VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(255) NOT NULL,
    discriminator VARCHAR(10) NOT NULL,
    avatar VARCHAR(255),
    accessToken TEXT,
    refreshToken TEXT,
    dashboardTheme ENUM('dark', 'light') DEFAULT 'dark',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    lastLogin DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    /* Indexes */
    INDEX (discordId)
  )`,
  
  // User guilds table
  `CREATE TABLE IF NOT EXISTS user_guilds (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    guildId VARCHAR(255) NOT NULL,
    guildData JSON,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY user_guild (userId, guildId)
  )`,
  
  // Sessions table for express-mysql-session
  `CREATE TABLE IF NOT EXISTS sessions (
    session_id VARCHAR(128) COLLATE utf8mb4_bin NOT NULL,
    expires INT(11) UNSIGNED NOT NULL,
    data MEDIUMTEXT COLLATE utf8mb4_bin,
    PRIMARY KEY (session_id)
  )`,
  // Tag Command
  `CREATE TABLE IF NOT EXISTS tags (
  id INT AUTO_INCREMENT PRIMARY KEY,
  guildId VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  pattern VARCHAR(500) NOT NULL,
  response TEXT NOT NULL,
  createdBy VARCHAR(255) NOT NULL,
  isRegex BOOLEAN DEFAULT false,
  usageCount INT DEFAULT 0,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  /* Indexes */
  INDEX (guildId),
  UNIQUE KEY guild_tag_name (guildId, name)
)`,
];

// Default values to set after table creation
const DEFAULT_VALUES = [
  `UPDATE guilds SET welcomeMessage = 'Welcome {user} to {server}!' WHERE welcomeMessage IS NULL`
];

// Function to set up database
async function setupDatabase() {
  let connection;
  
  try {
    console.log('[DATABASE SETUP] Connecting to MySQL...');
    
    // Create connection
    connection = await mysql.createConnection({
      host: mysqlConfig.host,
      port: mysqlConfig.port,
      user: mysqlConfig.user,
      password: mysqlConfig.password
    });
    
    // Check if database exists
    const [rows] = await connection.query(
      `SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?`,
      [mysqlConfig.database]
    );
    
    if (rows.length === 0) {
      console.log(`[DATABASE SETUP] Creating database: ${mysqlConfig.database}`);
      await connection.query(`CREATE DATABASE IF NOT EXISTS \`${mysqlConfig.database}\``);
    } else {
      console.log(`[DATABASE SETUP] Database ${mysqlConfig.database} already exists`);
    }
    
    // Use the database
    await connection.query(`USE \`${mysqlConfig.database}\``);
    
    // Create tables
    console.log('[DATABASE SETUP] Creating tables...');
    for (const sql of CREATE_TABLES) {
      try {
        await connection.query(sql);
        console.log('[DATABASE SETUP] Table created successfully');
      } catch (err) {
        console.error('[DATABASE SETUP] Error creating table:', err.message);
        throw err;
      }
    }
    
    // Set default values for TEXT fields
    console.log('[DATABASE SETUP] Setting default values...');
    for (const sql of DEFAULT_VALUES) {
      try {
        await connection.query(sql);
        console.log('[DATABASE SETUP] Default values set successfully');
      } catch (err) {
        console.error('[DATABASE SETUP] Error setting default values:', err.message);
      }
    }
    
    console.log('[DATABASE SETUP] Database setup completed successfully.');
  } catch (error) {
    console.error('[DATABASE SETUP] Error setting up database:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the setup
setupDatabase();
