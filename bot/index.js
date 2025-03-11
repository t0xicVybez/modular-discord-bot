// Main bot initialization file
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Get bot token from environment variables
const botToken = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID || '1333299729332699196';
const guildId = process.env.DISCORD_GUILD_ID;
const publishCommands = process.env.PUBLISH_COMMANDS === 'true';

// Create a new client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
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
  if (!publishCommands) {
    console.log('[BOT] Command publishing is disabled. Skipping command registration.');
    return;
  }

  const { REST } = require('@discordjs/rest');
  const { Routes } = require('discord-api-types/v10');
  
  const commands = [];
  const commandsPath = path.join(__dirname, 'commands');
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

  for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    commands.push(command.data.toJSON());
  }

  // Log token info for debugging (partial token for security)
  const tokenPreview = botToken ? `${botToken.substring(0, 10)}...` : 'undefined';
  console.log(`[BOT] Using token: ${tokenPreview}`);
  console.log(`[BOT] Client ID: ${clientId}`);

  if (!botToken) {
    console.error('[ERROR] Bot token is missing. Cannot register commands.');
    return;
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

  // Check if bot token is available
  if (!botToken) {
    console.error('[ERROR] Bot token is missing. Cannot start the bot.');
    return null;
  }

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