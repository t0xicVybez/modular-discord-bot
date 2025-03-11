// Authentication setup for Passport
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const { User } = require('../../database/models');

// Get Discord OAuth settings from environment variables
const clientId = process.env.DISCORD_CLIENT_ID || '1333299729332699196';
const clientSecret = process.env.DISCORD_SECRET;
const callbackURL = `${process.env.HTTP_EXTERNAL}/auth/discord/callback`;

// Configure Discord authentication strategy
passport.use(new DiscordStrategy({
  clientID: clientId,
  clientSecret: clientSecret,
  callbackURL: callbackURL,
  scope: ['identify', 'guilds'],
}, async (accessToken, refreshToken, profile, done) => {
  try {
    console.log('Discord profile received:', {
      id: profile.id,
      username: profile.username,
      guildsReceived: !!profile.guilds,
      guildsCount: profile.guilds ? profile.guilds.length : 0
    });
    
    // Find or create user in database
    const user = await User.findOrCreate(profile, accessToken, refreshToken);
    console.log('User after findOrCreate:', {
      id: user.id,
      discordId: user.discordId,
      guildsStored: !!user.guilds,
      guildsCount: user.guilds ? user.guilds.length : 0
    });
    
    return done(null, user);
  } catch (error) {
    console.error('Auth strategy error:', error);
    return done(error, null);
  }
}));

// Serialize user to session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;
