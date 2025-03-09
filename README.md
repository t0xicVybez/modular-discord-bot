# Modular Discord Bot

A flexible Discord bot with a plugin system that makes it easy to add new features.

## Features

- 🔌 **Plugin System**: Easily add, remove, or create new features
- 🔧 **Configurable**: Simple configuration for bot settings
- 💬 **Message Commands**: Traditional prefix-based commands
- 🔨 **Slash Commands**: Modern Discord slash command support
- 📊 **Database**: SQLite database for storing data
- 🔍 **Logging**: Comprehensive logging system

## Setup

1. Clone the repository
2. Install dependencies
   ```
   npm install
   ```
3. Create a `.env` file with your Discord bot token
   ```
   DISCORD_TOKEN=your_discord_token_here
   ```
4. Edit `config.json` to customize the bot settings
5. Start the bot
   ```
   npm start
   ```

## Creating Plugins

Plugins should be placed in the `plugins` directory, with each plugin having its own subdirectory. The basic structure of a plugin is:

```
plugins/
└── my-plugin/
    ├── index.js
    ├── commands/
    │   └── mycommand.js
    └── events/
        └── myevent.js
```

### Plugin Entry Point

Create an `index.js` file for your plugin:

```javascript
const Plugin = require('../../src/structures/Plugin');

module.exports = new Plugin({
    name: 'my-plugin',
    version: '1.0.0',
    description: 'My awesome plugin',
    author: 'Your Name'
});

// Initialize function
module.exports.initialize = async (bot) => {
    // Register commands
    const commandFiles = require('fs')
        .readdirSync(__dirname + '/commands')
        .filter(file => file.endsWith('.js'));
        
    for (const file of commandFiles) {
        const command = require(`./commands/${file}`);
        bot.commandHandler.registerCommand(command, module.exports.name);
    }
    
    // Register events
    const eventFiles = require('fs')
        .readdirSync(__dirname + '/events')
        .filter(file => file.endsWith('.js'));
        
    for (const file of eventFiles) {
        const event = require(`./events/${file}`);
        bot.eventHandler.registerEvent(event, module.exports.name);
    }
    
    bot.logger.info(`Plugin ${module.exports.name} initialized`);
};

// Shutdown function
module.exports.shutdown = async (bot) => {
    // Cleanup code here
    bot.logger.info(`Plugin ${module.exports.name} shut down`);
};
```

### Creating Commands

Create command files in the `commands` directory:

```javascript
const Command = require('../../../src/structures/Command');
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = new Command({
    name: 'mycommand',
    description: 'A sample command',
    aliases: ['mc', 'mycmd'],
    cooldown: 5,
    permissions: ['SendMessages'],
    
    // Create a slash command (optional)
    slashCommand: new SlashCommandBuilder()
        .setName('mycommand')
        .setDescription('A sample command'),
    
    // Execute traditional command
    async execute(message, args, bot) {
        return message.reply('Hello from my command!');
    },
    
    // Execute slash command
    async executeInteraction(interaction, bot) {
        return interaction.reply('Hello from my slash command!');
    }
});
```

### Creating Events

Create event handlers in the `events` directory:

```javascript
const Event = require('../../../src/structures/Event');

module.exports = new Event({
    name: 'guildMemberAdd',
    
    async execute(member, bot) {
        // Event handler code here
        console.log(`New member joined: ${member.user.tag}`);
    }
});
```

## License

MIT