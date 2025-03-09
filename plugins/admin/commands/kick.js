const Command = require('../../../src/structures/Command');
const { SlashCommandBuilder } = require('@discordjs/builders');
const { PermissionFlagsBits } = require('discord.js');

module.exports = new Command({
    name: 'clear',
    description: 'Clear messages from a channel',
    aliases: ['purge', 'prune'],
    cooldown: 5,
    guildOnly: true,
    permissions: [PermissionFlagsBits.ManageMessages],
    
    // Create a slash command
    slashCommand: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Clear messages from a channel')
        .addIntegerOption(option => 
            option.setName('amount')
                .setDescription('Number of messages to delete (1-99)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(99))
        .addUserOption(option => 
            option.setName('user')
                .setDescription('Only delete messages from this user')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    
    // Execute traditional command
    async execute(message, args, bot) {
        if (!args.length) {
            return message.reply('You need to specify how many messages to delete!');
        }
        
        const amount = parseInt(args[0]);
        
        if (isNaN(amount)) {
            return message.reply('Please provide a valid number');
        }
        
        if (amount < 1 || amount > 99) {
            return message.reply('You need to specify a number between 1 and 99');
        }
        
        // Delete the command message
        await message.delete();
        
        // Check if a user was mentioned
        let targetUser = null;
        if (args[1]) {
            const userMention = args[1];
            // Extract user ID from mention
            const matches = userMention.match(/^<@!?(\d+)>$/);
            if (matches) {
                targetUser = matches[1];
            }
        }
        
        try {
            // Fetch messages
            const messages = await message.channel.messages.fetch({ limit: 100 });
            
            let messagesToDelete;
            if (targetUser) {
                // Filter messages by the specified user
                messagesToDelete = messages
                    .filter(msg => msg.author.id === targetUser)
                    .first(amount);
            } else {
                // Get messages to delete without filtering
                messagesToDelete = messages.first(amount);
            }
            
            // Bulk delete messages
            const deleted = await message.channel.bulkDelete(messagesToDelete, true);
            
            // Send confirmation message
            const confirmation = await message.channel.send(
                `Successfully deleted ${deleted.size} message${deleted.size === 1 ? '' : 's'}`
            );
            
            // Delete confirmation message after a few seconds
            setTimeout(() => {
                confirmation.delete().catch(err => {
                    bot.logger.error('Error deleting confirmation message:', err);
                });
            }, 5000);
            
        } catch (error) {
            bot.logger.error('Error clearing messages:', error);
            return message.channel.send(
                'There was an error trying to clear messages. Messages older than 14 days cannot be bulk deleted.'
            );
        }
    },
    
    // Execute slash command
    async executeInteraction(interaction, bot) {
        const amount = interaction.options.getInteger('amount');
        const targetUser = interaction.options.getUser('user');
        
        await interaction.deferReply({ ephemeral: true });
        
        try {
            // Fetch messages
            const messages = await interaction.channel.messages.fetch({ limit: 100 });
            
            let messagesToDelete;
            if (targetUser) {
                // Filter messages by the specified user
                messagesToDelete = messages
                    .filter(msg => msg.author.id === targetUser.id)
                    .first(amount);
            } else {
                // Get messages to delete without filtering
                messagesToDelete = messages.first(amount);
            }
            
            // Bulk delete messages
            const deleted = await interaction.channel.bulkDelete(messagesToDelete, true);
            
            // Send confirmation message
            await interaction.editReply({
                content: `Successfully deleted ${deleted.size} message${deleted.size === 1 ? '' : 's'}`,
                ephemeral: true
            });
            
        } catch (error) {
            bot.logger.error('Error clearing messages:', error);
            await interaction.editReply({
                content: 'There was an error trying to clear messages. Messages older than 14 days cannot be bulk deleted.',
                ephemeral: true
            });
        }
    }
});