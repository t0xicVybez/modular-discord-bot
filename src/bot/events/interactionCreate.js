const logger = require('../utils/logger');

module.exports = {
  name: 'interactionCreate',
  once: false,
  async execute(interaction) {
    // Ignore interactions that aren't commands
    if (!interaction.isCommand()) return;
    
    // Get command from the collection
    const command = interaction.client.commands.get(interaction.commandName);
    
    // Handle case where command doesn't exist
    if (!command) {
      logger.warn(`User ${interaction.user.tag} tried to execute unknown command: ${interaction.commandName}`);
      return interaction.reply({ 
        content: 'This command doesn\'t exist or is no longer available.',
        ephemeral: true 
      });
    }
    
    // Execute the command
    try {
      logger.info(`User ${interaction.user.tag} executed command: ${interaction.commandName}`);
      await command.execute(interaction);
    } catch (error) {
      logger.error(`Error executing command ${interaction.commandName}:`, error);
      
      // Respond to the user
      const errorMessage = 'There was an error while executing this command!';
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: errorMessage, ephemeral: true });
      } else {
        await interaction.reply({ content: errorMessage, ephemeral: true });
      }
    }
  }
};