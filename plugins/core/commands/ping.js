const Command = require('../../../src/structures/Command');
const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');

module.exports = new Command({
    name: 'ping',
    description: 'Check bot latency and response time',
    aliases: ['latency'],
    cooldown: 5,
    
    // Create a slash command
    slashCommand: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Check bot latency and response time'),
    
    // Execute traditional command
    async execute(message, args, bot) {
        // Send initial message
        const sent = await message.reply('Pinging...');
        
        // Calculate round-trip latency
        const roundtrip = sent.createdTimestamp - message.createdTimestamp;
        
        // Get WebSocket latency
        const websocket = bot.client.ws.ping;
        
        // Create embed
        const embed = new EmbedBuilder()
            .setColor('#1E90FF')
            .setTitle('🏓 Pong!')
            .addFields(
                { name: 'Round-trip Latency', value: `${roundtrip}ms`, inline: true },
                { name: 'WebSocket Latency', value: `${websocket}ms`, inline: true }
            )
            .setFooter({ text: bot.client.user.username, iconURL: bot.client.user.displayAvatarURL() })
            .setTimestamp();
        
        // Edit the initial message with the embed
        await sent.edit({ content: null, embeds: [embed] });
    },
    
    // Execute slash command
    async executeInteraction(interaction, bot) {
        // Defer the reply
        await interaction.deferReply();
        
        // Calculate API latency
        const sent = await interaction.fetchReply();
        const roundtrip = sent.createdTimestamp - interaction.createdTimestamp;
        
        // Get WebSocket latency
        const websocket = bot.client.ws.ping;
        
        // Create embed
        const embed = new EmbedBuilder()
            .setColor('#1E90FF')
            .setTitle('🏓 Pong!')
            .addFields(
                { name: 'Round-trip Latency', value: `${roundtrip}ms`, inline: true },
                { name: 'WebSocket Latency', value: `${websocket}ms`, inline: true }
            )
            .setFooter({ text: bot.client.user.username, iconURL: bot.client.user.displayAvatarURL() })
            .setTimestamp();
        
        // Edit the reply with the embed
        await interaction.editReply({ embeds: [embed] });
    }
});