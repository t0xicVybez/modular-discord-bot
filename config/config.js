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
  
  // Database configuration
  mongoURI: process.env.MONGODB_URI,
};