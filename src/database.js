const { Sequelize } = require('sequelize');
const config = require('./config');
const logger = require('./bot/utils/logger');

let sequelize;

// Initialize database connection based on config
if (config.database.type === 'sqlite') {
  logger.info('Using SQLite database');
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: config.database.sqlite.path,
    logging: msg => logger.debug(msg)
  });
} else if (config.database.type === 'mysql') {
  logger.info('Using MySQL database');
  sequelize = new Sequelize(
    config.database.mysql.database,
    config.database.mysql.username,
    config.database.mysql.password,
    {
      host: config.database.mysql.host,
      port: config.database.mysql.port,
      dialect: 'mysql',
      logging: msg => logger.debug(msg)
    }
  );
} else {
  throw new Error(`Unsupported database type: ${config.database.type}`);
}

// Define models
const Guild = sequelize.define('Guild', {
  id: {
    type: Sequelize.STRING,
    primaryKey: true
  },
  name: Sequelize.STRING,
  prefix: {
    type: Sequelize.STRING,
    defaultValue: '!'
  },
  welcomeChannelId: Sequelize.STRING,
  welcomeMessage: Sequelize.TEXT
});

// Test database connection
async function init() {
  try {
    await sequelize.authenticate();
    logger.info('Database connection established successfully');
    
    // Sync all models
    // NOTE: In production, you might want to use migrations instead
    await sequelize.sync();
    logger.info('Database models synchronized');
    
    return true;
  } catch (error) {
    logger.error('Unable to connect to the database:', error);
    return false;
  }
}

module.exports = {
  sequelize,
  models: {
    Guild
  },
  init
};