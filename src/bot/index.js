// Main bot initialization file
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { botToken } = require('../../config/config');

// Create a new client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

// Create collections for commands
client.commands = new Collection();

// Function to load commands
function loadCommands() {
  const commandsPath = path.join(__dirname, 'commands');
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    
    // Set a new item in the Collection with the key as the command name and the value as the exported module
    if ('data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command);
      console.log(`[SUCCESS] Loaded command: ${command.data.name}`);
    } else {
      console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
  }
}

// Function to load events
function loadEvents() {
  const eventsPath = path.join(__dirname, 'events');
  const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

  for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args));
    } else {
      client.on(event.name, (...args) => event.execute(...args));
    }
    
    console.log(`[SUCCESS] Loaded event: ${event.name}`);
  }
}

// Function to register slash commands
async function registerCommands() {
  const { REST } = require('@discordjs/rest');
  const { Routes } = require('discord-api-types/v10');
  const { clientId, guildId, botToken } = require('../../config/config');
  
  const commands = [];
  const commandsPath = path.join(__dirname, 'commands');
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

  for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    commands.push(command.data.toJSON());
  }

  const rest = new REST({ version: '10' }).setToken(botToken);

  try {
    console.log('[BOT] Started refreshing application (/) commands.');

    if (guildId) {
      // Guild-based commands for development (instant update)
      await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: commands },
      );
      console.log('[BOT] Successfully registered guild commands.');
    } else {
      // Global commands for production (takes up to 1 hour to update)
      await rest.put(
        Routes.applicationCommands(clientId),
        { body: commands },
      );
      console.log('[BOT] Successfully registered global commands.');
    }
  } catch (error) {
    console.error(`[ERROR] Failed to register commands: ${error}`);
  }
}

// Main function to start the bot
function start() {
  // Load commands and events
  loadCommands();
  loadEvents();

  // Log in to Discord
  client.login(botToken)
    .then(() => {
      console.log('[BOT] Successfully logged in');
      // Register slash commands
      registerCommands();
    })
    .catch(error => {
      console.error(`[ERROR] Failed to log in: ${error}`);
    });

  return client;
}

module.exports = { start, client };