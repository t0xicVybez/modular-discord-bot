// Load environment variables
require('dotenv').config();

// Import dependencies
const express = require('express');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const passport = require('passport');
const path = require('path');

// Import local modules
const botClient = require('./src/bot/index');
const database = require('./src/database/index');

// Initialize Express app
const app = express();

// Connect to database
database.connect().catch(err => {
  console.error('Failed to connect to database:', err);
  process.exit(1);
});

// Configure view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src/dashboard/views'));
app.locals.basedir = path.join(__dirname, 'src/dashboard/views');

// Set up middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'src/dashboard/public')));
app.locals.partials = path.join(__dirname, 'src/dashboard/views/partials');

// Configure session
const sessionOptions = {
  clearExpired: true,
  checkExpirationInterval: 900000, // 15 minutes
  expiration: 86400000, // 1 day
  createDatabaseTable: true
};

// Create session store using the connection pool
const sessionStore = new MySQLStore(sessionOptions, database.pool);

app.use(
  session({
    secret: process.env.ENCRYPTION_KEY || 'a_very_secret_key',
    cookie: {
      maxAge: 86400000 // 1 day
    },
    resave: false,
    saveUninitialized: false,
    store: sessionStore
  })
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Configure Passport
require('./src/dashboard/middleware/auth');

// Diagnostic route for checking server
app.get('/check-server', (req, res) => {
  res.send('Server is working properly');
});

// Import routes
const indexRoutes = require('./src/dashboard/routes/index');
const authRoutes = require('./src/dashboard/routes/auth');
const dashboardRoutes = require('./src/dashboard/routes/dashboard');
const apiRoutes = require('./src/dashboard/routes/api');

// Register main routes
app.use('/', indexRoutes);
app.use('/auth', authRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/api', apiRoutes);

// Tags route - both diagnostic and using the router
app.get('/check-tags', (req, res) => {
  res.send('Tags route check - Server is working');
});

// Custom direct route for tags as fallback
app.get('/direct-tags/:id', (req, res) => {
  res.send(`This is a direct test route for tags with ID: ${req.params.id}`);
});

// Import and use the tags router
try {
  const tagsRoutes = require('./src/dashboard/routes/tags');
  console.log('Tags routes loaded successfully');
  app.use('/tags', tagsRoutes);
} catch (error) {
  console.error('Error loading tags routes:', error);
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  res.status(500).render('error', { 
    title: 'Error',
    user: req.user,
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong!'
  });
});

// Handle 404 errors
app.use((req, res) => {
  console.log(`404 Not Found: ${req.method} ${req.originalUrl}`);
  res.status(404).render('error', {
    title: 'Page Not Found',
    user: req.user,
    error: 'The page you requested does not exist.'
  });
});

// Start the server
const port = process.env.HTTP_PORT || 26930;
app.listen(port, '0.0.0.0', () => {
  console.log(`Dashboard running on port ${port}`);
  console.log(`Server URL: http://localhost:${port}`);
});

// Start the Discord bot
botClient.start();