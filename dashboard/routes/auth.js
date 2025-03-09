const express = require('express');
const passport = require('passport');
const router = express.Router();

/**
 * @route GET /auth/login
 * @desc Redirect to Discord OAuth2 login
 */
router.get('/login', (req, res, next) => {
    // Set returnTo path in session
    if (!req.session.returnTo && req.headers.referer) {
        const refererUrl = new URL(req.headers.referer);
        if (refererUrl.hostname === req.hostname) {
            req.session.returnTo = refererUrl.pathname;
        }
    }
    
    passport.authenticate('discord')(req, res, next);
});

/**
 * @route GET /auth/discord/callback
 * @desc Handle Discord OAuth2 callback
 */
router.get('/discord/callback', 
    passport.authenticate('discord', { 
        failureRedirect: '/auth/login-failed' 
    }),
    (req, res) => {
        // Redirect to the returnTo path or home
        const redirectUrl = req.session.returnTo || '/';
        delete req.session.returnTo;
        res.redirect(redirectUrl);
    }
);

/**
 * @route GET /auth/logout
 * @desc Log out the user
 */
router.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            console.error('Error during logout:', err);
        }
        res.redirect('/');
    });
});

/**
 * @route GET /auth/login-failed
 * @desc Display login failure page
 */
router.get('/login-failed', (req, res) => {
    res.render('error', {
        title: 'Login Failed',
        message: 'Failed to authenticate with Discord. Please try again.',
        status: 401
    });
});

module.exports = router;