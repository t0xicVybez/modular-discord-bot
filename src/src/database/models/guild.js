// Guild model - for storing Discord server configuration
const mongoose = require('mongoose');

const guildSchema = new mongoose.Schema({
  // Discord guild ID
  guildId: {
    type: String,
    required: true,
    unique: true,
  },
  // Guild name
  name: {
    type: String,
    required: true,
  },
  // Guild icon
  icon: {
    type: String,
  },
  // Bot prefix (for message commands if enabled)
  prefix: {
    type: String,
    default: '!',
  },
  // Bot settings
  settings: {
    // Whether welcome messages are enabled
    welcomeEnabled: {
      type: Boolean,
      default: false,
    },
    // Channel ID for welcome messages
    welcomeChannel: {
      type: String,
      default: '',
    },
    // Welcome message template
    welcomeMessage: {
      type: String,
      default: 'Welcome {user} to {server}!',
    },
    // Whether auto roles are enabled
    autoRoleEnabled: {
      type: Boolean,
      default: false,
    },
    // Role ID for auto role
    autoRoleId: {
      type: String,
      default: '',
    },
    // Disabled commands
    disabledCommands: {
      type: [String],
      default: [],
    },
    // Custom permission settings
    permissions: {
      type: Map,
      of: [String], // Array of role IDs for each permission
      default: new Map(),
    },
  },
  // Statistics
  stats: {
    // Member count
    memberCount: {
      type: Number,
      default: 0,
    },
    // Command usage count
    commandsUsed: {
      type: Number,
      default: 0,
    },
    // Last time the bot was used
    lastActive: {
      type: Date,
      default: Date.now,
    },
  },
  // Date the bot was added to the guild
  joinedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Method to update guild statistics
guildSchema.methods.updateStats = async function(memberCount) {
  this.stats.memberCount = memberCount;
  this.stats.lastActive = Date.now();
  this.stats.commandsUsed += 1;
  return this.save();
};

// Static method to find or create a guild
guildSchema.statics.findOrCreate = async function(guildData) {
  let guild = await this.findOne({ guildId: guildData.id });
  
  if (!guild) {
    guild = await this.create({
      guildId: guildData.id,
      name: guildData.name,
      icon: guildData.icon,
      stats: {
        memberCount: guildData.memberCount || 0,
      },
    });
  } else {
    // Update guild with new data
    guild.name = guildData.name;
    guild.icon = guildData.icon;
    guild.stats.memberCount = guildData.memberCount || guild.stats.memberCount;
    await guild.save();
  }
  
  return guild;
};

module.exports = mongoose.model('Guild', guildSchema);