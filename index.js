const Bot = require('./bot');
const Dashboard = require('./dashboard');
const logger = require('./bot/utils/logger');

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

async function startApplication() {
  try {
    logger.info('Starting application...');
    
    // Initialize the bot
    const bot = new Bot();
    const client = await bot.start();
    logger.info('Bot started successfully');
    
    // Initialize the dashboard
    const dashboard = new Dashboard(client);
    await dashboard.start();
    logger.info('Dashboard started successfully');
    
    logger.info('Application started successfully');
  } catch (error) {
    logger.error('Failed to start application:', error);
    process.exit(1);
  }
}

// Start the application
startApplication();