// Database connection setup for MySQL
const mysql = require('mysql2/promise');
const { mysqlConfig } = require('../../config/config');

// Create a connection pool
const pool = mysql.createPool({
  host: mysqlConfig.host,
  user: mysqlConfig.user,
  password: mysqlConfig.password,
  database: mysqlConfig.database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Connect to MySQL
async function connect() {
  try {
    // Test the connection
    const connection = await pool.getConnection();
    console.log('[DATABASE] Connected to MySQL successfully');
    connection.release();
    
    // Handle connection events
    pool.on('error', (err) => {
      console.error(`[DATABASE] MySQL connection error: ${err}`);
      
      // Attempt reconnection if the error is related to the connection being terminated
      if (err.code === 'PROTOCOL_CONNECTION_LOST') {
        console.warn('[DATABASE] MySQL connection lost. Attempting to reconnect...');
        // The pool will automatically handle reconnection
      }
    });
    
    // Set up ping interval to keep connection alive
    setInterval(async () => {
      try {
        const connection = await pool.getConnection();
        await connection.ping();
        connection.release();
      } catch (err) {
        console.error(`[DATABASE] Ping error: ${err}`);
      }
    }, 60000); // Ping every minute
    
    return pool;
  } catch (err) {
    console.error(`[DATABASE] Failed to connect to MySQL: ${err}`);
    process.exit(1); // Exit with failure
  }
}

module.exports = {
  connect,
  pool
};