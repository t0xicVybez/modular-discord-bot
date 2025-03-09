const Command = require('../../../src/structures/Command');
const { SlashCommandBuilder } = require('@discordjs/builders');
const Helpers = require('../../../src/utils/helpers');

module.exports = new Command({
    name: 'roll',
    description: 'Roll some dice',
    aliases: ['dice'],
    cooldown: 3,
    
    // Create a slash command
    slashCommand: new SlashCommandBuilder()
        .setName('roll')
        .setDescription('Roll some dice')
        .addStringOption(option =>
            option.setName('dice')
                .setDescription('Dice to roll (e.g. 2d6, 1d20)')
                .setRequired(false)),
    
    // Execute traditional command
    async execute(message, args, bot) {
        // Default to 1d6 if no dice specified
        const diceNotation = args.length ? args[0] : '1d6';
        
        // Try to parse the dice notation
        const diceMatch = diceNotation.match(/^(\d+)d(\d+)$/);
        
        if (!diceMatch) {
            return message.reply('Invalid dice notation. Use format like `2d6` or `1d20`.');
        }
        
        const numDice = parseInt(diceMatch[1]);
        const numSides = parseInt(diceMatch[2]);
        
        // Validate dice parameters
        if (numDice < 1 || numDice > 100) {
            return message.reply('You can only roll between 1 and 100 dice at a time.');
        }
        
        if (numSides < 2 || numSides > 1000) {
            return message.reply('Dice must have between 2 and 1000 sides.');
        }
        
        // Roll the dice
        const rolls = [];
        let total = 0;
        
        for (let i = 0; i < numDice; i++) {
            const roll = Helpers.getRandomInt(1, numSides);
            rolls.push(roll);
            total += roll;
        }
        
        // Format the response
        let response = `🎲 **${message.author.username}** rolls **${diceNotation}**\n`;
        
        if (numDice > 1) {
            response += `Rolls: ${rolls.join(', ')}\n`;
            response += `Total: **${total}**`;
        } else {
            response += `Result: **${total}**`;
        }
        
        return message.reply(response);
    },
    
    // Execute slash command
    async executeInteraction(interaction, bot) {
        // Default to 1d6 if no dice specified
        const diceNotation = interaction.options.getString('dice') || '1d6';
        
        // Try to parse the dice notation
        const diceMatch = diceNotation.match(/^(\d+)d(\d+)$/);
        
        if (!diceMatch) {
            return interaction.reply({
                content: 'Invalid dice notation. Use format like `2d6` or `1d20`.',
                ephemeral: true
            });
        }
        
        const numDice = parseInt(diceMatch[1]);
        const numSides = parseInt(diceMatch[2]);
        
        // Validate dice parameters
        if (numDice < 1 || numDice > 100) {
            return interaction.reply({
                content: 'You can only roll between 1 and 100 dice at a time.',
                ephemeral: true
            });
        }
        
        if (numSides < 2 || numSides > 1000) {
            return interaction.reply({
                content: 'Dice must have between 2 and 1000 sides.',
                ephemeral: true
            });
        }
        
        // Roll the dice
        const rolls = [];
        let total = 0;
        
        for (let i = 0; i < numDice; i++) {
            const roll = Helpers.getRandomInt(1, numSides);
            rolls.push(roll);
            total += roll;
        }
        
        // Format the response
        let response = `🎲 **${interaction.user.username}** rolls **${diceNotation}**\n`;
        
        if (numDice > 1) {
            response += `Rolls: ${rolls.join(', ')}\n`;
            response += `Total: **${total}**`;
        } else {
            response += `Result: **${total}**`;
        }
        
        return interaction.reply(response);
    }
});