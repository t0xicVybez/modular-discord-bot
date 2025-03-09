require('dotenv').config();

module.exports = {
  // Discord Bot Configuration
  bot: {
    token: process.env.BOT_TOKEN,
    clientId: process.env.CLIENT_ID,
    guildId: process.env.GUILD_ID
  },
  
  // Database Configuration
  database: {
    type: process.env.DB_TYPE || 'sqlite',
    sqlite: {
      path: process.env.SQLITE_PATH || './database.sqlite'
    },
    mysql: {
      host: process.env.MYSQL_HOST || 'localhost',
      port: parseInt(process.env.MYSQL_PORT) || 3306,
      username: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || 'password',
      database: process.env.MYSQL_DATABASE || 'discord_bot'
    }
  },
  
  // Web Dashboard Configuration
  dashboard: {
    port: parseInt(process.env.PORT) || 3000,
    sessionSecret: process.env.SESSION_SECRET || 'keyboard cat',
    callbackURL: process.env.CALLBACK_URL || 'http://localhost:3000/auth/discord/callback',
    clientSecret: process.env.CLIENT_SECRET
  },
  
  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  }
};