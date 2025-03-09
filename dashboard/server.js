// Load environment variables
require('dotenv').config();

// Import required modules
const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const passport = require('passport');
const path = require('path');
const morgan = require('morgan');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const { createLogger, format, transports } = require('winston');
const { csrf } = require('csrf-csrf');
const rateLimit = require('express-rate-limit');

// Import configuration
require('./config/passport');
const database = require('./config/database');
const DashboardPluginManager = require('./plugin-system/dashboard-plugin-manager');

// Initialize the dashboard logger
const logger = createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: format.combine(
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        format.printf(({ level, message, timestamp }) => {
            return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
        })
    ),
    transports: [
        new transports.Console({
            format: format.combine(
                format.colorize(),
                format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                format.printf(({ level, message, timestamp }) => {
                    return `[${timestamp}] ${level}: ${message}`;
                })
            )
        }),
        new transports.File({ filename: 'dashboard.log' })
    ]
});

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Configure CSRF protection
const { doubleCsrfProtection } = csrf({
    getSecret: () => process.env.SESSION_SECRET,
});

// Configure rate limiting
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Set up middleware
app.use(helmet({ contentSecurityPolicy: false })); // Security headers
app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? 'https://yourdomain.com' : 'http://localhost:3000',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan('dev')); // Logging

// Configure session management
app.use(session({
    store: new SQLiteStore({
        db: 'sessions.sqlite',
        dir: path.join(__dirname, './data')
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 86400000 // 1 day
    }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Rate limit API routes
app.use('/api', apiLimiter);

// Set up view engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Initialize the dashboard plugin manager
const dashboardPluginManager = new DashboardPluginManager(app, logger);

// Pass user info to templates
app.use((req, res, next) => {
    res.locals.user = req.user || null;
    next();
});

// Set up routes
app.use('/', require('./routes/dashboard'));
app.use('/auth', require('./routes/auth'));
app.use('/api', doubleCsrfProtection, require('./routes/api'));
app.use('/api/plugins', doubleCsrfProtection, require('./routes/plugin-api'));

// 404 handler
app.use((req, res) => {
    res.status(404).render('error', {
        title: '404 - Page Not Found',
        message: 'The page you were looking for does not exist',
        status: 404
    });
});

// Error handler
app.use((err, req, res, next) => {
    logger.error(`Error: ${err.message}`);
    logger.error(err.stack);
    
    res.status(err.status || 500).render('error', {
        title: `${err.status || 500} - Server Error`,
        message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message,
        status: err.status || 500
    });
});

// Start the server
app.listen(PORT, async () => {
    logger.info(`Dashboard server started on port ${PORT}`);
    
    // Initialize database connection
    try {
        await database.initialize();
        logger.info('Database connection established');
    } catch (error) {
        logger.error('Failed to connect to database:', error);
        process.exit(1);
    }
    
    // Load dashboard plugins
    try {
        await dashboardPluginManager.loadPlugins();
        logger.info(`Loaded ${dashboardPluginManager.plugins.size} dashboard plugins`);
    } catch (error) {
        logger.error('Failed to load dashboard plugins:', error);
    }
});

// Handle process termination
process.on('SIGINT', async () => {
    logger.info('SIGINT received. Shutting down gracefully...');
    
    // Close database connection
    try {
        await database.close();
        logger.info('Database connection closed');
    } catch (error) {
        logger.error('Error closing database connection:', error);
    }
    
    // Unload plugins
    try {
        await dashboardPluginManager.unloadAllPlugins();
        logger.info('All dashboard plugins unloaded');
    } catch (error) {
        logger.error('Error unloading dashboard plugins:', error);
    }
    
    process.exit(0);
});

module.exports = app;