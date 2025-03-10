/**
 * Dashboard initialization module
 * Sets up Express, middleware, and routes for the web dashboard
 */

const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const path = require('path');
const { sessionSecret, mongoURI } = require('../../config/config');

/**
 * Initialize the dashboard with the Express app
 * @param {object} app - Express application
 */
function initialize(app) {
  // Configure view engine
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));

  // Set up middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(express.static(path.join(__dirname, 'public')));

  // Configure session
  app.use(
    session({
      secret: sessionSecret,
      cookie: {
        maxAge: 60000 * 60 * 24 // 1 day
      },
      resave: false,
      saveUninitialized: false,
      store: MongoStore.create({
        mongoUrl: mongoURI
      })
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