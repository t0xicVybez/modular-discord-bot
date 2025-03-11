// Database setup script - creates MySQL tables for the application
require('dotenv').config();
const mysql = require('mysql2/promise');
const { mysqlConfig } = require('../../config/config');

// SQL statements to create tables
const CREATE_TABLES = [
  // Guilds table
  `CREATE TABLE IF NOT EXISTS guilds (
    id INT AUTO_INCREMENT PRIMARY KEY,
    guildId VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    icon VARCHAR(255),
    prefix VARCHAR(10) DEFAULT '!',
    
    /* Settings */
    welcomeEnabled BOOLEAN DEFAULT false,
    welcomeChannel VARCHAR(255) DEFAULT '',
    welcomeMessage TEXT DEFAULT 'Welcome {user} to {server}!',
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
    guildData JSON NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY user_guild (userId, guildId)
  )`
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
    
    // Create database if it doesn't exist
    console.log(`[DATABASE SETUP] Creating database: ${mysqlConfig.database}`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${mysqlConfig.database}`);
    
    // Use the database
    await connection.query(`USE ${mysqlConfig.database}`);
    
    // Create tables
    console.log('[DATABASE SETUP] Creating tables...');
    for (const sql of CREATE_TABLES) {
      await connection.query(sql);
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