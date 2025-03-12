// Event handler for when a new member joins a guild
const { Guild } = require('../../database/models');

module.exports = {
  name: 'guildMemberAdd',
  once: false,
  async execute(member) {
    try {
      // Get guild settings
      const guildSettings = await Guild.findOne({ guildId: member.guild.id });
      
      if (!guildSettings) return;
      
      // Handle welcome message
      if (guildSettings.settings.welcomeEnabled && guildSettings.settings.welcomeChannel) {
        const channel = member.guild.channels.cache.get(guildSettings.settings.welcomeChannel);
        
        if (channel) {
          // Format welcome message with variables
          let welcomeMessage = guildSettings.settings.welcomeMessage || 'Welcome {user} to {server}!';
          welcomeMessage = welcomeMessage
            .replace('{user}', `<@${member.id}>`)
            .replace('{server}', member.guild.name)
            .replace('{count}', member.guild.memberCount);
          
          await channel.send(welcomeMessage);
          console.log(`[BOT] Sent welcome message for ${member.user.tag} in ${member.guild.name}`);
        }
      }
      
      // Handle auto role
      if (guildSettings.settings.autoRoleEnabled && guildSettings.settings.autoRoleId) {
        try {
          const role = member.guild.roles.cache.get(guildSettings.settings.autoRoleId);
          
          if (role) {
            await member.roles.add(role);
            console.log(`[BOT] Added auto role to ${member.user.tag} in ${member.guild.name}`);
          }
        } catch (roleError) {
          console.error(`[ERROR] Failed to add auto role: ${roleError}`);
        }
      }
      
      // Update guild stats
      guildSettings.stats.memberCount = member.guild.memberCount;
      await guildSettings.save();
      
    } catch (error) {
      console.error(`[ERROR] Error in guildMemberAdd event: ${error}`);
    }
  },
};