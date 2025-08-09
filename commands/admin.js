const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

const slowmodeCommand = {
    data: new SlashCommandBuilder()
        .setName('slowmode')
        .setDescription('Set slowmode for the current channel')
        .addIntegerOption(option =>
            option.setName('seconds')
                .setDescription('Slowmode duration in seconds (0 to disable)')
                .setRequired(true)
                .setMinValue(0)
                .setMaxValue(21600)),
    
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return interaction.reply({ content: '❌ You need "Manage Channels" permission to use this command!', ephemeral: true });
        }
        
        const seconds = interaction.options.getInteger('seconds');
        
        try {
            await interaction.channel.setRateLimitPerUser(seconds);
            
            const embed = new EmbedBuilder()
                .setColor('#00BFFF')
                .setTitle('⏰ Slowmode Updated')
                .setDescription(seconds === 0 ? 'Slowmode disabled' : `Slowmode set to **${seconds}** seconds`)
                .setTimestamp();
                
            await interaction.reply({ embeds: [embed] });
            
            // Log the action
            const { logAction } = require('./utility');
            await logAction(interaction.client, interaction.guildId, {
                action: 'Slowmode Changed',
                moderator: interaction.user.tag,
                channel: interaction.channel.name,
                details: seconds === 0 ? 'Slowmode disabled' : `Set to ${seconds} seconds`
            });
        } catch (error) {
            console.error('Error setting slowmode:', error);
            await interaction.reply({ content: '❌ Failed to set slowmode!', ephemeral: true });
        }
    }
};

const lockCommand = {
    data: new SlashCommandBuilder()
        .setName('lock')
        .setDescription('Lock the current channel')
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for locking the channel')
                .setRequired(false)),
    
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return interaction.reply({ content: '❌ You need "Manage Channels" permission to use this command!', ephemeral: true });
        }
        
        const reason = interaction.options.getString('reason') || 'No reason provided';
        
        try {
            await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
                SendMessages: false
            });
            
            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('🔒 Channel Locked')
                .addFields(
                    { name: 'Reason', value: reason, inline: false },
                    { name: 'Locked by', value: interaction.user.tag, inline: true }
                )
                .setTimestamp();
                
            await interaction.reply({ embeds: [embed] });
            
            // Log the action
            const { logAction } = require('./utility');
            await logAction(interaction.client, interaction.guildId, {
                action: 'Channel Locked',
                moderator: interaction.user.tag,
                channel: interaction.channel.name,
                details: `Reason: ${reason}`
            });
        } catch (error) {
            console.error('Error locking channel:', error);
            await interaction.reply({ content: '❌ Failed to lock the channel!', ephemeral: true });
        }
    }
};

const unlockCommand = {
    data: new SlashCommandBuilder()
        .setName('unlock')
        .setDescription('Unlock the current channel'),
    
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return interaction.reply({ content: '❌ You need "Manage Channels" permission to use this command!', ephemeral: true });
        }
        
        try {
            await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
                SendMessages: null
            });
            
            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('🔓 Channel Unlocked')
                .setDescription(`Channel unlocked by ${interaction.user.tag}`)
                .setTimestamp();
                
            await interaction.reply({ embeds: [embed] });
            
            // Log the action
            const { logAction } = require('./utility');
            await logAction(interaction.client, interaction.guildId, {
                action: 'Channel Unlocked',
                moderator: interaction.user.tag,
                channel: interaction.channel.name,
                details: 'Channel permissions restored'
            });
        } catch (error) {
            console.error('Error unlocking channel:', error);
            await interaction.reply({ content: '❌ Failed to unlock the channel!', ephemeral: true });
        }
    }
};

const nickCommand = {
    data: new SlashCommandBuilder()
        .setName('nick')
        .setDescription('Change a user\'s nickname')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to change nickname for')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('nickname')
                .setDescription('New nickname (leave empty to reset)')
                .setRequired(false)),
    
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageNicknames)) {
            return interaction.reply({ content: '❌ You need "Manage Nicknames" permission to use this command!', ephemeral: true });
        }
        
        const user = interaction.options.getUser('user');
        const nickname = interaction.options.getString('nickname');
        const member = interaction.guild.members.cache.get(user.id);
        
        if (!member) {
            return interaction.reply({ content: '❌ User not found in this server!', ephemeral: true });
        }
        
        try {
            await member.setNickname(nickname);
            
            const embed = new EmbedBuilder()
                .setColor('#9932CC')
                .setTitle('✏️ Nickname Changed')
                .addFields(
                    { name: 'User', value: user.tag, inline: true },
                    { name: 'New Nickname', value: nickname || 'Reset to username', inline: true },
                    { name: 'Changed by', value: interaction.user.tag, inline: true }
                )
                .setTimestamp();
                
            await interaction.reply({ embeds: [embed] });
            
            // Log the action
            const { logAction } = require('./utility');
            await logAction(interaction.client, interaction.guildId, {
                action: 'Nickname Changed',
                moderator: interaction.user.tag,
                details: `${user.tag} nickname changed to: ${nickname || 'Reset'}`
            });
        } catch (error) {
            console.error('Error changing nickname:', error);
            await interaction.reply({ content: '❌ Failed to change nickname!', ephemeral: true });
        }
    }
};

const announceCommand = {
    data: new SlashCommandBuilder()
        .setName('announce')
        .setDescription('Send an announcement to a channel')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Channel to send announcement to')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('message')
                .setDescription('Announcement message')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('title')
                .setDescription('Announcement title')
                .setRequired(false)),
    
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return interaction.reply({ content: '❌ You need "Manage Messages" permission to use this command!', ephemeral: true });
        }
        
        const channel = interaction.options.getChannel('channel');
        const message = interaction.options.getString('message');
        const title = interaction.options.getString('title') || '📢 Announcement';
        
        try {
            const embed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle(title)
                .setDescription(message)
                .setFooter({ text: `Announced by ${interaction.user.tag}` })
                .setTimestamp();
                
            await channel.send({ embeds: [embed] });
            await interaction.reply({ content: `✅ Announcement sent to ${channel}!`, ephemeral: true });
            
            // Log the action
            const { logAction } = require('./utility');
            await logAction(interaction.client, interaction.guildId, {
                action: 'Announcement Sent',
                moderator: interaction.user.tag,
                channel: channel.name,
                details: `Title: ${title}\nMessage: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`
            });
        } catch (error) {
            console.error('Error sending announcement:', error);
            await interaction.reply({ content: '❌ Failed to send announcement!', ephemeral: true });
        }
    }
};

module.exports = {
    commands: [slowmodeCommand, lockCommand, unlockCommand, nickCommand, announceCommand]
};