const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const serverInfoCommand = {
    data: new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('Display information about the current server'),
    
    async execute(interaction) {
        const guild = interaction.guild;
        const owner = await guild.fetchOwner();
        
        const embed = new EmbedBuilder()
            .setColor('#4CAF50')
            .setTitle(`📊 ${guild.name} Server Information`)
            .setThumbnail(guild.iconURL({ dynamic: true }))
            .addFields(
                { name: '🆔 Server ID', value: guild.id, inline: true },
                { name: '👑 Owner', value: `${owner.user.tag}`, inline: true },
                { name: '👥 Member Count', value: guild.memberCount.toString(), inline: true },
                { name: '📅 Created', value: `<t:${Math.floor(guild.createdAt.getTime() / 1000)}:F>`, inline: true },
                { name: '🚀 Boost Level', value: `Level ${guild.premiumTier}`, inline: true },
                { name: '💎 Boosts', value: guild.premiumSubscriptionCount.toString(), inline: true },
                { name: '📝 Channels', value: guild.channels.cache.size.toString(), inline: true },
                { name: '🎭 Roles', value: guild.roles.cache.size.toString(), inline: true },
                { name: '😀 Emojis', value: guild.emojis.cache.size.toString(), inline: true }
            )
            .setTimestamp();
            
        if (guild.description) {
            embed.setDescription(guild.description);
        }
        
        await interaction.reply({ embeds: [embed] });
    }
};

const userInfoCommand = {
    data: new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('Display information about a user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to get information about')
                .setRequired(false)),
    
    async execute(interaction) {
        const user = interaction.options.getUser('user') || interaction.user;
        const member = interaction.guild.members.cache.get(user.id);
        
        const embed = new EmbedBuilder()
            .setColor('#2196F3')
            .setTitle(`👤 ${user.tag} User Information`)
            .setThumbnail(user.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: '🆔 User ID', value: user.id, inline: true },
                { name: '📅 Account Created', value: `<t:${Math.floor(user.createdAt.getTime() / 1000)}:F>`, inline: true },
                { name: '🤖 Bot', value: user.bot ? 'Yes' : 'No', inline: true }
            );
            
        if (member) {
            embed.addFields(
                { name: '📅 Joined Server', value: `<t:${Math.floor(member.joinedAt.getTime() / 1000)}:F>`, inline: true },
                { name: '🏷️ Nickname', value: member.nickname || 'None', inline: true },
                { name: '🎨 Highest Role', value: member.roles.highest.name, inline: true }
            );
            
            const roles = member.roles.cache
                .filter(role => role.id !== interaction.guildId)
                .map(role => role.toString())
                .slice(0, 10);
                
            if (roles.length > 0) {
                embed.addFields({
                    name: `🎭 Roles [${member.roles.cache.size - 1}]`,
                    value: roles.join(', ') + (member.roles.cache.size > 11 ? '...' : ''),
                    inline: false
                });
            }
        }
        
        embed.setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
    }
};

const ttsVcAnnounceCommand = {
    data: new SlashCommandBuilder()
        .setName('tts-vc-announce')
        .setDescription('Toggle TTS voice channel announcements')
        .addStringOption(option =>
            option.setName('setting')
                .setDescription('Turn announcements on or off')
                .setRequired(true)
                .addChoices(
                    { name: 'On', value: 'on' },
                    { name: 'Off', value: 'off' }
                )),
    
    async execute(interaction) {
        // Check if user has manage guild permissions
        if (!interaction.member.permissions.has('ManageGuild')) {
            return interaction.reply({ content: '❌ You need "Manage Server" permission to use this command!', ephemeral: true });
        }
        
        const setting = interaction.options.getString('setting');
        const { setGuildSetting, getGuildSetting } = require('../utils/database');
        
        await setGuildSetting(interaction.guildId, 'tts_announcements', setting === 'on');
        
        const embed = new EmbedBuilder()
            .setColor(setting === 'on' ? '#00FF00' : '#FF0000')
            .setTitle('🔊 TTS Voice Announcements')
            .setDescription(`Voice channel announcements have been **${setting === 'on' ? 'enabled' : 'disabled'}**`)
            .setTimestamp();
            
        await interaction.reply({ embeds: [embed] });
    }
};

const statusCommand = {
    data: new SlashCommandBuilder()
        .setName('status')
        .setDescription('Check bot latency and response time'),
    
    async execute(interaction) {
        const sent = await interaction.reply({ content: 'Pinging...', fetchReply: true });
        const timeDiff = sent.createdTimestamp - interaction.createdTimestamp;
        
        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('🏓 Pong!')
            .addFields(
                { name: 'Bot Latency', value: `${timeDiff}ms`, inline: true },
                { name: 'API Latency', value: `${Math.round(interaction.client.ws.ping)}ms`, inline: true },
                { name: 'Status', value: '✅ Online', inline: true }
            )
            .setTimestamp();
            
        await interaction.editReply({ content: '', embeds: [embed] });
    }
};

const inviteCommand = {
    data: new SlashCommandBuilder()
        .setName('invite')
        .setDescription('Get the bot invite link'),
    
    async execute(interaction) {
        const inviteLink = `https://discord.com/api/oauth2/authorize?client_id=${interaction.client.user.id}&permissions=8&scope=bot%20applications.commands`;
        
        const embed = new EmbedBuilder()
            .setColor('#7289DA')
            .setTitle('📧 Invite Maestro')
            .setDescription(`Click [here](${inviteLink}) to invite me to your server!`)
            .addFields(
                { name: 'Permissions', value: 'Administrator (recommended)', inline: true },
                { name: 'Features', value: 'Music, Moderation, Games, TTS', inline: true }
            )
            .setTimestamp();
            
        await interaction.reply({ embeds: [embed] });
    }
};

const runtimeCommand = {
    data: new SlashCommandBuilder()
        .setName('runtime')
        .setDescription('Check how long the bot has been running'),
    
    async execute(interaction) {
        const uptime = process.uptime();
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor(uptime / 3600) % 24;
        const minutes = Math.floor(uptime / 60) % 60;
        const seconds = Math.floor(uptime % 60);
        
        const embed = new EmbedBuilder()
            .setColor('#9932CC')
            .setTitle('⏰ Bot Uptime')
            .setDescription(`I've been running for:\n**${days}d ${hours}h ${minutes}m ${seconds}s**`)
            .setTimestamp();
            
        await interaction.reply({ embeds: [embed] });
    }
};

const setLogChannelCommand = {
    data: new SlashCommandBuilder()
        .setName('setlogchannel')
        .setDescription('Set the channel for action logs')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The channel to send logs to')
                .setRequired(true)),
    
    async execute(interaction) {
        // Check if user has manage guild permissions
        if (!interaction.member.permissions.has('ManageGuild')) {
            return interaction.reply({ content: '❌ You need "Manage Server" permission to use this command!', ephemeral: true });
        }
        
        const channel = interaction.options.getChannel('channel');
        const { setGuildSetting } = require('../utils/database');
        
        await setGuildSetting(interaction.guildId, 'log_channel', channel.id);
        
        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('📝 Log Channel Set')
            .setDescription(`Action logs will now be sent to ${channel}`)
            .setTimestamp();
            
        await interaction.reply({ embeds: [embed] });
    }
};

const clearCommand = {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Clear messages from the channel')
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Number of messages to delete (1-100)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100)),
    
    async execute(interaction) {
        // Check permissions
        if (!interaction.member.permissions.has('ManageMessages')) {
            return interaction.reply({ content: '❌ You need "Manage Messages" permission to use this command!', ephemeral: true });
        }
        
        const amount = interaction.options.getInteger('amount');
        
        try {
            const messages = await interaction.channel.messages.fetch({ limit: amount });
            await interaction.channel.bulkDelete(messages);
            
            const embed = new EmbedBuilder()
                .setColor('#FF6B6B')
                .setTitle('🧹 Messages Cleared')
                .setDescription(`Successfully deleted **${amount}** messages`)
                .setTimestamp();
                
            await interaction.reply({ embeds: [embed], ephemeral: true });
            
            // Log the action
            await logAction(interaction.client, interaction.guildId, {
                action: 'Messages Cleared',
                moderator: interaction.user.tag,
                channel: interaction.channel.name,
                details: `${amount} messages deleted`
            });
            
        } catch (error) {
            console.error('Error clearing messages:', error);
            await interaction.reply({ content: '❌ Failed to clear messages!', ephemeral: true });
        }
    }
};

async function logAction(client, guildId, logData) {
    try {
        const { getGuildSetting } = require('../utils/database');
        const logChannelId = await getGuildSetting(guildId, 'log_channel');
        
        if (!logChannelId) return;
        
        const logChannel = client.channels.cache.get(logChannelId);
        if (!logChannel) return;
        
        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('📋 Action Log')
            .addFields(
                { name: 'Action', value: logData.action, inline: true },
                { name: 'Moderator', value: logData.moderator, inline: true },
                { name: 'Details', value: logData.details, inline: false }
            )
            .setTimestamp();
            
        if (logData.channel) {
            embed.addFields({ name: 'Channel', value: logData.channel, inline: true });
        }
        
        await logChannel.send({ embeds: [embed] });
    } catch (error) {
        console.error('Error logging action:', error);
    }
}

module.exports = {
    commands: [serverInfoCommand, userInfoCommand, ttsVcAnnounceCommand, statusCommand, inviteCommand, runtimeCommand, setLogChannelCommand, clearCommand],
    logAction
};
