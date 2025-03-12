// Event handler for interactions (slash commands)
const { pool } = require('../../database');

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
      // Check if command is globally disabled
      const [globalRows] = await pool.query(
        'SELECT commandName FROM global_disabled_commands WHERE commandName = ?',
        [interaction.commandName]
      );
      
      if (globalRows.length > 0) {
        return await interaction.reply({
          content: 'This command is currently disabled globally.',
          ephemeral: true
        });
      }

      // Check if command is disabled for this guild
      if (interaction.guildId) {
        const [guildRows] = await pool.query(
          'SELECT commandName FROM guild_disabled_commands WHERE guildId = ? AND commandName = ?',
          [interaction.guildId, interaction.commandName]
        );
        
        if (guildRows.length > 0) {
          return await interaction.reply({
            content: 'This command is disabled in this server.',
            ephemeral: true
          });
        }
      }

      // Log command usage for statistics
      if (interaction.guildId) {
        pool.query(
          'INSERT INTO command_usage (guildId, userId, commandName) VALUES (?, ?, ?)',
          [interaction.guildId, interaction.user.id, interaction.commandName]
        ).catch(err => console.error('Error logging command usage:', err));
      }

      // Execute the command
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