/**
 * Dashboard initialization module
 * Sets up Express, middleware, and routes for the web dashboard
 */

const express = require('express');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const passport = require('passport');
const path = require('path');
const fs = require('fs');
const { sessionSecret, mysqlConfig } = require('../../config/config');

/**
 * Initialize the dashboard with the Express app
 * @param {object} app - Express application
 */
function initialize(app) {
  // Configure view engine
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));
  
  // Configure EJS
  const ejs = require('ejs');
  app.engine('ejs', (filePath, options, callback) => {
    // Read the file
    fs.readFile(filePath, 'utf8', (err, content) => {
      if (err) return callback(err);
      
      // Render the file
      try {
        const rendered = ejs.render(content, options, {
          filename: filePath,
          async: false
        });
        return callback(null, rendered);
      } catch (err) {
        return callback(err);
      }
    });
  });

  // Set up middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(express.static(path.join(__dirname, 'public')));

  // Configure session with MySQL store
  const sessionStore = new MySQLStore({
    host: mysqlConfig.host,
    port: mysqlConfig.port,
    user: mysqlConfig.user,
    password: mysqlConfig.password,
    database: mysqlConfig.database,
    clearExpired: true,
    checkExpirationInterval: 900000, // 15 minutes
    expiration: 86400000, // 1 day
    createDatabaseTable: true,
  });

  app.use(
    session({
      secret: sessionSecret,
      cookie: {
        maxAge: 86400000 // 1 day
      },
      resave: false,
      saveUninitialized: false,
      store: sessionStore
    })
  );

  // Initialize Passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure Passport
  require('./middleware/auth');

  // Import routes
  const indexRoutes = require('./routes/index');
  const authRoutes = require('./routes/auth');
  const dashboardRoutes = require('./routes/dashboard');
  const apiRoutes = require('./routes/api');

  // Use routes
  app.use('/', indexRoutes);
  app.use('/auth', authRoutes);
  app.use('/dashboard', dashboardRoutes);
  app.use('/api', apiRoutes);

  // Error handling middleware
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('error', { 
      title: 'Error',
      user: req.user,
      error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong!'
    });
  });
  
  console.log('[DASHBOARD] Initialized successfully');
}

module.exports = { initialize };