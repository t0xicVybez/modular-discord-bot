// Authentication routes
const express = require('express');
const passport = require('passport');
const router = express.Router();

// Login page
router.get('/login', (req, res) => {
  if (req.user) {
    return res.redirect('/dashboard');
  }
  res.render('login', { 
    title: 'Login',
    user: req.user
  });
});

// Discord OAuth2 authentication with explicit scopes
router.get('/discord', passport.authenticate('discord', { 
  scope: ['identify', 'guilds']  // Explicitly setting scopes here
}));

// Discord OAuth2 callback
router.get('/discord/callback', 
  passport.authenticate('discord', { 
    failureRedirect: '/auth/login?error=Authentication%20failed',
    scope: ['identify', 'guilds']  // And here
  }),
  (req, res) => {
    console.log("OAuth callback - user guilds:", req.user.guilds ? req.user.guilds.length : 0);
    // Successful authentication
    res.redirect('/dashboard');
  }
);

// Logout
router.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) { return next(err); }
    res.redirect('/');
  });
});

module.exports = router;