const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const pingCommand = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Check bot latency and response time'),
    
    async execute(interaction) {
        const sent = await interaction.reply({ content: 'Pinging...', fetchReply: true });
        
        const botLatency = sent.createdTimestamp - interaction.createdTimestamp;
        const apiLatency = Math.round(interaction.client.ws.ping);
        
        // Create status color based on latency
        let color = '#00FF00'; // Green for good
        if (apiLatency > 200) color = '#FFA500'; // Orange for fair
        if (apiLatency > 500) color = '#FF0000'; // Red for poor
        
        const embed = new EmbedBuilder()
            .setColor(color)
            .setTitle('🏓 Pong!')
            .addFields(
                { name: '📡 Bot Latency', value: `${botLatency}ms`, inline: true },
                { name: '💝 API Latency', value: `${apiLatency}ms`, inline: true },
                { name: '📊 Status', value: apiLatency < 200 ? '🟢 Excellent' : apiLatency < 500 ? '🟡 Good' : '🔴 Poor', inline: true }
            )
            .setFooter({ text: `Requested by ${interaction.user.username}` })
            .setTimestamp();
            
        await interaction.editReply({ content: '', embeds: [embed] });
    }
};

const uptimeCommand = {
    data: new SlashCommandBuilder()
        .setName('uptime')
        .setDescription('Check how long the bot has been running'),
    
    async execute(interaction) {
        const uptime = process.uptime();
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor(uptime / 3600) % 24;
        const minutes = Math.floor(uptime / 60) % 60;
        const seconds = Math.floor(uptime % 60);
        
        const embed = new EmbedBuilder()
            .setColor('#7289DA')
            .setTitle('⏰ Bot Uptime')
            .setDescription(`**${days}** days, **${hours}** hours, **${minutes}** minutes, **${seconds}** seconds`)
            .addFields(
                { name: '🖥️ Process ID', value: process.pid.toString(), inline: true },
                { name: '⚡ Node.js Version', value: process.version, inline: true },
                { name: '💾 Memory Usage', value: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`, inline: true }
            )
            .setTimestamp();
            
        await interaction.reply({ embeds: [embed] });
    }
};

module.exports = {
    commands: [pingCommand, uptimeCommand]
};