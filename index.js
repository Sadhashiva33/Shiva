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
console.log(`Loading commands from ${commandFolders.length} files...`);

for (const folder of commandFolders) {
    if (folder.endsWith('.js')) {
        try {
            const command = require(`./commands/${folder}`);
            if (command.data) {
                client.commands.set(command.data.name, command);
                console.log(`✓ Loaded command: ${command.data.name} from ${folder}`);
            } else if (command.commands) {
                // Handle multiple commands in one file
                command.commands.forEach(cmd => {
                    if (cmd.data && cmd.data.name) {
                        client.commands.set(cmd.data.name, cmd);
                        console.log(`✓ Loaded command: ${cmd.data.name} from ${folder}`);
                    } else {
                        console.log(`⚠️ Invalid command structure in ${folder}:`, cmd);
                    }
                });
                console.log(`✓ Loaded ${command.commands.length} commands from ${folder}`);
            } else {
                console.log(`⚠️ No valid command structure found in ${folder}`);
            }
        } catch (error) {
            console.error(`❌ Error loading ${folder}:`, error.message);
        }
    }
}

console.log(`📝 Total commands loaded: ${client.commands.size}`);

// Load event files
const eventFiles = fs.readdirSync('./events').filter(file => file.endsWith('.js'));
for (const file of eventFiles) {
    const event = require(`./events/${file}`);
}

    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
    } else {
        client.on(event.name, (...args) => event.execute(...args, client));
    }
}

// Login to Discord
client.login(config.token);
