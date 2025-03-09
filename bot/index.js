const { Client, Collection, GatewayIntentBits, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const logger = require('./utils/logger');
const config = require('../config');

class Bot {
  constructor() {
    // Create a new client instance
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
      ]
    });

    // Initialize collections
    this.client.commands = new Collection();
    
    // Store bot instance reference
    this.client.bot = this;
  }

  // Load all command files
  async loadCommands() {
    const commands = [];
    const commandsPath = path.join(__dirname, 'commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    
    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      const command = require(filePath);
      
      // Set a new item in the Collection with the key as the command name and the value as the exported module
      if ('data' in command && 'execute' in command) {
        this.client.commands.set(command.data.name, command);
        commands.push(command.data.toJSON());
        logger.info(`Loaded command: ${command.data.name}`);
      } else {
        logger.warn(`The command at ${filePath} is missing a required "data" or "execute" property.`);
      }
    }
    
    return commands;
  }

  // Load all event files
  loadEvents() {
    const eventsPath = path.join(__dirname, 'events');
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
    
    for (const file of eventFiles) {
      const filePath = path.join(eventsPath, file);
      const event = require(filePath);
      
      if (event.once) {
        this.client.once(event.name, (...args) => event.execute(...args));
      } else {
        this.client.on(event.name, (...args) => event.execute(...args));
      }
      
      logger.info(`Loaded event: ${event.name}`);
    }
  }

  // Register slash commands with Discord
  async registerCommands(commands) {
    const rest = new REST().setToken(config.bot.token);
    
    try {
      logger.info('Started refreshing application (/) commands.');
      
      await rest.put(
        Routes.applicationCommands(config.bot.clientId),
        { body: commands }
      );
      
      logger.info('Successfully reloaded application (/) commands.');
    } catch (error) {
      logger.error('Failed to register commands:', error);
    }
  }

  // Start the bot
  async start() {
    try {
      // Load commands and events
      const commands = await this.loadCommands();
      this.loadEvents();
      
      // Register commands with Discord
      await this.registerCommands(commands);
      
      // Login to Discord
      await this.client.login(config.bot.token);
      
      return this.client;
    } catch (error) {
      logger.error('Failed to start bot:', error);
      throw error;
    }
  }
}

module.exports = Bot;