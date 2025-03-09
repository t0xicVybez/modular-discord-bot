const Command = require('../../../src/structures/Command');
const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const db = require('../../../src/utils/database');

module.exports = new Command({
    name: 'help',
    description: 'Display help information for commands',
    aliases: ['commands', 'h'],
    cooldown: 5,
    
    // Create a slash command
    slashCommand: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Display help information for commands')
        .addStringOption(option =>
            option.setName('command')
                .setDescription('Get help for a specific command')
                .setRequired(false)),
    
    // Execute traditional command
    async execute(message, args, bot) {
        // Get guild prefix or use default
        let prefix = bot.config.defaultPrefix;
        if (message.guild) {
            try {
                const settings = await db.getGuildSettings(message.guild.id);
                prefix = settings.prefix;
            } catch (error) {
                bot.logger.error('Error getting guild settings:', error);
            }
        }
        
        // If no args, show all commands
        if (!args.length) {
            return this.sendCommandList(message, prefix, bot);
        }
        
        // Get command name
        const commandName = args[0].toLowerCase();
        
        // Find the command
        const command = bot.commandHandler.commands.get(commandName) || 
                       bot.commandHandler.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));
        
        if (!command) {
            return message.reply(`Command not found: \`${commandName}\``);
        }
        
        return this.sendCommandHelp(message, command, prefix);
    },
    
    // Execute slash command
    async executeInteraction(interaction, bot) {
        const commandName = interaction.options.getString('command');
        
        // Get guild prefix or use default
        let prefix = bot.config.defaultPrefix;
        if (interaction.guild) {
            try {
                const settings = await db.getGuildSettings(interaction.guild.id);
                prefix = settings.prefix;
            } catch (error) {
                bot.logger.error('Error getting guild settings:', error);
            }
        }
        
        // If no command specified, show all commands
        if (!commandName) {
            return this.sendCommandListInteraction(interaction, prefix, bot);
        }
        
        // Find the command
        const command = bot.commandHandler.commands.get(commandName) || 
                       bot.commandHandler.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));
        
        if (!command) {
            return interaction.reply({
                content: `Command not found: \`${commandName}\``,
                ephemeral: true
            });
        }
        
        return this.sendCommandHelpInteraction(interaction, command, prefix);
    },
    
    /**
     * Send a list of all commands
     * @param {Message} message - The message object
     * @param {string} prefix - The command prefix
     * @param {Bot} bot - The bot instance
     * @returns {Promise<Message>} - The sent message
     */
    async sendCommandList(message, prefix, bot) {
        // Group commands by plugin
        const pluginCommands = {};
        
        for (const [, command] of bot.commandHandler.commands) {
            if (!pluginCommands[command.plugin]) {
                pluginCommands[command.plugin] = [];
            }
            
            pluginCommands[command.plugin].push(command);
        }
        
        // Create the embed
        const embed = new EmbedBuilder()
            .setColor('#1E90FF')
            .setTitle('Command Help')
            .setDescription(`Use \`${prefix}help [command]\` to get detailed information about a specific command.`)
            .setFooter({ text: `${bot.client.user.username} | Total Commands: ${bot.commandHandler.commands.size}` })
            .setTimestamp();
        
        // Add plugin sections
        for (const [pluginName, commands] of Object.entries(pluginCommands)) {
            // Get plugin info
            const plugin = bot.pluginManager.plugins.get(pluginName);
            const pluginTitle = plugin ? 
                `${pluginName} v${plugin.version}` : 
                pluginName;
            
            // Sort commands alphabetically
            commands.sort((a, b) => a.name.localeCompare(b.name));
            
            // Format command list
            const commandList = commands
                .map(cmd => `\`${cmd.name}\``)
                .join(', ');
            
            embed.addFields({ name: pluginTitle, value: commandList });
        }
        
        return message.reply({ embeds: [embed] });
    },
    
    /**
     * Send detailed help for a specific command
     * @param {Message} message - The message object
     * @param {Command} command - The command object
     * @param {string} prefix - The command prefix
     * @returns {Promise<Message>} - The sent message
     */
    async sendCommandHelp(message, command, prefix) {
        const embed = new EmbedBuilder()
            .setColor('#1E90FF')
            .setTitle(`Command: ${command.name}`)
            .setDescription(command.description || 'No description available')
            .addFields(
                { name: 'Usage', value: `\`${prefix}${command.name}\`` },
                { name: 'Plugin', value: command.plugin || 'Unknown', inline: true },
                { name: 'Cooldown', value: `${command.cooldown || 3} second(s)`, inline: true }
            );
        
        // Add aliases if any
        if (command.aliases && command.aliases.length) {
            embed.addFields({ name: 'Aliases', value: command.aliases.map(a => `\`${a}\``).join(', '), inline: true });
        }
        
        // Add permissions if any
        if (command.permissions && command.permissions.length) {
            embed.addFields({ 
                name: 'Required Permissions', 
                value: command.permissions.join(', '),
                inline: true
            });
        }
        
        // Add guild only info
        if (command.guildOnly) {
            embed.addFields({ name: 'Server Only', value: 'Yes', inline: true });
        }
        
        // Add owner only info
        if (command.ownerOnly) {
            embed.addFields({ name: 'Owner Only', value: 'Yes', inline: true });
        }
        
        return message.reply({ embeds: [embed] });
    },
    
    /**
     * Send a list of all commands (slash command version)
     * @param {CommandInteraction} interaction - The interaction object
     * @param {string} prefix - The command prefix
     * @param {Bot} bot - The bot instance
     * @returns {Promise<void>} - The sent message
     */
    async sendCommandListInteraction(interaction, prefix, bot) {
        // Group commands by plugin
        const pluginCommands = {};
        
        for (const [, command] of bot.commandHandler.commands) {
            if (!pluginCommands[command.plugin]) {
                pluginCommands[command.plugin] = [];
            }
            
            pluginCommands[command.plugin].push(command);
        }
        
        // Create the embed
        const embed = new EmbedBuilder()
            .setColor('#1E90FF')
            .setTitle('Command Help')
            .setDescription(`Use \`${prefix}help [command]\` or \`/help command:[command]\` to get detailed information about a specific command.`)
            .setFooter({ text: `${bot.client.user.username} | Total Commands: ${bot.commandHandler.commands.size}` })
            .setTimestamp();
        
        // Add plugin sections
        for (const [pluginName, commands] of Object.entries(pluginCommands)) {
            // Get plugin info
            const plugin = bot.pluginManager.plugins.get(pluginName);
            const pluginTitle = plugin ? 
                `${pluginName} v${plugin.version}` : 
                pluginName;
            
            // Sort commands alphabetically
            commands.sort((a, b) => a.name.localeCompare(b.name));
            
            // Format command list
            const commandList = commands
                .map(cmd => `\`${cmd.name}\``)
                .join(', ');
            
            embed.addFields({ name: pluginTitle, value: commandList });
        }
        
        return interaction.reply({ embeds: [embed], ephemeral: true });
    },
    
    /**
     * Send detailed help for a specific command (slash command version)
     * @param {CommandInteraction} interaction - The interaction object
     * @param {Command} command - The command object
     * @param {string} prefix - The command prefix
     * @returns {Promise<void>} - The sent message
     */
    async sendCommandHelpInteraction(interaction, command, prefix) {
        const embed = new EmbedBuilder()
            .setColor('#1E90FF')
            .setTitle(`Command: ${command.name}`)
            .setDescription(command.description || 'No description available')
            .addFields(
                { name: 'Usage', value: `\`${prefix}${command.name}\` or \`/${command.name}\`` },
                { name: 'Plugin', value: command.plugin || 'Unknown', inline: true },
                { name: 'Cooldown', value: `${command.cooldown || 3} second(s)`, inline: true }
            );
        
        // Add aliases if any
        if (command.aliases && command.aliases.length) {
            embed.addFields({ name: 'Aliases', value: command.aliases.map(a => `\`${a}\``).join(', '), inline: true });
        }
        
        // Add permissions if any
        if (command.permissions && command.permissions.length) {
            embed.addFields({ 
                name: 'Required Permissions', 
                value: command.permissions.join(', '),
                inline: true
            });
        }
        
        // Add guild only info
        if (command.guildOnly) {
            embed.addFields({ name: 'Server Only', value: 'Yes', inline: true });
        }
        
        // Add owner only info
        if (command.ownerOnly) {
            embed.addFields({ name: 'Owner Only', value: 'Yes', inline: true });
        }
        
        return interaction.reply({ embeds: [embed], ephemeral: true });
    }
});