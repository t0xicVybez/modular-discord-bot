// Database connection setup
const mongoose = require('mongoose');
const { mongoURI } = require('../../config/config');

// Connection options
const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
};

// Connect to MongoDB
async function connect() {
  try {
    await mongoose.connect(mongoURI, options);
    console.log('[DATABASE] Connected to MongoDB successfully');
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error(`[DATABASE] MongoDB connection error: ${err}`);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.warn('[DATABASE] MongoDB disconnected. Attempting to reconnect...');
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('[DATABASE] MongoDB reconnected successfully');
    });
    
    return mongoose.connection;
  } catch (err) {
    console.error(`[DATABASE] Failed to connect to MongoDB: ${err}`);
    process.exit(1); // Exit with failure
  }
}

module.exports = {
  connect,
  connection: mongoose.connection,
};