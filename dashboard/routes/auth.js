const express = require('express');
const passport = require('passport');
const router = express.Router();
const logger = require('../../bot/utils/logger');

// Authentication middleware to check if user is logged in
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  
  // Store the original URL for redirection after login
  req.session.returnTo = req.originalUrl;
  res.redirect('/auth/login');
};

// Login route - redirects to Discord OAuth
router.get('/login', (req, res, next) => {
  // Store the return URL if provided
  if (req.query.returnTo) {
    req.session.returnTo = req.query.returnTo;
  }
  
  passport.authenticate('discord', {
    scope: ['identify', 'guilds']
  })(req, res, next);
});

// Discord OAuth callback
router.get('/discord/callback', 
  passport.authenticate('discord', { 
    failureRedirect: '/?error=Unable to authorize with Discord' 
  }),
  (req, res) => {
    logger.info(`User logged in: ${req.user.username}#${req.user.discriminator}`);
    
    // Redirect to originally requested URL or dashboard
    const redirectTo = req.session.returnTo || '/dashboard';
    delete req.session.returnTo;
    res.redirect(redirectTo);
  }
);

// Logout route
router.get('/logout', (req, res) => {
  if (req.user) {
    logger.info(`User logged out: ${req.user.username}#${req.user.discriminator}`);
    req.logout(err => {
      if (err) {
        logger.error('Error during logout:', err);
      }
      res.redirect('/?loggedOut=true');
    });
  } else {
    res.redirect('/');
  }
});

module.exports = {
  router,
  isAuthenticated
};