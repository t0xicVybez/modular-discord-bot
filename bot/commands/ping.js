const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
  // Command definition using SlashCommandBuilder
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with bot latency information'),
  
  // Command execution function
  async execute(interaction) {
    try {
      // Defer reply to give us time to respond
      await interaction.deferReply();
      
      // Calculate bot latency
      const sent = await interaction.fetchReply();
      const pingLatency = sent.createdTimestamp - interaction.createdTimestamp;
      
      // Calculate API latency
      const apiLatency = Math.round(interaction.client.ws.ping);
      
      // Create a response embed
      const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('🏓 Pong!')
        .addFields(
          { name: 'Bot Latency', value: `${pingLatency}ms`, inline: true },
          { name: 'API Latency', value: `${apiLatency}ms`, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: `Requested by ${interaction.user.tag}` });
      
      // Send response
      await interaction.editReply({ embeds: [embed] });
      logger.debug(`Ping command executed by ${interaction.user.tag} - Bot: ${pingLatency}ms, API: ${apiLatency}ms`);
    } catch (error) {
      logger.error('Error executing ping command:', error);
      
      // Handle error response
      const errorMessage = 'There was an error while executing this command!';
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: errorMessage });
      } else {
        await interaction.reply({ content: errorMessage, ephemeral: true });
      }
    }
  }
};