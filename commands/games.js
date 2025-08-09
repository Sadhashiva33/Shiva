const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config');

const diceCommand = {
    data: new SlashCommandBuilder()
        .setName('dice')
        .setDescription('Roll a six-sided die'),
    
    async execute(interaction) {
        const roll = Math.floor(Math.random() * 6) + 1;
        
        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🎲 Dice Roll')
            .setDescription(`You rolled a **${roll}**!`)
            .setTimestamp();
            
        await interaction.reply({ embeds: [embed] });
    }
};

const eightBallCommand = {
    data: new SlashCommandBuilder()
        .setName('8ball')
        .setDescription('Ask the magic 8-ball a question')
        .addStringOption(option =>
            option.setName('question')
                .setDescription('Your question for the 8-ball')
                .setRequired(false)),
    
    async execute(interaction) {
        const question = interaction.options.getString('question') || 'No question asked';
        const response = config.eightBallResponses[Math.floor(Math.random() * config.eightBallResponses.length)];
        
        const embed = new EmbedBuilder()
            .setColor('#800080')
            .setTitle('🎱 Magic 8-Ball')
            .addFields(
                { name: 'Question', value: question, inline: false },
                { name: 'Answer', value: `*${response}*`, inline: false }
            )
            .setTimestamp();
            
        await interaction.reply({ embeds: [embed] });
    }
};

const countCommand = {
    data: new SlashCommandBuilder()
        .setName('count')
        .setDescription('Start or check the counting game in this channel'),
    
    async execute(interaction) {
        const { getChannelCount, setChannelCount } = require('../utils/database');
        
        const currentCount = await getChannelCount(interaction.channelId);
        
        const embed = new EmbedBuilder()
            .setColor('#00BFFF')
            .setTitle('🔢 Counting Game')
            .setDescription(
                `Current count: **${currentCount}**\n\n` +
                `Next number to count: **${currentCount + 1}**\n\n` +
                `Just type the next number in this channel to continue the count!\n` +
                `If someone types the wrong number, the count resets to 0.`
            )
            .setFooter({ text: 'The bot automatically tracks counting in this channel' });
            
        await interaction.reply({ embeds: [embed] });
    }
};

module.exports = {
    commands: [diceCommand, eightBallCommand, countCommand]
};
