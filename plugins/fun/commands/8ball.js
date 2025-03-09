const Command = require('../../../src/structures/Command');
const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const Helpers = require('../../../src/utils/helpers');

module.exports = new Command({
    name: '8ball',
    description: 'Ask the magic 8-ball a question',
    aliases: ['8b', 'magic8'],
    cooldown: 3,
    
    // Create a slash command
    slashCommand: new SlashCommandBuilder()
        .setName('8ball')
        .setDescription('Ask the magic 8-ball a question')
        .addStringOption(option =>
            option.setName('question')
                .setDescription('The question to ask')
                .setRequired(true)),
    
    // Possible responses
    responses: [
        // Affirmative
        'It is certain.',
        'It is decidedly so.',
        'Without a doubt.',
        'Yes, definitely.',
        'You may rely on it.',
        'As I see it, yes.',
        'Most likely.',
        'Outlook good.',
        'Yes.',
        'Signs point to yes.',
        
        // Non-committal
        'Reply hazy, try again.',
        'Ask again later.',
        'Better not tell you now.',
        'Cannot predict now.',
        'Concentrate and ask again.',
        
        // Negative
        'Don\'t count on it.',
        'My reply is no.',
        'My sources say no.',
        'Outlook not so good.',
        'Very doubtful.'
    ],
    
    // Execute traditional command
    async execute(message, args, bot) {
        if (!args.length) {
            return message.reply('You need to ask a question!');
        }
        
        const question = args.join(' ');
        const response = this.responses[Helpers.getRandomInt(0, this.responses.length - 1)];
        
        const embed = new EmbedBuilder()
            .setColor('#1E90FF')
            .setTitle('🎱 Magic 8-Ball')
            .addFields(
                { name: 'Question', value: question },
                { name: 'Answer', value: response }
            )
            .setFooter({ text: `Asked by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
            .setTimestamp();
        
        return message.reply({ embeds: [embed] });
    },
    
    // Execute slash command
    async executeInteraction(interaction, bot) {
        const question = interaction.options.getString('question');
        const response = this.responses[Helpers.getRandomInt(0, this.responses.length - 1)];
        
        const embed = new EmbedBuilder()
            .setColor('#1E90FF')
            .setTitle('🎱 Magic 8-Ball')
            .addFields(
                { name: 'Question', value: question },
                { name: 'Answer', value: response }
            )
            .setFooter({ text: `Asked by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp();
        
        return interaction.reply({ embeds: [embed] });
    }
});