require('dotenv').config();
const { Bot } = require('./src/core/bot');

// Initialize the bot
const bot = new Bot();

// Start the bot
bot.start().catch(error => {
    console.error('Error starting bot:', error);
    process.exit(1);
});

// Handle process termination
process.on('SIGINT', () => {
    console.log('Received SIGINT. Bot is shutting down...');
    bot.shutdown().then(() => process.exit(0));
});

process.on('SIGTERM', () => {
    console.log('Received SIGTERM. Bot is shutting down...');
    bot.shutdown().then(() => process.exit(0));
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled promise rejection:', reason);
});