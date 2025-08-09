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

module.exports = {
    commands: [serverInfoCommand, userInfoCommand, ttsVcAnnounceCommand]
};
