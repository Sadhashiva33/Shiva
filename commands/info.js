const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { version } = require('../package.json');

const botInfoCommand = {
    data: new SlashCommandBuilder()
        .setName('botinfo')
        .setDescription('Display bot information and stats'),
    
    async execute(interaction) {
        const uptime = process.uptime();
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor(uptime / 3600) % 24;
        const minutes = Math.floor(uptime / 60) % 60;
        const seconds = Math.floor(uptime % 60);
        
        const botLatency = Date.now() - interaction.createdTimestamp;
        const apiLatency = Math.round(interaction.client.ws.ping);
        
        // Memory usage
        const memUsage = process.memoryUsage();
        const memUsed = Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100;
        const memTotal = Math.round(memUsage.heapTotal / 1024 / 1024 * 100) / 100;
        
        // Guild and user count
        const guildCount = interaction.client.guilds.cache.size;
        const userCount = interaction.client.users.cache.size;
        const channelCount = interaction.client.channels.cache.size;
        
        const embed = new EmbedBuilder()
            .setColor('#7289DA')
            .setTitle('🤖 Maestro Bot Information')
            .setThumbnail(interaction.client.user.displayAvatarURL())
            .addFields(
                { name: '📊 Bot Stats', value: 
                    `**Servers:** ${guildCount}\n` +
                    `**Users:** ${userCount}\n` +
                    `**Channels:** ${channelCount}\n` +
                    `**Commands:** 29`, inline: true },
                    
                { name: '🏓 Latency', value: 
                    `**Bot:** ${botLatency}ms\n` +
                    `**API:** ${apiLatency}ms\n` +
                    `**Status:** ${apiLatency < 200 ? '🟢 Good' : apiLatency < 500 ? '🟡 Fair' : '🔴 Poor'}`, inline: true },
                    
                { name: '💾 System', value: 
                    `**Memory:** ${memUsed}MB / ${memTotal}MB\n` +
                    `**Node.js:** ${process.version}\n` +
                    `**Uptime:** ${days}d ${hours}h ${minutes}m`, inline: true },
                    
                { name: '⚙️ Features', value: 
                    '🎵 Music Player\n' +
                    '🔊 TTS Announcements\n' +
                    '🎮 Games & Fun\n' +
                    '🛡️ Moderation Tools\n' +
                    '📝 Action Logging\n' +
                    '⚡ Prefix & Slash Commands', inline: false }
            )
            .setFooter({ text: `Maestro • Made with ❤️`, iconURL: interaction.client.user.displayAvatarURL() })
            .setTimestamp();
            
        await interaction.reply({ embeds: [embed] });
    }
};

const statusCommand = {
    data: new SlashCommandBuilder()
        .setName('status')
        .setDescription('Check detailed bot status and performance'),
    
    async execute(interaction) {
        await interaction.deferReply();
        
        const start = Date.now();
        
        // Test database response
        const dbStart = Date.now();
        try {
            const { getGuildSetting } = require('../utils/database');
            await getGuildSetting(interaction.guildId, 'test', false);
        } catch (error) {
            console.error('Database test error:', error);
        }
        const dbLatency = Date.now() - dbStart;
        
        // Test music queue access
        const queueLatency = Date.now();
        const queue = interaction.client.musicQueues.get(interaction.guildId);
        const queueTime = Date.now() - queueLatency;
        
        const totalTime = Date.now() - start;
        const botLatency = Date.now() - interaction.createdTimestamp;
        const apiLatency = Math.round(interaction.client.ws.ping);
        
        // System info
        const cpuUsage = process.cpuUsage();
        const memUsage = process.memoryUsage();
        
        const embed = new EmbedBuilder()
            .setColor(apiLatency < 200 ? '#00FF00' : apiLatency < 500 ? '#FFA500' : '#FF0000')
            .setTitle('📈 Bot Status & Performance')
            .addFields(
                { name: '🏓 Latency Tests', value: 
                    `**Bot Response:** ${botLatency}ms\n` +
                    `**Discord API:** ${apiLatency}ms\n` +
                    `**Database:** ${dbLatency}ms\n` +
                    `**Queue Access:** ${queueTime}ms\n` +
                    `**Total Test:** ${totalTime}ms`, inline: true },
                    
                { name: '🎵 Music System', value: 
                    `**Queue Status:** ${queue ? '🟢 Active' : '🔴 Inactive'}\n` +
                    `**Songs Queued:** ${queue ? queue.songs.length : 0}\n` +
                    `**Currently Playing:** ${queue && queue.isPlaying ? '🟢 Yes' : '🔴 No'}\n` +
                    `**Voice Connected:** ${queue && queue.connection ? '🟢 Yes' : '🔴 No'}`, inline: true },
                    
                { name: '💻 System Resources', value: 
                    `**Memory Used:** ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB\n` +
                    `**Memory Total:** ${Math.round(memUsage.heapTotal / 1024 / 1024)}MB\n` +
                    `**External Memory:** ${Math.round(memUsage.external / 1024 / 1024)}MB\n` +
                    `**Process ID:** ${process.pid}`, inline: true },
                    
                { name: '🔧 Health Check', value: 
                    `${apiLatency < 200 ? '🟢' : apiLatency < 500 ? '🟡' : '🔴'} **API Connection**\n` +
                    `${dbLatency < 100 ? '🟢' : dbLatency < 300 ? '🟡' : '🔴'} **Database**\n` +
                    `${interaction.client.guilds.cache.size > 0 ? '🟢' : '🔴'} **Guild Cache**\n` +
                    `${interaction.client.user.presence.status === 'online' ? '🟢' : '🔴'} **Bot Status**`, inline: false }
            )
            .setTimestamp();
            
        await interaction.editReply({ embeds: [embed] });
    }
};

module.exports = {
    commands: [botInfoCommand, statusCommand]
};