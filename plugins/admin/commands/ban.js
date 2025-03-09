const Command = require('../../../src/structures/Command');
const { SlashCommandBuilder } = require('@discordjs/builders');
const { PermissionFlagsBits } = require('discord.js');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Helpers = require('../../../src/utils/helpers');

module.exports = new Command({
    name: 'ban',
    description: 'Ban a member from the server',
    aliases: ['banish'],
    cooldown: 5,
    guildOnly: true,
    permissions: [PermissionFlagsBits.BanMembers],
    
    // Create a slash command
    slashCommand: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Ban a member from the server')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('The user to ban')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('The reason for banning')
                .setRequired(false))
        .addIntegerOption(option => 
            option.setName('days')
                .setDescription('Number of days of messages to delete (0-7)')
                .setRequired(false)
                .setMinValue(0)
                .setMaxValue(7))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    
    // Execute traditional command
    async execute(message, args, bot) {
        if (!args.length) {
            return message.reply('You need to specify a user to ban!');
        }
        
        // Get target user
        const targetUser = await Helpers.getMemberFromMention(message.guild, args[0]);
        
        if (!targetUser) {
            return message.reply('Please mention a valid member of this server');
        }
        
        // Check if target is bannable
        if (!targetUser.bannable) {
            return message.reply("I can't ban this user! Do they have a higher role? Do I have ban permissions?");
        }
        
        // Get reason (remaining arguments)
        const reason = args.slice(1).join(' ') || 'No reason provided';
        
        // Create confirmation buttons
        const confirmButton = new ButtonBuilder()
            .setCustomId(`admin:confirm_ban:${targetUser.id}`)
            .setLabel('Confirm Ban')
            .setStyle(ButtonStyle.Danger);
            
        const cancelButton = new ButtonBuilder()
            .setCustomId(`admin:cancel_ban:${targetUser.id}`)
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Secondary);
            
        const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);
        
        // Send confirmation message
        return message.reply({
            content: `Are you sure you want to ban ${targetUser.user.tag} for reason: "${reason}"?`,
            components: [row]
        });
    },
    
    // Execute slash command
    async executeInteraction(interaction, bot) {
        const targetUser = interaction.options.getMember('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const days = interaction.options.getInteger('days') || 0;
        
        if (!targetUser) {
            return interaction.reply({ 
                content: 'Something went wrong. Could not find that user.',
                ephemeral: true
            });
        }
        
        // Check if target is bannable
        if (!targetUser.bannable) {
            return interaction.reply({ 
                content: "I can't ban this user! Do they have a higher role? Do I have ban permissions?",
                ephemeral: true
            });
        }
        
        // Create confirmation buttons
        const confirmButton = new ButtonBuilder()
            .setCustomId(`admin:confirm_ban:${targetUser.id}`)
            .setLabel('Confirm Ban')
            .setStyle(ButtonStyle.Danger);
            
        const cancelButton = new ButtonBuilder()
            .setCustomId(`admin:cancel_ban:${targetUser.id}`)
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Secondary);
            
        const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);
        
        // Send confirmation message
        return interaction.reply({
            content: `Are you sure you want to ban ${targetUser.user.tag} for reason: "${reason}"?`,
            components: [row],
            ephemeral: true
        });
    }
});