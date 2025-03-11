# Discord Bot Dashboard - Developer Guide

This guide provides comprehensive information for developers who want to extend and enhance the Discord Bot Dashboard project. It covers adding new commands to the bot and integrating new features into the dashboard.

## Table of Contents

1. [Project Structure](#project-structure)
2. [Adding New Bot Commands](#adding-new-bot-commands)
3. [Adding New Dashboard Features](#adding-new-dashboard-features)
4. [Database Integration](#database-integration)
5. [Best Practices](#best-practices)
6. [Case Study: Tags Feature](#case-study-tags-feature)
7. [Troubleshooting](#troubleshooting)

## Project Structure

The project follows a modular architecture:

```
discord-bot-dashboard/
├── config/               # Configuration settings
├── src/
│   ├── bot/              # Discord bot logic
│   │   ├── commands/     # Bot slash commands
│   │   ├── events/       # Discord.js event handlers
│   │   └── utils/        # Utility functions
│   │
│   ├── dashboard/        # Web dashboard
│   │   ├── middleware/   # Express middleware
│   │   ├── public/       # Static assets (CSS, JS, images)
│   │   ├── routes/       # Express routes
│   │   └── views/        # EJS templates
│   │
│   └── database/         # Database models & connection
│       ├── models/       # Data models
│       └── setup.js      # Database setup script
│
├── .env                  # Environment variables
└── server.js             # Main application entry point
```

## Adding New Bot Commands

### Step 1: Create a Command File

Create a new JavaScript file in the `src/bot/commands/` directory. The file name should reflect the command (e.g., `ping.js`, `help.js`).

Example structure for a command file:

```javascript
// src/bot/commands/example.js
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  // Command definition with options
  data: new SlashCommandBuilder()
    .setName('example')
    .setDescription('An example command')
    .addStringOption(option =>
      option.setName('input')
        .setDescription('Example input')
        .setRequired(true)),
  
  // Command execution logic
  async execute(interaction) {
    const input = interaction.options.getString('input');
    await interaction.reply(`You provided: ${input}`);
  },
};
```

### Step 2: Understand Command Options

Discord.js supports various types of command options:

```javascript
// String option
.addStringOption(option =>
  option.setName('text')
  .setDescription('Enter some text')
  .setRequired(true))

// Integer option
.addIntegerOption(option =>
  option.setName('number')
  .setDescription('Enter a number')
  .setMinValue(1)
  .setMaxValue(100)
  .setRequired(true))

// Boolean option
.addBooleanOption(option =>
  option.setName('option')
  .setDescription('True or false?')
  .setRequired(false))

// User option
.addUserOption(option =>
  option.setName('user')
  .setDescription('Select a user')
  .setRequired(true))

// Channel option
.addChannelOption(option =>
  option.setName('channel')
  .setDescription('Select a channel')
  .setRequired(true))

// Role option
.addRoleOption(option =>
  option.setName('role')
  .setDescription('Select a role')
  .setRequired(true))
```

### Step 3: Deploy Commands

After creating a new command, you need to register it with Discord:

```bash
npm run deploy-commands
```

This runs the deployment script that updates the slash commands registered with Discord's API.

### Step 4: Test Your Command

Restart your bot and test the command in a Discord server:

```bash
npm start
```

Then use the command in Discord with `/example input:test`.

## Adding New Dashboard Features

Adding a new feature to the dashboard involves several steps:

### Step 1: Create a Database Model

First, define the database model for your feature:

```javascript
// src/database/models/feature.js
const { pool } = require('../index');

class Feature {
  constructor(data = {}) {
    this.id = data.id;
    this.guildId = data.guildId;
    this.name = data.name;
    // Additional properties...
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  // Find all features for a guild
  static async findAllByGuild(guildId) {
    try {
      const [rows] = await pool.query(
        'SELECT * FROM features WHERE guildId = ? ORDER BY name ASC',
        [guildId]
      );
      
      return rows.map(row => new Feature(row));
    } catch (error) {
      console.error('Error finding features:', error);
      throw error;
    }
  }

  // Find a specific feature by ID
  static async findById(id) {
    try {
      const [rows] = await pool.query(
        'SELECT * FROM features WHERE id = ?',
        [id]
      );
      
      if (rows.length === 0) return null;
      
      return new Feature(rows[0]);
    } catch (error) {
      console.error('Error finding feature by ID:', error);
      throw error;
    }
  }

  // Create a new feature
  static async create(data) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      const [result] = await connection.query(
        `INSERT INTO features 
         (guildId, name, /* other fields */) 
         VALUES (?, ?, /* other values */)`,
        [
          data.guildId,
          data.name,
          // Other values...
        ]
      );
      
      const id = result.insertId;
      await connection.commit();
      
      return this.findById(id);
    } catch (error) {
      await connection.rollback();
      console.error('Error creating feature:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  // Update an existing feature
  async save() {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      await connection.query(
        `UPDATE features SET
         name = ?,
         /* other fields */
         WHERE id = ?`,
        [
          this.name,
          // Other fields
          this.id
        ]
      );
      
      await connection.commit();
      return this;
    } catch (error) {
      await connection.rollback();
      console.error('Error saving feature:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  // Delete a feature
  static async delete(id) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      await connection.query(
        'DELETE FROM features WHERE id = ?',
        [id]
      );
      
      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      console.error('Error deleting feature:', error);
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = Feature;
```

### Step 2: Update Database Setup

Add the necessary table creation to `src/database/setup.js`:

```javascript
// Add to CREATE_TABLES array in src/database/setup.js
`CREATE TABLE IF NOT EXISTS features (
  id INT AUTO_INCREMENT PRIMARY KEY,
  guildId VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  /* Additional columns... */
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  /* Indexes */
  INDEX (guildId)
)`,
```

Run the setup script to create the new table:

```bash
node src/database/setup.js
```

### Step 3: Register Model in index.js

Update `src/database/models/index.js` to include your new model:

```javascript
// Export all models from this file
const User = require('./user');
const Guild = require('./guild');
const Tag = require('./tag');
const Feature = require('./feature'); // Add your new model

module.exports = {
  User,
  Guild,
  Tag,
  Feature, // Export it
};
```

### Step 4: Create Routes

Create a route file for the new feature:

```javascript
// src/dashboard/routes/features.js
const express = require('express');
const router = express.Router();
const isLoggedIn = require('../middleware/isLoggedIn');
const { client } = require('../../bot');
const { Feature } = require('../../database/models');

// GET route to display features page
router.get('/:id', isLoggedIn, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if bot is in the guild
    const guild = client.guilds.cache.get(id);
    if (!guild) {
      return res.redirect('/dashboard?error=Bot%20is%20not%20in%20that%20server');
    }
    
    // Verify user has permission to access this guild
    const userGuilds = req.user.guilds || [];
    const userGuild = userGuilds.find(g => g.id === id);
    
    if (!userGuild) {
      return res.redirect('/dashboard?error=You%20do%20not%20have%20access%20to%20that%20server');
    }
    
    // Check if user has admin permission in the guild
    const permissions = BigInt(userGuild.permissions);
    if ((permissions & BigInt(0x8)) !== BigInt(0x8)) {
      return res.redirect('/dashboard?error=You%20do%20not%20have%20administrator%20permissions%20in%20that%20server');
    }
    
    // Get all features for this guild
    const features = await Feature.findAllByGuild(id);
    
    res.render('features', {
      title: `Features - ${guild.name}`,
      user: req.user,
      guild: {
        id: guild.id,
        name: guild.name,
        icon: guild.icon,
      },
      features: features
    });
  } catch (error) {
    console.error('Features page error:', error);
    res.status(500).render('error', { 
      title: 'Error',
      user: req.user,
      error: 'Failed to load features. Please try again later.'
    });
  }
});

// POST route to create a new feature
router.post('/:id/create', isLoggedIn, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Permission checks...
    
    // Validate the feature data
    const { name /* other fields */ } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    // Create the feature
    const feature = await Feature.create({
      guildId: id,
      name,
      // Other fields...
    });
    
    res.json({ success: true, feature });
  } catch (error) {
    console.error('Create feature error:', error);
    res.status(500).json({ error: 'Failed to create feature' });
  }
});

// PUT route to update a feature
router.put('/:id/update/:featureId', isLoggedIn, async (req, res) => {
  try {
    const { id, featureId } = req.params;
    
    // Permission checks...
    
    // Find the feature
    const feature = await Feature.findById(featureId);
    if (!feature) {
      return res.status(404).json({ error: 'Feature not found' });
    }
    
    // Update the feature
    feature.name = req.body.name;
    // Other fields...
    
    await feature.save();
    
    res.json({ success: true, feature });
  } catch (error) {
    console.error('Update feature error:', error);
    res.status(500).json({ error: 'Failed to update feature' });
  }
});

// DELETE route to delete a feature
router.delete('/:id/delete/:featureId', isLoggedIn, async (req, res) => {
  try {
    const { id, featureId } = req.params;
    
    // Permission checks...
    
    // Delete the feature
    await Feature.delete(featureId);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Delete feature error:', error);
    res.status(500).json({ error: 'Failed to delete feature' });
  }
});

module.exports = router;
```

### Step 5: Register Routes

Add the routes to `server.js`:

```javascript
// In server.js
const featuresRoutes = require('./src/dashboard/routes/features');
app.use('/features', featuresRoutes);
```

### Step 6: Create EJS Template

Create a template for the feature's UI:

```html
<!-- src/dashboard/views/features.ejs -->
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><%= title %> | Discord Bot Dashboard</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <link rel="stylesheet" href="/css/style.css">
    <link rel="icon" href="/img/logo.png">
    <style>
        /* Feature-specific styles */
    </style>
</head>
<body>
    <div class="container">
        <!-- Sidebar -->
        <nav class="sidebar">
            <!-- Sidebar content -->
        </nav>
        
        <!-- Main Content -->
        <main class="content">
            <!-- Top Bar -->
            <div class="top-bar">
                <!-- Top bar content -->
            </div>

            <!-- Server Header -->
            <div class="server-header">
                <div class="server-info">
                    <!-- Server info -->
                </div>
                <div class="server-actions">
                    <a href="/dashboard/server/<%= guild.id %>" class="btn btn-secondary"><i class="fas fa-arrow-left"></i> Back to Server</a>
                    <button id="newFeatureBtn" class="btn btn-primary"><i class="fas fa-plus"></i> New Feature</button>
                </div>
            </div>

            <!-- Feature List -->
            <div class="feature-list">
                <% if (features && features.length > 0) { %>
                    <% features.forEach(feature => { %>
                        <!-- Feature item -->
                    <% }); %>
                <% } else { %>
                    <div class="no-features">
                        <p>No features have been created yet. Click the "New Feature" button to create your first feature.</p>
                    </div>
                <% } %>
            </div>

            <!-- Modals and other UI components -->
            
        </main>
    </div>
    
    <script>
        // Client-side JavaScript for the feature
    </script>
</body>
</html>
```

### Step 7: Add Link in Server Management Page

Update `src/dashboard/views/server.ejs` to include a link to your new feature:

```html
<div class="server-actions">
    <a href="/dashboard" class="btn btn-secondary"><i class="fas fa-arrow-left"></i> Back to Servers</a>
    <a href="/tags/<%= guild.id %>" class="btn btn-primary"><i class="fas fa-tags"></i> Manage Tags</a>
    <a href="/features/<%= guild.id %>" class="btn btn-primary"><i class="fas fa-cogs"></i> Manage Features</a>
</div>
```

### Step 8: Add Bot Integration (if needed)

If your feature needs bot integration, create an event handler:

```javascript
// src/bot/events/featureHandler.js
const { Feature } = require('../../database/models');

module.exports = {
  name: 'messageCreate', // or any other event
  once: false,
  async execute(message) {
    // Ignore bot messages
    if (message.author.bot) return;
    
    try {
      // Feature-specific logic
      const features = await Feature.findAllByGuild(message.guild.id);
      
      // Process features
      for (const feature of features) {
        // Feature-specific logic
      }
    } catch (error) {
      console.error('Feature handler error:', error);
    }
  },
};
```

## Database Integration

When working with the MySQL database:

### Model Structure

Every model should include:

1. A constructor for data mapping
2. Static methods for database operations (find, create, etc.)
3. Instance methods for object operations (save, update, etc.)
4. Proper error handling

### Connection Management

Always use connection pooling and transactions for database operations:

```javascript
const connection = await pool.getConnection();
try {
  await connection.beginTransaction();
  
  // Database operations...
  
  await connection.commit();
  
  // Return result
} catch (error) {
  await connection.rollback();
  console.error('Error:', error);
  throw error;
} finally {
  connection.release();
}
```

### SQL Queries

Use parameterized queries to prevent SQL injection:

```javascript
// Good - Using parameterized queries
await connection.query(
  'SELECT * FROM users WHERE username = ?',
  [username]
);

// Bad - Direct string interpolation
await connection.query(
  `SELECT * FROM users WHERE username = '${username}'`  // Vulnerable to SQL injection
);
```

## Best Practices

### Error Handling

Implement consistent error handling throughout your code:

```javascript
try {
  // Code that might fail
} catch (error) {
  console.error('Descriptive error message:', error);
  // Appropriate error response or fallback behavior
}
```

### Security

- Always validate user input before processing it
- Check permissions before allowing access to resources
- Use parameterized queries to prevent SQL injection
- Implement rate limiting for sensitive endpoints
- Validate Discord permissions for each request

### Code Organization

- Keep routes focused on handling requests and responses
- Move business logic to models or separate services
- Use middleware for repetitive tasks (authentication, permission checks)
- Follow a consistent naming convention for files and functions

### Frontend JavaScript

- Use event delegation for dynamically added elements
- Separate concerns (DOM manipulation, data fetching, etc.)
- Provide clear user feedback for actions
- Implement proper error handling for API requests

## Case Study: Tags Feature

The Tags system demonstrates a complete feature lifecycle:

### 1. Database Model (`src/database/models/tag.js`)

```javascript
// Tag model for storing auto-responses
class Tag {
  constructor(data) {
    this.id = data.id;
    this.guildId = data.guildId;
    this.name = data.name;
    this.pattern = data.pattern;
    this.response = data.response;
    this.isRegex = data.isRegex;
    this.usageCount = data.usageCount || 0;
    // Other properties...
  }
  
  // Database methods...
}
```

### 2. Database Setup (`src/database/setup.js`)

```javascript
// Add to CREATE_TABLES array
`CREATE TABLE IF NOT EXISTS tags (
  id INT AUTO_INCREMENT PRIMARY KEY,
  guildId VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  pattern VARCHAR(500) NOT NULL,
  response TEXT NOT NULL,
  isRegex BOOLEAN DEFAULT false,
  usageCount INT DEFAULT 0,
  // Other columns...
)`,
```

### 3. Routes (`src/dashboard/routes/tags.js`)

```javascript
// GET route to display tags page
router.get('/:id', isLoggedIn, async (req, res) => {
  // Implementation...
});

// POST route to create a new tag
router.post('/:id/create', isLoggedIn, async (req, res) => {
  // Implementation...
});

// PUT route to update a tag
router.put('/:id/update/:tagId', isLoggedIn, async (req, res) => {
  // Implementation...
});

// DELETE route to delete a tag
router.delete('/:id/delete/:tagId', isLoggedIn, async (req, res) => {
  // Implementation...
});
```

### 4. UI Template (`src/dashboard/views/tags.ejs`)

```html
<div class="tag-list">
  <% if (tags && tags.length > 0) { %>
    <% tags.forEach(tag => { %>
      <div class="tag-card" data-id="<%= tag.id %>">
        <!-- Tag display -->
      </div>
    <% }); %>
  <% } else { %>
    <div class="no-tags">
      <p>No tags have been created yet.</p>
    </div>
  <% } %>
</div>

<!-- Modal for creating/editing tags -->
```

### 5. Integration in Server Page

```html
<a href="/tags/<%= guild.id %>" class="btn btn-primary">
  <i class="fas fa-tags"></i> Manage Tags
</a>
```

### 6. Bot Event Handler (`src/bot/events/messageCreate.js`)

```javascript
// Process message for tag matches
if (!message.author.bot) {
  const tags = await Tag.findAllByGuild(message.guild.id);
  
  for (const tag of tags) {
    let matches = false;
    
    if (tag.isRegex) {
      // Check regex pattern
      const regex = new RegExp(tag.pattern, 'i');
      matches = regex.test(message.content);
    } else {
      // Check plain text
      matches = message.content.toLowerCase().includes(tag.pattern.toLowerCase());
    }
    
    if (matches) {
      await message.channel.send(tag.response);
      await tag.incrementUsage();
      break;
    }
  }
}
```

## Troubleshooting

### Common Issues and Solutions

#### 1. Routes Not Found (404 Errors)

If you encounter "Cannot GET /route" errors:

- Check if the route file is properly imported and registered in `server.js`
- Verify the route path matches what you're trying to access
- Add debugging routes to isolate the issue

```javascript
// Add a test route
app.get('/test-route', (req, res) => {
  res.send('Route is working');
});
```

#### 2. Database Connection Issues

If you have problems connecting to the database:

- Verify your environment variables are correctly set
- Check that the database server is running
- Try connecting with a different client to confirm credentials
- Look for specific error messages in the console

#### 3. Discord API Errors

For issues with Discord API:

- Check if your bot token is valid
- Verify the required intents are enabled in the bot initialization
- Check rate limits (429 errors)
- Ensure proper permissions in the Discord Developer Portal

#### 4. Dashboard Authentication Problems

If users can't log in:

- Verify the OAuth2 redirect URI in Discord Developer Portal
- Check session configuration
- Ensure cookies are being set properly
- Verify the correct scopes are requested

### Debugging Techniques

1. Add console logs at strategic points:

```javascript
console.log('Before database query:', { parameter1, parameter2 });
const result = await someOperation();
console.log('After database query:', result);
```

2. Use diagnostic routes:

```javascript
// Add at the top of your route file
router.get('/check', (req, res) => {
  res.send('Router is working');
});
```

3. Test database queries directly:

```javascript
// Create a test script, e.g., test-db.js
const { pool } = require('./src/database/index');

async function testQuery() {
  try {
    const [rows] = await pool.query('SELECT * FROM your_table LIMIT 5');
    console.log('Query results:', rows);
  } catch (error) {
    console.error('Query error:', error);
  } finally {
    process.exit();
  }
}

testQuery();
```

By following this guide, you should be able to extend the Discord Bot Dashboard with new commands and features while maintaining a consistent and organized codebase.