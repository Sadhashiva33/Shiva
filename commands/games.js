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

const coinFlipCommand = {
    data: new SlashCommandBuilder()
        .setName('coinflip')
        .setDescription('Flip a coin'),
    
    async execute(interaction) {
        const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
        const emoji = result === 'Heads' ? '🪙' : '🔘';
        
        const embed = new EmbedBuilder()
            .setColor('#C0C0C0')
            .setTitle(`${emoji} Coin Flip`)
            .setDescription(`The coin landed on **${result}**!`)
            .setTimestamp();
            
        await interaction.reply({ embeds: [embed] });
    }
};

const rpsCommand = {
    data: new SlashCommandBuilder()
        .setName('rps')
        .setDescription('Play Rock Paper Scissors against the bot')
        .addStringOption(option =>
            option.setName('choice')
                .setDescription('Your choice')
                .setRequired(true)
                .addChoices(
                    { name: 'Rock', value: 'rock' },
                    { name: 'Paper', value: 'paper' },
                    { name: 'Scissors', value: 'scissors' }
                )),
    
    async execute(interaction) {
        const userChoice = interaction.options.getString('choice');
        const botChoices = ['rock', 'paper', 'scissors'];
        const botChoice = botChoices[Math.floor(Math.random() * botChoices.length)];
        
        const choices = {
            rock: '🪨',
            paper: '📄', 
            scissors: '✂️'
        };
        
        let result = '';
        let color = '#FFFF00';
        
        if (userChoice === botChoice) {
            result = "It's a tie!";
            color = '#FFFF00';
        } else if (
            (userChoice === 'rock' && botChoice === 'scissors') ||
            (userChoice === 'paper' && botChoice === 'rock') ||
            (userChoice === 'scissors' && botChoice === 'paper')
        ) {
            result = 'You win!';
            color = '#00FF00';
        } else {
            result = 'I win!';
            color = '#FF0000';
        }
        
        const embed = new EmbedBuilder()
            .setColor(color)
            .setTitle('🎮 Rock Paper Scissors')
            .addFields(
                { name: 'Your choice', value: `${choices[userChoice]} ${userChoice}`, inline: true },
                { name: 'My choice', value: `${choices[botChoice]} ${botChoice}`, inline: true },
                { name: 'Result', value: result, inline: false }
            )
            .setTimestamp();
            
        await interaction.reply({ embeds: [embed] });
    }
};

const randomNumberCommand = {
    data: new SlashCommandBuilder()
        .setName('randomnumber')
        .setDescription('Generate a random number')
        .addIntegerOption(option =>
            option.setName('min')
                .setDescription('Minimum number')
                .setRequired(false))
        .addIntegerOption(option =>
            option.setName('max')
                .setDescription('Maximum number')
                .setRequired(false)),
    
    async execute(interaction) {
        const min = interaction.options.getInteger('min') || 1;
        const max = interaction.options.getInteger('max') || 100;
        
        if (min >= max) {
            return interaction.reply({ content: '❌ Minimum must be less than maximum!', ephemeral: true });
        }
        
        const randomNum = Math.floor(Math.random() * (max - min + 1)) + min;
        
        const embed = new EmbedBuilder()
            .setColor('#9932CC')
            .setTitle('🔢 Random Number')
            .setDescription(`Your random number between **${min}** and **${max}** is: **${randomNum}**`)
            .setTimestamp();
            
        await interaction.reply({ embeds: [embed] });
    }
};

const trivia = [
    { question: "What is the capital of Japan?", answer: "Tokyo" },
    { question: "How many continents are there?", answer: "7" },
    { question: "What is the largest planet in our solar system?", answer: "Jupiter" },
    { question: "What year did World War II end?", answer: "1945" },
    { question: "What is the chemical symbol for gold?", answer: "Au" },
    { question: "Who painted the Mona Lisa?", answer: "Leonardo da Vinci" },
    { question: "What is the fastest land animal?", answer: "Cheetah" },
    { question: "How many sides does a hexagon have?", answer: "6" }
];

const triviaCommand = {
    data: new SlashCommandBuilder()
        .setName('trivia')
        .setDescription('Answer a trivia question'),
    
    async execute(interaction) {
        const randomTrivia = trivia[Math.floor(Math.random() * trivia.length)];
        
        const embed = new EmbedBuilder()
            .setColor('#4169E1')
            .setTitle('🧠 Trivia Question')
            .setDescription(randomTrivia.question)
            .setFooter({ text: 'Type your answer in the chat!' })
            .setTimestamp();
            
        await interaction.reply({ embeds: [embed] });
        
        // Set up answer collector
        const filter = m => m.author.id === interaction.user.id;
        const collector = interaction.channel.createMessageCollector({ filter, time: 30000, max: 1 });
        
        collector.on('collect', m => {
            const userAnswer = m.content.toLowerCase().trim();
            const correctAnswer = randomTrivia.answer.toLowerCase();
            
            if (userAnswer === correctAnswer || userAnswer.includes(correctAnswer)) {
                const successEmbed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle('✅ Correct!')
                    .setDescription(`**${randomTrivia.answer}** is the right answer!`)
                    .setTimestamp();
                    
                interaction.followUp({ embeds: [successEmbed] });
            } else {
                const failEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('❌ Wrong!')
                    .setDescription(`The correct answer was **${randomTrivia.answer}**`)
                    .setTimestamp();
                    
                interaction.followUp({ embeds: [failEmbed] });
            }
        });
        
        collector.on('end', collected => {
            if (collected.size === 0) {
                const timeoutEmbed = new EmbedBuilder()
                    .setColor('#FFA500')
                    .setTitle('⏰ Time\'s up!')
                    .setDescription(`The correct answer was **${randomTrivia.answer}**`)
                    .setTimestamp();
                    
                interaction.followUp({ embeds: [timeoutEmbed] });
            }
        });
    }
};

module.exports = {
    commands: [diceCommand, eightBallCommand, countCommand, coinFlipCommand, rpsCommand, randomNumberCommand, triviaCommand]
};
