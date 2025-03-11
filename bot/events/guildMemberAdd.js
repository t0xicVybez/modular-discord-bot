// Event handler for when a new member joins the server
const { Guild } = require('../../database/models');

module.exports = {
  name: 'guildMemberAdd',
  once: false,
  async execute(member) {
    try {
      // Get guild settings from database
      const guildSettings = await Guild.findOne({ guildId: member.guild.id });
      
      if (!guildSettings) {
        return; // No settings for this guild
      }
      
      // Handle welcome message
      if (guildSettings.settings.welcomeEnabled) {
        // Check if a welcome channel is set
        const welcomeChannelId = guildSettings.settings.welcomeChannel;
        if (welcomeChannelId) {
          // Try to get the welcome channel
          const welcomeChannel = member.guild.channels.cache.get(welcomeChannelId);
          if (welcomeChannel) {
            // Get the welcome message template
            let welcomeMessage = guildSettings.settings.welcomeMessage || 'Welcome {user} to {server}!';
            
            // Replace variables in the welcome message
            welcomeMessage = welcomeMessage
              .replace('{user}', `<@${member.id}>`) // Mention the user
              .replace('{server}', member.guild.name) // Server name
              .replace('{count}', member.guild.memberCount); // Member count
            
            // Send the welcome message
            await welcomeChannel.send(welcomeMessage);
            console.log(`[WELCOME] Sent welcome message for ${member.user.tag} in ${member.guild.name}`);
          } else {
            console.error(`[WELCOME] Welcome channel ${welcomeChannelId} not found in guild ${member.guild.name}`);
          }
        }
      }
      
      // Handle auto-role assignment
      if (guildSettings.settings.autoRoleEnabled) {
        // Check if an auto-role is set
        const autoRoleId = guildSettings.settings.autoRoleId;
        if (autoRoleId) {
          // Try to get the role
          const role = member.guild.roles.cache.get(autoRoleId);
          if (role) {
            // Check if the bot has permission to assign roles
            const botMember = await member.guild.members.fetch(member.client.user.id);
            if (botMember.permissions.has('MANAGE_ROLES') || botMember.permissions.has('ADMINISTRATOR')) {
              // Add the role to the new member
              await member.roles.add(role);
              console.log(`[AUTO-ROLE] Assigned role ${role.name} to ${member.user.tag} in ${member.guild.name}`);
            } else {
              console.error(`[AUTO-ROLE] Bot doesn't have permission to assign roles in ${member.guild.name}`);
            }
          } else {
            console.error(`[AUTO-ROLE] Role ${autoRoleId} not found in guild ${member.guild.name}`);
          }
        }
      }
    } catch (error) {
      console.error('[MEMBER-JOIN] Error handling new member:', error);
    }
  },
};