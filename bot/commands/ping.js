// Simple ping command
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with Pong and latency information'),
  
  async execute(interaction) {
    // Calculate bot latency
    const sent = await interaction.reply({ content: 'Pinging...', fetchReply: true });
    const latency = sent.createdTimestamp - interaction.createdTimestamp;
    
    // Calculate WebSocket latency
    const apiLatency = Math.round(interaction.client.ws.ping);
    
    await interaction.editReply({
      content: `🏓 Pong!\n**Bot Latency:** ${latency}ms\n**API Latency:** ${apiLatency}ms`,
    });
  },
};