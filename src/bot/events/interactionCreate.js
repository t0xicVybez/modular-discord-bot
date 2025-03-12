// Event handler for interactions (slash commands)
const { Guild } = require('../../database/models');

module.exports = {
    name: 'interactionCreate',
    once: false,
    async execute(interaction) {
      // Handle only slash commands
      if (!interaction.isChatInputCommand()) return;
  
      const command = interaction.client.commands.get(interaction.commandName);
  
      if (!command) {
        console.error(`[ERROR] No command matching ${interaction.commandName} was found.`);
        return;
      }
      
      try {
        // Get guild settings to check if command is disabled
        if (interaction.guildId) {
          const guildSettings = await Guild.findOne({ guildId: interaction.guildId });
          
          if (guildSettings && 
              guildSettings.settings && 
              guildSettings.settings.disabledCommands &&
              guildSettings.settings.disabledCommands.includes(interaction.commandName)) {
            // Command is disabled in this guild
            return await interaction.reply({ 
              content: `Sorry, the command \`/${interaction.commandName}\` has been disabled in this server.`, 
              ephemeral: true 
            });
          }
        }
        
        // Command is not disabled, proceed with execution
        await command.execute(interaction);
      } catch (error) {
        console.error(`[ERROR] Error executing command ${interaction.commandName}:`);
        console.error(error);
  
        // Respond to the user with an error message
        const errorMessage = { content: 'There was an error while executing this command!', ephemeral: true };
        
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(errorMessage);
        } else {
          await interaction.reply(errorMessage);
        }
      }
    },
  };