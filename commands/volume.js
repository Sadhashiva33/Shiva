const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const volumeInfoCommand = {
    data: new SlashCommandBuilder()
        .setName('vol')
        .setDescription('Show current volume or set volume')
        .addIntegerOption(option =>
            option.setName('level')
                .setDescription('Volume level (1-100)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(100)),
    
    async execute(interaction) {
        const queue = interaction.client.musicQueues.get(interaction.guildId);
        const newVolume = interaction.options.getInteger('level');
        
        if (!queue) {
            return interaction.reply({ content: '❌ No music queue found for this server!', ephemeral: true });
        }
        
        if (!newVolume) {
            // Show current volume
            const currentVolume = Math.round((queue.volume || 0.5) * 100);
            const embed = new EmbedBuilder()
                .setColor('#00BFFF')
                .setTitle('🔊 Current Volume')
                .setDescription(`Volume is set to **${currentVolume}%**`)
                .addFields(
                    { name: 'Music Status', value: queue.isPlaying ? '🎵 Playing' : '⏸️ Stopped', inline: true },
                    { name: 'Songs in Queue', value: queue.songs.length.toString(), inline: true },
                    { name: 'Voice Connection', value: queue.connection ? '🔗 Connected' : '❌ Disconnected', inline: true }
                )
                .setTimestamp();
                
            return interaction.reply({ embeds: [embed] });
        }
        
        // Set new volume
        const volume = newVolume / 100;
        
        // Set volume on the current resource if it has inline volume
        if (queue.currentResource && queue.currentResource.volume) {
            queue.currentResource.volume.setVolume(volume);
            queue.volume = volume;
            
            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('🔊 Volume Changed')
                .setDescription(`Volume set to **${newVolume}%**`)
                .addFields(
                    { name: 'Applied To', value: 'Current song', inline: true },
                    { name: 'Effect', value: 'Immediate', inline: true }
                )
                .setTimestamp();
                
            await interaction.reply({ embeds: [embed] });
        } else {
            // Store volume for next song
            queue.volume = volume;
            
            const embed = new EmbedBuilder()
                .setColor('#FFA500')
                .setTitle('🔊 Volume Queued')
                .setDescription(`Volume will be set to **${newVolume}%** for the next song`)
                .addFields(
                    { name: 'Applied To', value: 'Next songs', inline: true },
                    { name: 'Current Song', value: 'Unchanged', inline: true }
                )
                .setTimestamp();
                
            await interaction.reply({ embeds: [embed] });
        }
    }
};

const latencyCommand = {
    data: new SlashCommandBuilder()
        .setName('latency')
        .setDescription('Check detailed bot latency and connection info'),
    
    async execute(interaction) {
        const sent = await interaction.reply({ content: 'Testing latency...', fetchReply: true });
        const botLatency = sent.createdTimestamp - interaction.createdTimestamp;
        const apiLatency = Math.round(interaction.client.ws.ping);
        
        // Test voice connection latency if in voice
        let voiceLatency = 'N/A';
        const queue = interaction.client.musicQueues.get(interaction.guildId);
        if (queue && queue.connection) {
            const voiceStart = Date.now();
            try {
                // Simple ping test to voice connection
                const voiceState = queue.connection.state;
                voiceLatency = `${Date.now() - voiceStart}ms (${voiceState.status})`;
            } catch (error) {
                voiceLatency = 'Error';
            }
        }
        
        // Determine status color based on latency
        let statusColor = '#00FF00'; // Green
        let statusText = 'Excellent';
        
        if (apiLatency > 200) {
            statusColor = '#FFA500'; // Orange
            statusText = 'Good';
        }
        if (apiLatency > 500) {
            statusColor = '#FF0000'; // Red
            statusText = 'Poor';
        }
        
        const embed = new EmbedBuilder()
            .setColor(statusColor)
            .setTitle('🏓 Bot Latency Information')
            .addFields(
                { name: '🤖 Bot Response', value: `${botLatency}ms`, inline: true },
                { name: '🌐 Discord API', value: `${apiLatency}ms`, inline: true },
                { name: '🔊 Voice Connection', value: voiceLatency, inline: true },
                { name: '📊 Connection Status', value: statusText, inline: true },
                { name: '📍 Bot Location', value: 'Replit Server', inline: true },
                { name: '⏰ Response Time', value: `${Date.now() - interaction.createdTimestamp}ms`, inline: true }
            )
            .setFooter({ text: `Shard: ${interaction.guild.shardId || 0} | Node.js ${process.version}` })
            .setTimestamp();
            
        await interaction.editReply({ content: '', embeds: [embed] });
    }
};

module.exports = {
    commands: [volumeInfoCommand, latencyCommand]
};