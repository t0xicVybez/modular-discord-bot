// Event handler for when the bot is ready
module.exports = {
    name: 'ready',
    once: true,
    execute(client) {
      console.log(`[BOT] Ready! Logged in as ${client.user.tag}`);
      console.log(`[BOT] Serving ${client.guilds.cache.size} servers`);
      
      // Set bot status
      client.user.setPresence({
        activities: [{ name: '/help', type: 3 }], // "Watching /help"
        status: 'online',
      });
    },
  };