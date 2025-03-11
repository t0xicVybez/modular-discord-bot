# Discord Bot with Web Dashboard

A modular Discord bot with a beautiful web dashboard built with Node.js, Discord.js, Express, and MongoDB.

![Dashboard Preview](https://via.placeholder.com/800x400?text=Discord+Bot+Dashboard)

## Features

- **Modular Discord Bot**: Built with Discord.js v14 with slash command support
- **Web Dashboard**: Modern, responsive interface with a Discord-inspired dark theme
- **Authentication**: Secure login with Discord OAuth2
- **Server Management**: Configure bot settings for each Discord server
- **Database Integration**: MongoDB for storing user and server settings
- **Customization**: Easily add new commands and features

## Prerequisites

- Node.js 16.9.0 or higher
- MongoDB (local installation or MongoDB Atlas)
- A Discord account and application in the [Discord Developer Portal](https://discord.com/developers/applications)

## Installation

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/discord-bot-dashboard.git
cd discord-bot-dashboard
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up your environment variables**

Create a `.env` file in the root directory with the following:

```
# Discord Bot Configuration
BOT_TOKEN=your_discord_bot_token_here
CLIENT_ID=your_discord_application_id_here
GUILD_ID=your_discord_server_id_for_development # Optional, remove for global commands

# Dashboard Configuration
PORT=3000
CLIENT_SECRET=your_discord_client_secret_here
CALLBACK_URL=http://localhost:3000/auth/discord/callback
SESSION_SECRET=a_long_random_string_for_session_security

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/discord-bot-dashboard
# For MongoDB Atlas: mongodb+srv://username:password@cluster.mongodb.net/discord-bot-dashboard
```

4. **Set up your Discord application**

- Go to the [Discord Developer Portal](https://discord.com/developers/applications)
- Create a new application or use an existing one
- Go to the "Bot" tab and add a bot
- Enable the necessary "Privileged Gateway Intents" (Server Members, Message Content, Presence)
- Go to the OAuth2 tab:
  - Add a redirect URL: `http://localhost:3000/auth/discord/callback`
  - Copy your Client ID and Client Secret to your `.env` file

5. **Start the application**

For development:
```bash
npm run dev
```

For production:
```bash
npm start
```

6. **Register slash commands**

```bash
npm run deploy-commands
```

7. **Invite the bot to your server**

Generate an invite URL in the Discord Developer Portal with the following scopes:
- `bot`
- `applications.commands`

Add appropriate bot permissions based on the commands you implement.

## Project Structure

```
discord-bot-dashboard/
├── config/
│   ├── config.js             # Configuration settings
│   └── keys.js               # API keys and secrets (gitignored)
├── src/
│   ├── bot/
│   │   ├── commands/         # Bot commands
│   │   ├── events/           # Discord.js event handlers
│   │   ├── utils/            # Utility functions for bot
│   │   └── index.js          # Bot initialization
│   ├── dashboard/
│   │   ├── middleware/       # Express middleware
│   │   ├── public/           # Static assets
│   │   ├── routes/           # Express routes
│   │   ├── views/            # EJS templates
│   │   └── index.js          # Dashboard initialization
│   └── database/             # Database connection and models
├── .env                      # Environment variables (gitignored)
├── .gitignore                # Git ignore file
├── package.json              # Node.js package file
├── README.md                 # Project documentation
└── server.js                 # Main application entry point
```

## Adding New Commands

To add a new command:

1. Create a new file in `src/bot/commands/`
2. Follow the structure of the existing ping command
3. Export an object with `data` and `execute` properties
4. Run `npm run deploy-commands` to register the new command with Discord

Example:

```javascript
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('hello')
    .setDescription('Replies with a greeting'),
  
  async execute(interaction) {
    await interaction.reply('Hello there!');
  },
};
```

## Customizing the Dashboard

The dashboard is built with EJS, CSS, and JavaScript. You can customize it by:

- Modifying the EJS templates in `src/dashboard/views/`
- Updating the styles in `src/dashboard/public/css/style.css`
- Enhancing client-side functionality in `src/dashboard/public/js/main.js`

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- [Discord.js](https://discord.js.org/)
- [Express](https://expressjs.com/)
- [Passport](http://www.passportjs.org/)
- [MongoDB](https://www.mongodb.com/)
- [EJS](https://ejs.co/)