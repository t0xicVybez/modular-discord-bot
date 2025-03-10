// User model - for storing Discord user data
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  discordId: {
    type: String,
    required: true,
    unique: true,
  },
  username: {
    type: String,
    required: true,
  },
  discriminator: {
    type: String,
    required: true,
  },
  avatar: {
    type: String,
  },
  guilds: [{
    type: Object, // Stores guild data from Discord API
  }],
  // Store Discord access tokens securely
  accessToken: {
    type: String,
  },
  refreshToken: {
    type: String,
  },
  // Additional user preferences
  dashboardTheme: {
    type: String,
    enum: ['dark', 'light'],
    default: 'dark',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  lastLogin: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Static method to find or create a user
userSchema.statics.findOrCreate = async function(profile, accessToken, refreshToken) {
  console.log('findOrCreate received profile with guilds:', {
    hasGuilds: !!profile.guilds,
    guildCount: profile.guilds ? profile.guilds.length : 0
  });

  let user = await this.findOne({ discordId: profile.id });
  
  if (!user) {
    console.log('Creating new user with guilds');
    user = await this.create({
      discordId: profile.id,
      username: profile.username,
      discriminator: profile.discriminator,
      avatar: profile.avatar,
      guilds: profile.guilds || [], // Save guilds from profile
      accessToken,
      refreshToken,
    });
  } else {
    console.log('Updating existing user with guilds');
    user.username = profile.username;
    user.discriminator = profile.discriminator;
    user.avatar = profile.avatar;
    user.guilds = profile.guilds || []; // Update guilds
    user.accessToken = accessToken;
    user.refreshToken = refreshToken;
    user.lastLogin = Date.now();
    await user.save();
  }
  
  return user;
};

module.exports = mongoose.model('User', userSchema);