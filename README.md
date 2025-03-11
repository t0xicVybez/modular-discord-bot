# Discord Bot with Web Dashboard

A modern Discord bot with a beautiful web dashboard built with Node.js, Discord.js v14, Express, and MySQL.

## Features

- **Modular Discord Bot**: Built with Discord.js v14 with slash command support
- **Elegant Web Dashboard**: Modern, responsive interface with a Discord-inspired dark theme
- **Secure Authentication**: Login with Discord OAuth2
- **Server Management**: Configure bot settings for each Discord server
- **Database Options**: Support for MySQL
- **Customization**: Easily add new commands and features
- **Welcome Messages**: Customizable welcome messages for new server members
- **Auto Role**: Automatically assign roles to new members
- **Command Management**: Enable/disable commands per server

## Screenshots

![Dashboard Preview](https://via.placeholder.com/800x400?text=Discord+Bot+Dashboard)

## Prerequisites

- Node.js 16.9.0 or higher
- MySQL database
- A Discord application in the [Discord Developer Portal](https://discord.com/developers/applications)

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
MYSQL_HOST=localhost
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=discord_bot
MYSQL_PORT=3306
```

4. **Set up your database**
MySQL:
- Create a MySQL database
- Run the database setup script:
```bash
node src/database/setup.js
```

5. **Configure your Discord application**

- Go to the [Discord Developer Portal](https://discord.com/developers/applications)
- Create a new application or use an existing one
- Go to the "Bot" tab and add a bot
- Enable the following Privileged Gateway Intents:
  - Server Members Intent
  - Message Content Intent
  - Presence Intent
- Go to the OAuth2 tab:
  - Add a redirect URL: `http://localhost:3000/auth/discord/callback`
  - Copy your Client ID and Client Secret to your `.env` file

6. **Deploy slash commands**

```bash
npm run deploy-commands
```

7. **Start the application**

For development:
```bash
npm run dev
```

For production:
```bash
npm start
```

8. **Invite the bot to your server**

Generate an invite URL in the Discord Developer Portal with the following scopes:
- `bot`
- `applications.commands`

Add appropriate bot permissions based on your needs (Administrator is recommended for full functionality).

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
│   │   ├── public/           # Static assets (CSS, JS)
│   │   ├── routes/           # Express routes
│   │   ├── views/            # EJS templates
│   │   └── index.js          # Dashboard initialization
│   ├── database/
│   │   ├── models/           # Database models
│   │   ├── index.js          # Database connection
│   │   └── setup.js          # Database setup for MySQL
│   └── server.js             # Main application entry point
├── .env                      # Environment variables (gitignored)
├── .gitignore                # Git ignore file
├── package.json              # Node.js package file
└── README.md                 # Project documentation
```

## Adding New Commands

To add a new command:

1. Create a new file in `src/bot/commands/`
2. Follow the structure of the existing commands (like ping.js)
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

## Creating Embeds

You can use the built-in utility function to create standardized embeds:

```javascript
const { createEmbed } = require('../../utils');

const embed = createEmbed({
  title: 'Hello World',
  description: 'This is a description',
  color: '#5865F2', // Discord Blurple
  fields: [
    { name: 'Field 1', value: 'Value 1', inline: true },
    { name: 'Field 2', value: 'Value 2', inline: true }
  ],
  timestamp: true
});

await interaction.reply({ embeds: [embed] });
```

## Dashboard Features

The web dashboard provides the following features:

- **Home Page**: Display bot statistics and features
- **Dashboard**: Manage your Discord servers
- **Server Management**:
  - General Settings: Configure prefix for message commands
  - Welcome Messages: Enable/disable and customize welcome messages
  - Auto Role: Automatically assign roles to new members
  - Command Management: Enable/disable specific commands
- **Commands List**: View all available bot commands
- **About Page**: Information about the bot and technologies used

## Customization

### Dashboard Theme

The dashboard uses a Discord-inspired dark theme by default. You can customize the colors in:

```
src/dashboard/public/css/style.css
```

The `:root` CSS variables at the top of the file control the color scheme.

### Bot Status

You can modify the bot's status in `src/bot/events/ready.js`:

```javascript
client.user.setPresence({
  activities: [{ name: 'your-status-here', type: 3 }],
  status: 'online', // 'idle', 'dnd', 'invisible'
});
```

## Database Models

### Guild Model

The Guild model stores server-specific settings, including:

- Prefix for message commands
- Welcome message settings
- Auto role settings
- Disabled commands
- Custom permissions

### User Model

The User model stores Discord user data, including:

- Discord ID, username, discriminator
- Avatar URL
- Access and refresh tokens
- List of guilds
- Dashboard preferences

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- [Discord.js](https://discord.js.org/)
- [Express](https://expressjs.com/)
- [Passport](http://www.passportjs.org/)
- [MySQL](https://www.mysql.com/)
- [EJS](https://ejs.co/)
- [Font Awesome](https://fontawesome.com/)