const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const database = require('./database');

// Define the scopes we need from Discord
const scopes = ['identify', 'guilds'];

// Configure the Discord strategy
passport.use(new DiscordStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: process.env.REDIRECT_URI,
    scope: scopes
}, async (accessToken, refreshToken, profile, done) => {
    try {
        // Map Discord profile to our user structure
        const user = {
            id: profile.id,
            username: profile.username,
            discriminator: profile.discriminator,
            avatar: profile.avatar,
            accessToken,
            refreshToken
        };
        
        // Save or update the user in our database
        const updatedUser = await database.upsertUser(user);
        
        // Return the user object
        return done(null, updatedUser);
    } catch (error) {
        return done(error);
    }
}));

// Serialize user to session
passport.serializeUser((user, done) => {
    done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
    try {
        const user = await database.getUser(id);
        
        if (!user) {
            return done(null, false);
        }
        
        // Add guilds to user object if they are in cache
        user.guilds = global.userGuildsCache ? global.userGuildsCache[id] : null;
        
        // Return the user
        done(null, user);
    } catch (error) {
        done(error);
    }
});

module.exports = passport;