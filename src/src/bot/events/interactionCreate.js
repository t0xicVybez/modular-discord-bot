// Event handler for interactions (slash commands)
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