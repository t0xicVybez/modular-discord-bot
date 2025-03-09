const Event = require('../structures/Event');
const PermissionsUtil = require('../utils/permissions');

module.exports = new Event({
    name: 'interactionCreate',
    async execute(interaction, bot) {
        // Handle slash commands
        if (interaction.isCommand()) {
            await handleSlashCommand(interaction, bot);
        }
        
        // Handle buttons
        if (interaction.isButton()) {
            await handleButton(interaction, bot);
        }
        
        // Handle select menus
        if (interaction.isSelectMenu()) {
            await handleSelectMenu(interaction, bot);
        }
        
        // Handle modals
        if (interaction.isModalSubmit()) {
            await handleModalSubmit(interaction, bot);
        }
    }
});

/**
 * Handle slash command interactions
 * @param {CommandInteraction} interaction - The interaction object
 * @param {Bot} bot - The bot instance
 * @returns {Promise<void>}
 */
async function handleSlashCommand(interaction, bot) {
    try {
        // Find the command
        const command = bot.commandHandler.slashCommands.get(interaction.commandName);
        
        if (!command) {
            bot.logger.warn(`Received unknown slash command: ${interaction.commandName}`);
            return interaction.reply({ 
                content: 'Unknown command. The bot may have been updated since this command was registered.',
                ephemeral: true 
            });
        }
        
        // Check if command is owner-only
        if (command.ownerOnly && !PermissionsUtil.isOwner(interaction.user.id)) {
            return interaction.reply({ 
                content: 'This command can only be used by the bot owner.',
                ephemeral: true 
            });
        }
        
        // Check if user has required permissions
        if (command.permissions && command.permissions.length > 0 && interaction.guild) {
            const member = interaction.member;
            
            if (!PermissionsUtil.checkPermissions(member, command.permissions)) {
                const missingPermissions = PermissionsUtil.getMissingPermissions(member, command.permissions);
                return interaction.reply({
                    content: `You don't have permission to use this command. Missing: ${missingPermissions.join(', ')}`,
                    ephemeral: true
                });
            }
        }
        
        // Execute the command
        await bot.commandHandler.handleInteraction(interaction);
    } catch (error) {
        bot.logger.error(`Error handling slash command: ${interaction.commandName}`);
        bot.logger.error(error);
        
        try {
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ 
                    content: 'There was an error while executing this command!',
                    ephemeral: true 
                });
            } else {
                await interaction.reply({ 
                    content: 'There was an error while executing this command!',
                    ephemeral: true 
                });
            }
        } catch (err) {
            bot.logger.error('Error sending error response for slash command');
            bot.logger.error(err);
        }
    }
}

/**
 * Handle button interactions
 * @param {ButtonInteraction} interaction - The interaction object
 * @param {Bot} bot - The bot instance
 * @returns {Promise<void>}
 */
async function handleButton(interaction, bot) {
    try {
        // Custom ID format: pluginName:actionName:optionalData
        const [pluginName, actionName, ...dataParts] = interaction.customId.split(':');
        const data = dataParts.join(':');
        
        // Find the plugin
        const plugin = bot.pluginManager.plugins.get(pluginName);
        
        if (!plugin) {
            bot.logger.warn(`Received button interaction for unknown plugin: ${pluginName}`);
            return interaction.reply({ 
                content: 'This button is no longer supported. The bot may have been updated.',
                ephemeral: true 
            });
        }
        
        // Check if the plugin has a button handler
        if (!plugin.handleButton || typeof plugin.handleButton !== 'function') {
            bot.logger.warn(`Plugin ${pluginName} does not have a button handler`);
            return interaction.reply({ 
                content: 'This button is not handled properly.',
                ephemeral: true 
            });
        }
        
        // Call the plugin's button handler
        await plugin.handleButton(interaction, actionName, data, bot);
    } catch (error) {
        bot.logger.error(`Error handling button interaction: ${interaction.customId}`);
        bot.logger.error(error);
        
        try {
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ 
                    content: 'There was an error processing this button!',
                    ephemeral: true 
                });
            } else {
                await interaction.reply({ 
                    content: 'There was an error processing this button!',
                    ephemeral: true 
                });
            }
        } catch (err) {
            bot.logger.error('Error sending error response for button interaction');
            bot.logger.error(err);
        }
    }
}

/**
 * Handle select menu interactions
 * @param {SelectMenuInteraction} interaction - The interaction object
 * @param {Bot} bot - The bot instance
 * @returns {Promise<void>}
 */
async function handleSelectMenu(interaction, bot) {
    try {
        // Custom ID format: pluginName:actionName:optionalData
        const [pluginName, actionName, ...dataParts] = interaction.customId.split(':');
        const data = dataParts.join(':');
        
        // Find the plugin
        const plugin = bot.pluginManager.plugins.get(pluginName);
        
        if (!plugin) {
            bot.logger.warn(`Received select menu interaction for unknown plugin: ${pluginName}`);
            return interaction.reply({ 
                content: 'This select menu is no longer supported. The bot may have been updated.',
                ephemeral: true 
            });
        }
        
        // Check if the plugin has a select menu handler
        if (!plugin.handleSelectMenu || typeof plugin.handleSelectMenu !== 'function') {
            bot.logger.warn(`Plugin ${pluginName} does not have a select menu handler`);
            return interaction.reply({ 
                content: 'This select menu is not handled properly.',
                ephemeral: true 
            });
        }
        
        // Call the plugin's select menu handler
        await plugin.handleSelectMenu(interaction, actionName, data, bot);
    } catch (error) {
        bot.logger.error(`Error handling select menu interaction: ${interaction.customId}`);
        bot.logger.error(error);
        
        try {
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ 
                    content: 'There was an error processing this selection!',
                    ephemeral: true 
                });
            } else {
                await interaction.reply({ 
                    content: 'There was an error processing this selection!',
                    ephemeral: true 
                });
            }
        } catch (err) {
            bot.logger.error('Error sending error response for select menu interaction');
            bot.logger.error(err);
        }
    }
}

/**
 * Handle modal submit interactions
 * @param {ModalSubmitInteraction} interaction - The interaction object
 * @param {Bot} bot - The bot instance
 * @returns {Promise<void>}
 */
async function handleModalSubmit(interaction, bot) {
    try {
        // Custom ID format: pluginName:actionName:optionalData
        const [pluginName, actionName, ...dataParts] = interaction.customId.split(':');
        const data = dataParts.join(':');
        
        // Find the plugin
        const plugin = bot.pluginManager.plugins.get(pluginName);
        
        if (!plugin) {
            bot.logger.warn(`Received modal submit interaction for unknown plugin: ${pluginName}`);
            return interaction.reply({ 
                content: 'This form is no longer supported. The bot may have been updated.',
                ephemeral: true 
            });
        }
        
        // Check if the plugin has a modal submit handler
        if (!plugin.handleModalSubmit || typeof plugin.handleModalSubmit !== 'function') {
            bot.logger.warn(`Plugin ${pluginName} does not have a modal submit handler`);
            return interaction.reply({ 
                content: 'This form is not handled properly.',
                ephemeral: true 
            });
        }
        
        // Call the plugin's modal submit handler
        await plugin.handleModalSubmit(interaction, actionName, data, bot);
    } catch (error) {
        bot.logger.error(`Error handling modal submit interaction: ${interaction.customId}`);
        bot.logger.error(error);
        
        try {
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ 
                    content: 'There was an error processing this form submission!',
                    ephemeral: true 
                });
            } else {
                await interaction.reply({ 
                    content: 'There was an error processing this form submission!',
                    ephemeral: true 
                });
            }
        } catch (err) {
            bot.logger.error('Error sending error response for modal submit interaction');
            bot.logger.error(err);
        }
    }
}