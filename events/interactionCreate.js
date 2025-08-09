const { getChannelCount, updateChannelCount, getLastCountUser } = require('../utils/database');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        // Handle slash commands
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            
            if (!command) {
                console.error(`No command matching ${interaction.commandName} was found.`);
                return;
            }
            
            try {
                await command.execute(interaction);
            } catch (error) {
                console.error('Error executing command:', error);
                
                const errorMessage = {
                    content: '❌ There was an error while executing this command!',
                    ephemeral: true
                };
                
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(errorMessage);
                } else {
                    await interaction.reply(errorMessage);
                }
            }
        }
    },
};

// Also handle regular messages for the counting game
const { Events } = require('discord.js');

// Add message event handler
module.exports.messageCreate = {
    name: Events.MessageCreate,
    async execute(message, client) {
        // Ignore bot messages
        if (message.author.bot) return;
        
        // Check if this is a counting channel by seeing if there's any count data
        const currentCount = await getChannelCount(message.channelId);
        const lastUser = await getLastCountUser(message.channelId);
        
        // Only process if this channel has been used for counting before or if it's a number
        const messageContent = message.content.trim();
        const number = parseInt(messageContent);
        
        if (!isNaN(number) && messageContent === number.toString()) {
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
    }
};

// Register the message event
const originalExecute = module.exports.execute;
module.exports.execute = async function(interaction, client) {
    await originalExecute(interaction, client);
    
    // Register message event if not already registered
    if (!client._countingEventRegistered) {
        client.on(Events.MessageCreate, (message) => {
            module.exports.messageCreate.execute(message, client);
        });
        client._countingEventRegistered = true;
    }
};
