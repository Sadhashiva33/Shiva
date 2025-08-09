const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { checkPermissions } = require('../utils/permissions');

const kickCommand = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kick a user from the server')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to kick')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the kick')
                .setRequired(false)),
    
    async execute(interaction) {
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        
        // Check permissions
        if (!checkPermissions(interaction.member, PermissionFlagsBits.KickMembers)) {
            return interaction.reply({ content: '❌ You don\'t have permission to kick members!', ephemeral: true });
        }
        
        const member = interaction.guild.members.cache.get(user.id);
        if (!member) {
            return interaction.reply({ content: '❌ User not found in this server!', ephemeral: true });
        }
        
        if (!member.kickable) {
            return interaction.reply({ content: '❌ I cannot kick this user!', ephemeral: true });
        }
        
        try {
            await member.kick(reason);
            
            const embed = new EmbedBuilder()
                .setColor('#FF6B6B')
                .setTitle('🦶 User Kicked')
                .addFields(
                    { name: 'User', value: `${user.tag} (${user.id})`, inline: true },
                    { name: 'Moderator', value: interaction.user.tag, inline: true },
                    { name: 'Reason', value: reason, inline: false }
                )
                .setTimestamp();
                
            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error kicking user:', error);
            await interaction.reply({ content: '❌ Failed to kick the user!', ephemeral: true });
        }
    }
};

const banCommand = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Ban a user from the server')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to ban')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the ban')
                .setRequired(false)),
    
    async execute(interaction) {
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        
        // Check permissions
        if (!checkPermissions(interaction.member, PermissionFlagsBits.BanMembers)) {
            return interaction.reply({ content: '❌ You don\'t have permission to ban members!', ephemeral: true });
        }
        
        const member = interaction.guild.members.cache.get(user.id);
        if (member && !member.bannable) {
            return interaction.reply({ content: '❌ I cannot ban this user!', ephemeral: true });
        }
        
        try {
            await interaction.guild.members.ban(user, { reason });
            
            const embed = new EmbedBuilder()
                .setColor('#FF6B6B')
                .setTitle('🔨 User Banned')
                .addFields(
                    { name: 'User', value: `${user.tag} (${user.id})`, inline: true },
                    { name: 'Moderator', value: interaction.user.tag, inline: true },
                    { name: 'Reason', value: reason, inline: false }
                )
                .setTimestamp();
                
            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error banning user:', error);
            await interaction.reply({ content: '❌ Failed to ban the user!', ephemeral: true });
        }
    }
};

const muteCommand = {
    data: new SlashCommandBuilder()
        .setName('mute')
        .setDescription('Mute a user for a specified duration')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to mute')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('duration')
                .setDescription('Duration (e.g., 5m, 1h, 2d)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the mute')
                .setRequired(false)),
    
    async execute(interaction) {
        const user = interaction.options.getUser('user');
        const duration = interaction.options.getString('duration');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        
        // Check permissions
        if (!checkPermissions(interaction.member, PermissionFlagsBits.ModerateMembers)) {
            return interaction.reply({ content: '❌ You don\'t have permission to mute members!', ephemeral: true });
        }
        
        const member = interaction.guild.members.cache.get(user.id);
        if (!member) {
            return interaction.reply({ content: '❌ User not found in this server!', ephemeral: true });
        }
        
        // Parse duration
        const timeMs = parseDuration(duration);
        if (!timeMs) {
            return interaction.reply({ content: '❌ Invalid duration format! Use formats like 5m, 1h, 2d', ephemeral: true });
        }
        
        try {
            await member.timeout(timeMs, reason);
            
            const embed = new EmbedBuilder()
                .setColor('#FF6B6B')
                .setTitle('🔇 User Muted')
                .addFields(
                    { name: 'User', value: `${user.tag} (${user.id})`, inline: true },
                    { name: 'Duration', value: duration, inline: true },
                    { name: 'Moderator', value: interaction.user.tag, inline: true },
                    { name: 'Reason', value: reason, inline: false }
                )
                .setTimestamp();
                
            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error muting user:', error);
            await interaction.reply({ content: '❌ Failed to mute the user!', ephemeral: true });
        }
    }
};

function parseDuration(duration) {
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) return null;
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    const multipliers = {
        's': 1000,
        'm': 1000 * 60,
        'h': 1000 * 60 * 60,
        'd': 1000 * 60 * 60 * 24
    };
    
    return value * multipliers[unit];
}

module.exports = {
    commands: [kickCommand, banCommand, muteCommand]
};
