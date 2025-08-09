const { getChannelCount, updateChannelCount, getLastCountUser } = require('../utils/database');
const config = require('../config');

module.exports = {
    name: 'messageCreate',
    async execute(message, client) {
        // Ignore bot messages
        if (message.author.bot) return;
        
        // Handle prefix commands
        if (message.content.startsWith(config.prefix)) {
            const args = message.content.slice(config.prefix.length).trim().split(/ +/);
            const commandName = args.shift().toLowerCase();
            
            // Handle prefix commands
            switch (commandName) {
                case 'ping':
                    const ping = Date.now() - message.createdTimestamp;
                    await message.reply(`🏓 Pong! Latency: ${ping}ms | API: ${Math.round(client.ws.ping)}ms`);
                    break;
                    
                case 'play':
                    if (!args[0]) {
                        return message.reply('❌ Please provide a YouTube URL!');
                    }
                    
                    // Simulate slash command interaction for music
                    const fakeInteraction = {
                        member: message.member,
                        guild: message.guild,
                        guildId: message.guild.id,
                        channel: message.channel,
                        user: message.author,
                        client: client,
                        options: {
                            getString: (name) => name === 'url' ? args[0] : null
                        },
                        reply: async (content) => await message.reply(content),
                        deferReply: async () => {
                            await message.channel.sendTyping();
                        },
                        editReply: async (content) => await message.reply(content)
                    };
                    
                    try {
                        const musicCommands = require('../commands/music');
                        const playCommand = musicCommands.commands.find(cmd => cmd.data.name === 'play');
                        if (playCommand) {
                            await playCommand.execute(fakeInteraction);
                        }
                    } catch (error) {
                        console.error('Error with prefix play command:', error);
                        await message.reply('❌ Error playing music!');
                    }
                    break;
                    
                case 'skip':
                    const skipInteraction = {
                        member: message.member,
                        guild: message.guild,
                        guildId: message.guild.id,
                        channel: message.channel,
                        user: message.author,
                        client: client,
                        reply: async (content) => await message.reply(content)
                    };
                    
                    try {
                        const musicCommands = require('../commands/music');
                        const skipCommand = musicCommands.commands.find(cmd => cmd.data.name === 'skip');
                        if (skipCommand) {
                            await skipCommand.execute(skipInteraction);
                        }
                    } catch (error) {
                        console.error('Error with prefix skip command:', error);
                        await message.reply('❌ Error skipping song!');
                    }
                    break;
                    
                case 'stop':
                    const stopInteraction = {
                        member: message.member,
                        guild: message.guild,
                        guildId: message.guild.id,
                        channel: message.channel,
                        user: message.author,
                        client: client,
                        reply: async (content) => await message.reply(content)
                    };
                    
                    try {
                        const musicCommands = require('../commands/music');
                        const stopCommand = musicCommands.commands.find(cmd => cmd.data.name === 'stop');
                        if (stopCommand) {
                            await stopCommand.execute(stopInteraction);
                        }
                    } catch (error) {
                        console.error('Error with prefix stop command:', error);
                        await message.reply('❌ Error stopping music!');
                    }
                    break;
                    
                case 'queue':
                    const queueInteraction = {
                        member: message.member,
                        guild: message.guild,
                        guildId: message.guild.id,
                        channel: message.channel,
                        user: message.author,
                        client: client,
                        reply: async (content) => await message.reply(content)
                    };
                    
                    try {
                        const musicCommands = require('../commands/music');
                        const queueCommand = musicCommands.commands.find(cmd => cmd.data.name === 'queue');
                        if (queueCommand) {
                            await queueCommand.execute(queueInteraction);
                        }
                    } catch (error) {
                        console.error('Error with prefix queue command:', error);
                        await message.reply('❌ Error showing queue!');
                    }
                    break;
                    
                case 'help':
                    await message.reply(`
🎵 **Maestro Bot Commands**

**Prefix Commands (${config.prefix}):**
\`${config.prefix}ping\` - Check bot latency
\`${config.prefix}play <url>\` - Play music from YouTube
\`${config.prefix}skip\` - Skip current song
\`${config.prefix}stop\` - Stop music and clear queue
\`${config.prefix}queue\` - Show music queue
\`${config.prefix}help\` - Show this help message

**Slash Commands:**
Use \`/\` to see all available slash commands including:
• Music: \`/play\`, \`/skip\`, \`/bass\`, \`/volume\`
• Moderation: \`/kick\`, \`/ban\`, \`/mute\`, \`/clear\`
• Games: \`/dice\`, \`/8ball\`, \`/rps\`, \`/trivia\`
• Utility: \`/ping\`, \`/serverinfo\`, \`/userinfo\`
• Admin: \`/lock\`, \`/unlock\`, \`/slowmode\`, \`/announce\`

**TTS Announcements:**
Use \`/tts-vc-announce on\` to enable voice join/leave announcements
                    `);
                    break;
                    
                default:
                    // Check if it's a number for counting game
                    const messageContent = message.content.trim();
                    const number = parseInt(messageContent);
                    
                    if (!isNaN(number) && messageContent === number.toString()) {
                        await handleCountingGame(message, client, number);
                    }
                    break;
            }
            return;
        }
        
        // Handle counting game for non-prefix messages
        const messageContent = message.content.trim();
        const number = parseInt(messageContent);
        
        if (!isNaN(number) && messageContent === number.toString()) {
            await handleCountingGame(message, client, number);
        }
    },
};

async function handleCountingGame(message, client, number) {
    const currentCount = await getChannelCount(message.channelId);
    const lastUser = await getLastCountUser(message.channelId);
    const expectedNumber = currentCount + 1;
    
    // Check if it's the correct next number and not the same user as last time
    if (number === expectedNumber && message.author.id !== lastUser) {
        // Correct number! Update the count
        await updateChannelCount(message.channelId, number, message.author.id);
        
        // React with a checkmark
        try {
            await message.react('✅');
        } catch (error) {
            console.error('Error reacting to message:', error);
        }
        
        // Send a milestone message for certain numbers
        if (number % 100 === 0) {
            message.channel.send(`🎉 Congratulations! You reached **${number}**!`);
        }
    } else if (number !== expectedNumber || message.author.id === lastUser) {
        // Wrong number or same user counting twice, reset the count
        await updateChannelCount(message.channelId, 0, null);
        
        // React with an X
        try {
            await message.react('❌');
        } catch (error) {
            console.error('Error reacting to message:', error);
        }
        
        let reason = '';
        if (number !== expectedNumber) {
            reason = `Expected **${expectedNumber}** but got **${number}**`;
        } else {
            reason = 'Same user cannot count twice in a row';
        }
        
        message.channel.send(`💥 Count reset! ${reason}. Start over from **1**.`);
    }
}