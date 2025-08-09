const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { joinVoiceChannel } = require('@discordjs/voice');
const fs = require('fs');
const path = require('path');
const config = require('./config');

// Create Discord client with necessary intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// Initialize collections for commands and music queues
client.commands = new Collection();
client.musicQueues = new Collection();
client.voiceConnections = new Collection();

// Load command files
const commandFolders = fs.readdirSync('./commands');
for (const folder of commandFolders) {
    if (folder.endsWith('.js')) {
        const command = require(`./commands/${folder}`);
        if (command.data) {
            client.commands.set(command.data.name, command);
        } else if (command.commands) {
            // Handle multiple commands in one file
            command.commands.forEach(cmd => {
                client.commands.set(cmd.data.name, cmd);
            });
        }
    }
}

// Load event files
const eventFiles = fs.readdirSync('./events').filter(file => file.endsWith('.js'));
for (const file of eventFiles) {
    const event = require(`./events/${file}`);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
    } else {
        client.on(event.name, (...args) => event.execute(...args, client));
    }
}

// Login to Discord
client.login(config.token);
