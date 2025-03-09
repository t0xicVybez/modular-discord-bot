const express = require('express');
const session = require('express-session');
const SequelizeStore = require('connect-session-sequelize')(session.Store);
const passport = require('passport');
const path = require('path');
const { Strategy } = require('passport-discord');
const config = require('../config');
const { sequelize } = require('../database');
const logger = require('../bot/utils/logger');

// Import routes
const indexRoutes = require('./routes/index');
const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/api');

class Dashboard {
  constructor(client) {
    this.app = express();
    this.client = client;
    
    // Configure session store
    this.sessionStore = new SequelizeStore({
      db: sequelize,
      table: 'Session'
    });
  }
  
  setupMiddleware() {
    // Set the view engine to EJS
    this.app.set('view engine', 'ejs');
    this.app.set('views', path.join(__dirname, 'views'));
    
    // Set up static file serving
    this.app.use(express.static(path.join(__dirname, 'public')));
    
    // Parse request bodies
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    
    // Set up sessions
    this.app.use(session({
      secret: config.dashboard.sessionSecret,
      store: this.sessionStore,
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 // 1 day
      }
    }));
    
    // Initialize passport for authentication
    this.app.use(passport.initialize());
    this.app.use(passport.session());
    
    // Make the client available to routes
    this.app.use((req, res, next) => {
      req.client = this.client;
      next();
    });
  }
  
  setupPassport() {
    // Set up Discord authentication strategy
    passport.use(new Strategy({
      clientID: config.bot.clientId,
      clientSecret: config.dashboard.clientSecret,
      callbackURL: config.dashboard.callbackURL,
      scope: ['identify', 'guilds']
    }, (accessToken, refreshToken, profile, done) => {
      // We're not storing users in the database, just in the session
      return done(null, profile);
    }));
    
    // Serialize user for session
    passport.serializeUser((user, done) => {
      done(null, user);
    });
    
    // Deserialize user from session
    passport.deserializeUser((user, done) => {
      done(null, user);
    });
  }
  
  setupRoutes() {
    // Main routes
    this.app.use('/', indexRoutes);
    this.app.use('/auth', authRoutes);
    this.app.use('/api', apiRoutes);
    
    // Error handling middleware
    this.app.use((err, req, res, next) => {
      logger.error('Dashboard error:', err);
      res.status(500).render('error', {
        title: 'Error',
        message: 'An internal server error occurred',
        error: process.env.NODE_ENV === 'development' ? err : {}
      });
    });
    
    // 404 handler
    this.app.use((req, res) => {
      res.status(404).render('error', {
        title: 'Not Found',
        message: 'The page you were looking for could not be found',
        error: {}
      });
    });
  }
  
  async start() {
    try {
      // Set up middleware, passport, and routes
      this.setupMiddleware();
      this.setupPassport();
      this.setupRoutes();
      
      // Sync session store with database
      await this.sessionStore.sync();
      
      // Start the server
      const port = config.dashboard.port;
      this.server = this.app.listen(port, () => {
        logger.info(`Dashboard is running on port ${port}`);
      });
      
      return this.server;
    } catch (error) {
      logger.error('Failed to start dashboard:', error);
      throw error;
    }
  }
  
  async stop() {
    if (this.server) {
      this.server.close();
      logger.info('Dashboard server stopped');
    }
  }
}

module.exports = Dashboard;