// Configuration settings for the application
require('dotenv').config();

module.exports = {
  // Bot configuration
  botToken: process.env.BOT_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID,
  
  // Dashboard configuration
  port: process.env.PORT || 3000,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: process.env.CALLBACK_URL,
  sessionSecret: process.env.SESSION_SECRET || 'a_very_secret_key',
  
  // MySQL configuration
  mysqlConfig: {
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'discord_bot',
    port: process.env.MYSQL_PORT || 3306,
  },
};