import { Client, GatewayIntentBits } from 'discord.js';
import { loadEvents } from './handlers/eventHandler';
import { startFrontPoller } from './utils/frontPoller';

// Create a new client instance with minimal intents for user-installed bot
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
    ]
});

// Load all events
loadEvents(client).then(() => {
    console.log('All events loaded');
});

// Start the front poller once the bot is ready
client.once('clientReady', () => {
    startFrontPoller(client);
});

// Login to Discord
client.login(process.env.DISCORD_TOKEN).catch(error => {
    console.error('Failed to login:', error);
    process.exit(1);
});