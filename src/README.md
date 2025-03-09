# Modular Discord Bot with Web Dashboard

A powerful and modular Discord bot with a web dashboard that makes it easy to manage your Discord server.

## Features

- **Modular Design**: Easily add new commands and features
- **Web Dashboard**: Manage your bot through a beautiful web interface
- **Database Support**: Uses SQLite by default with MySQL support for larger deployments
- **Slash Commands**: Implements Discord's slash commands
- **Easy Configuration**: Simple .env file setup

## Prerequisites

- Node.js 16.x or higher
- npm or yarn
- A Discord bot token (see [Discord Developer Portal](https://discord.com/developers/applications))

## Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/discord-bot.git
cd discord-bot
```

2. Install dependencies
```bash
npm install
```

3. Create a `.env` file based on the example
```bash
cp .env.example .env
```

4. Edit the `.env` file with your Discord credentials and other settings

5. Start the bot
```bash
npm start
```

## Configuration

Edit the `.env` file with your Discord bot credentials and other settings:

```
# Discord Bot Configuration
BOT_TOKEN=your_discord_bot_token
CLIENT_ID=your_discord_client_id
GUILD_ID=your_discord_guild_id_for_development

# Database Configuration (sqlite or mysql)
DB_TYPE=sqlite
# Other database settings...

# Web Dashboard Configuration
PORT=3000
SESSION_SECRET=your_session_secret
CALLBACK_URL=http://localhost:3000/auth/discord/callback
CLIENT_SECRET=your_discord_client_secret
```

## Bot Commands

The bot comes with the following slash commands:

- `/ping` - Check the bot's latency

## Adding New Commands

1. Create a new JavaScript file in the `src/bot/commands` directory
2. Follow the structure of the example command (ping.js)
3. The bot will automatically load and register your new command on startup

Example command structure:

```javascript
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('command-name')
    .setDescription('Command description'),
  
  async execute(interaction) {
    // Command logic goes here
    await interaction.reply('Command response');
  }
};
```

## Web Dashboard

The web dashboard allows server administrators to:

1. View and manage bot settings for their servers
2. Configure welcome messages
3. View bot commands and statistics

To access the dashboard, visit `http://localhost:3000` (or your configured port).

## Extending the Dashboard

To add new settings or features to the dashboard:

1. Create or modify routes in `src/dashboard/routes/`
2. Create or modify view templates in `src/dashboard/views/`
3. Add database models in `src/database.js` as needed

## Database Support

The bot supports two database backends:

- **SQLite**: Default for development and small deployments
- **MySQL**: For larger deployments with multiple shards

Configuration is done through the .env file.

## Development

For development, you can use nodemon to automatically restart on changes:

```bash
npm run dev
```

## License

[MIT License](LICENSE)

## Support

For issues and feature requests, please open an issue on GitHub.