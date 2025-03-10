// Load environment variables
require('dotenv').config();

// Import dependencies
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const path = require('path');

// Import local modules
const botClient = require('./src/bot/index');
const database = require('./src/database/index');
const { sessionSecret, port, mongoURI } = require('./config/config');

// Initialize Express app
const app = express();

// Connect to database
database.connect();

// Configure view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src/dashboard/views'));
// Add this to help with include paths
app.locals.basedir = path.join(__dirname, 'src/dashboard/views');

// Set up middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'src/dashboard/public')));
app.locals.partials = path.join(__dirname, 'src/dashboard/views/partials');
// Configure session
app.use(
  session({
    secret: sessionSecret,
    cookie: {
      maxAge: 60000 * 60 * 24 // 1 day
    },
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: mongoURI
    })
  })
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Configure Passport
require('./src/dashboard/middleware/auth');

// Import routes
const indexRoutes = require('./src/dashboard/routes/index');
const authRoutes = require('./src/dashboard/routes/auth');
const dashboardRoutes = require('./src/dashboard/routes/dashboard');
const apiRoutes = require('./src/dashboard/routes/api');

// Use routes
app.use('/', indexRoutes);
app.use('/auth', authRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/api', apiRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', { 
    title: 'Error',
    user: req.user,
    error: process.env.NODE_ENV === 'development' ? err : 'Something went wrong!'
  });
});

// Start the server
app.listen(port, '0.0.0.0', () => {
  console.log(`Dashboard running on port ${port}`);
});

// Start the Discord bot
botClient.start();