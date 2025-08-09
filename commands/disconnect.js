const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const disconnectCommand = {
    data: new SlashCommandBuilder()
        .setName('disconnect')
        .setDescription('Disconnect bot from voice channel'),
    
    async execute(interaction) {
        const queue = interaction.client.musicQueues.get(interaction.guildId);
        
        if (!queue || !queue.connection) {
            return interaction.reply({ content: '❌ I\'m not connected to a voice channel!', ephemeral: true });
        }
        
        // Stop music and clear queue
        queue.songs = [];
        queue.isPlaying = false;
        queue.player.stop();
        
        // Disconnect from voice channel
        if (queue.connection) {
            queue.connection.destroy();
            queue.connection = null;
        }
        
        // Clean up the queue
        interaction.client.musicQueues.delete(interaction.guildId);
        
        const embed = new EmbedBuilder()
            .setColor('#FF6B6B')
            .setTitle('👋 Disconnected')
            .setDescription('Left the voice channel and cleared the queue')
            .setFooter({ text: `Disconnected by ${interaction.user.username}` })
            .setTimestamp();
            
        await interaction.reply({ embeds: [embed] });
    }
};

const joinCommand = {
    data: new SlashCommandBuilder()
        .setName('join')
        .setDescription('Join your voice channel'),
    
    async execute(interaction) {
        const voiceChannel = interaction.member.voice.channel;
        
        if (!voiceChannel) {
            return interaction.reply({ content: '❌ You need to be in a voice channel first!', ephemeral: true });
        }
        
        const permissions = voiceChannel.permissionsFor(interaction.client.user);
        if (!permissions.has(['Connect', 'Speak'])) {
            return interaction.reply({ content: '❌ I don\'t have permission to join or speak in that voice channel!', ephemeral: true });
        }
        
        try {
            const { joinVoiceChannel } = require('@discordjs/voice');
            
            let queue = interaction.client.musicQueues.get(interaction.guildId);
            if (!queue) {
                const { createAudioPlayer } = require('@discordjs/voice');
                queue = {
                    songs: [],
                    player: createAudioPlayer(),
                    connection: null,
                    isPlaying: false,
                    volume: 0.5,
                    currentResource: null
                };
                interaction.client.musicQueues.set(interaction.guildId, queue);
            }
            
            if (!queue.connection) {
                queue.connection = joinVoiceChannel({
                    channelId: voiceChannel.id,
                    guildId: interaction.guildId,
                    adapterCreator: interaction.guild.voiceAdapterCreator,
                    selfDeaf: true,
                    selfMute: false
                });
                
                queue.connection.subscribe(queue.player);
            }
            
            const embed = new EmbedBuilder()
                .setColor('#4CAF50')
                .setTitle('✅ Joined Voice Channel')
                .setDescription(`Connected to **${voiceChannel.name}**`)
                .addFields(
                    { name: '🔊 Channel', value: voiceChannel.name, inline: true },
                    { name: '👥 Members', value: voiceChannel.members.size.toString(), inline: true }
                )
                .setFooter({ text: `Joined by ${interaction.user.username}` })
                .setTimestamp();
                
            await interaction.reply({ embeds: [embed] });
            
        } catch (error) {
            console.error('Error joining voice channel:', error);
            await interaction.reply({ content: '❌ Failed to join voice channel!', ephemeral: true });
        }
    }
};

module.exports = {
    commands: [disconnectCommand, joinCommand]
};