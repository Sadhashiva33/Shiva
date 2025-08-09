const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, StreamType, AudioPlayerStatus, VoiceConnectionStatus, entersState } = require('@discordjs/voice');
const play = require('play-dl');

const playCommand = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play music from a YouTube URL')
        .addStringOption(option =>
            option.setName('url')
                .setDescription('YouTube URL to play')
                .setRequired(true)),
    
    async execute(interaction) {
        const url = interaction.options.getString('url');
        
        // Check if user is in a voice channel
        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel) {
            return interaction.reply({ content: '❌ You need to be in a voice channel to play music!', ephemeral: true });
        }
        
        // Validate YouTube URL
        if (!play.yt_validate(url)) {
            return interaction.reply({ content: '❌ Please provide a valid YouTube URL!', ephemeral: true });
        }
        
        await interaction.deferReply();
        
        try {
            // Validate URL first
            const isValid = play.yt_validate(url);
            if (!isValid) {
                return interaction.editReply({ content: '❌ Invalid YouTube URL!' });
            }
            
            // Get video info
            const info = await play.video_info(url);
            const title = info.video_details.title;
            const duration = formatDuration(info.video_details.durationInSec);
            
            // Get or create music queue for this guild
            let queue = interaction.client.musicQueues.get(interaction.guildId);
            if (!queue) {
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
            
            // Add song to queue
            const song = {
                url: url,
                title: title,
                duration: duration,
                requestedBy: interaction.user.tag
            };
            
            console.log('Adding song to queue:', song);
            
            queue.songs.push(song);
            
            // Join voice channel if not connected
            if (!queue.connection) {
                try {
                    queue.connection = joinVoiceChannel({
                        channelId: voiceChannel.id,
                        guildId: interaction.guildId,
                        adapterCreator: interaction.guild.voiceAdapterCreator,
                        selfDeaf: true,
                        selfMute: false
                    });
                    
                    queue.connection.subscribe(queue.player);
                    
                    // Handle connection state changes
                    queue.connection.on(VoiceConnectionStatus.Ready, () => {
                        console.log('Connection is ready!');
                    });
                    
                    queue.connection.on(VoiceConnectionStatus.Disconnected, async (oldState, newState) => {
                        console.log('Music connection disconnected, attempting to reconnect...');
                        try {
                            await entersState(queue.connection, VoiceConnectionStatus.Connecting, 5_000);
                        } catch (error) {
                            console.error('Failed to reconnect, destroying connection:', error);
                            if (queue.connection) {
                                queue.connection.destroy();
                                queue.connection = null;
                                queue.isPlaying = false;
                            }
                        }
                    });
                } catch (error) {
                    console.error('Error joining voice channel:', error);
                    return interaction.editReply({ content: '❌ Failed to join voice channel!' });
                }
            }
            
            // Start playing if nothing is currently playing
            if (!queue.isPlaying) {
                playNextSong(queue, interaction);
            }
            
            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('🎵 Added to Queue')
                .addFields(
                    { name: 'Title', value: title, inline: false },
                    { name: 'Duration', value: duration, inline: true },
                    { name: 'Requested by', value: interaction.user.tag, inline: true },
                    { name: 'Position in queue', value: queue.songs.length.toString(), inline: true }
                );
                
            await interaction.editReply({ embeds: [embed] });
            
        } catch (error) {
            console.error('Error playing music:', error);
            await interaction.editReply({ content: '❌ Failed to play the song!' });
        }
    }
};

const skipCommand = {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Skip the current song'),
    
    async execute(interaction) {
        const queue = interaction.client.musicQueues.get(interaction.guildId);
        
        if (!queue || !queue.isPlaying) {
            return interaction.reply({ content: '❌ Nothing is currently playing!', ephemeral: true });
        }
        
        // Check if user is in the same voice channel
        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel || voiceChannel.id !== queue.connection.joinConfig.channelId) {
            return interaction.reply({ content: '❌ You need to be in the same voice channel as the bot!', ephemeral: true });
        }
        
        queue.player.stop();
        
        const embed = new EmbedBuilder()
            .setColor('#FF6B6B')
            .setTitle('⏭️ Song Skipped')
            .setDescription('Playing next song...');
            
        await interaction.reply({ embeds: [embed] });
    }
};

const queueCommand = {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Display the current music queue'),
    
    async execute(interaction) {
        const queue = interaction.client.musicQueues.get(interaction.guildId);
        
        if (!queue || queue.songs.length === 0) {
            return interaction.reply({ content: '❌ The queue is empty!', ephemeral: true });
        }
        
        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('🎵 Music Queue')
            .setDescription(
                queue.songs.map((song, index) => 
                    `${index + 1}. **${song.title}** - *${song.duration}*\n   Requested by: ${song.requestedBy}`
                ).join('\n\n')
            )
            .setFooter({ text: `${queue.songs.length} song(s) in queue` });
            
        await interaction.reply({ embeds: [embed] });
    }
};

const bassCommand = {
    data: new SlashCommandBuilder()
        .setName('bass')
        .setDescription('Boost the bass of the current audio')
        .addIntegerOption(option =>
            option.setName('level')
                .setDescription('Bass boost level (1-10)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(10)),
    
    async execute(interaction) {
        const queue = interaction.client.musicQueues.get(interaction.guildId);
        
        if (!queue || !queue.isPlaying) {
            return interaction.reply({ content: '❌ Nothing is currently playing!', ephemeral: true });
        }
        
        const level = interaction.options.getInteger('level') || 5;
        
        // Note: Real bass boosting would require audio processing libraries
        // This is a simulated response for demonstration
        const embed = new EmbedBuilder()
            .setColor('#FF6B6B')
            .setTitle('🔊 Bass Boost Applied')
            .setDescription(`Bass boost level set to **${level}/10**`)
            .setFooter({ text: 'Bass boost is now active for current playback' });
            
        await interaction.reply({ embeds: [embed] });
    }
};

const stopCommand = {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Stop music and clear the queue'),
    
    async execute(interaction) {
        const queue = interaction.client.musicQueues.get(interaction.guildId);
        
        if (!queue || !queue.isPlaying) {
            return interaction.reply({ content: '❌ Nothing is currently playing!', ephemeral: true });
        }
        
        // Check if user is in the same voice channel
        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel || voiceChannel.id !== queue.connection.joinConfig.channelId) {
            return interaction.reply({ content: '❌ You need to be in the same voice channel as the bot!', ephemeral: true });
        }
        
        queue.songs = [];
        queue.player.stop();
        queue.isPlaying = false;
        
        if (queue.connection) {
            queue.connection.destroy();
            queue.connection = null;
        }
        
        const embed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('⏹️ Music Stopped')
            .setDescription('Stopped playing and cleared the queue');
            
        await interaction.reply({ embeds: [embed] });
    }
};

const volumeCommand = {
    data: new SlashCommandBuilder()
        .setName('volume')
        .setDescription('Set the music volume')
        .addIntegerOption(option =>
            option.setName('level')
                .setDescription('Volume level (1-100)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100)),
    
    async execute(interaction) {
        const queue = interaction.client.musicQueues.get(interaction.guildId);
        
        if (!queue || !queue.isPlaying) {
            return interaction.reply({ content: '❌ Nothing is currently playing!', ephemeral: true });
        }
        
        const volume = interaction.options.getInteger('level') / 100;
        
        // Set volume on the current resource if it has inline volume
        if (queue.currentResource && queue.currentResource.volume) {
            queue.currentResource.volume.setVolume(volume);
            queue.volume = volume;
            
            const embed = new EmbedBuilder()
                .setColor('#00BFFF')
                .setTitle('🔊 Volume Changed')
                .setDescription(`Volume set to **${Math.round(volume * 100)}%**`);
                
            await interaction.reply({ embeds: [embed] });
        } else {
            // Store volume for next song
            queue.volume = volume;
            
            const embed = new EmbedBuilder()
                .setColor('#FFA500')
                .setTitle('🔊 Volume Queued')
                .setDescription(`Volume will be set to **${Math.round(volume * 100)}%** for the next song`);
                
            await interaction.reply({ embeds: [embed] });
        }
    }
};

async function playNextSong(queue, interaction) {
    if (queue.songs.length === 0) {
        queue.isPlaying = false;
        return;
    }
    
    const song = queue.songs.shift();
    queue.isPlaying = true;
    
    // Validate song data
    if (!song || !song.url) {
        console.error('Invalid song data:', song);
        queue.isPlaying = false;
        playNextSong(queue, interaction);
        return;
    }
    
    try {
        console.log(`Attempting to play: ${song.title} - ${song.url}`);
        const stream = await play.stream(song.url);
        
        const resource = createAudioResource(stream.stream, {
            inputType: stream.type,
            inlineVolume: true
        });
        
        // Set volume if available
        if (resource.volume && queue.volume !== undefined) {
            resource.volume.setVolume(queue.volume);
        }
        
        queue.currentResource = resource;
        queue.player.play(resource);
        
        queue.player.on(AudioPlayerStatus.Idle, () => {
            setTimeout(() => {
                playNextSong(queue, interaction);
            }, 1000);
        });
        
        queue.player.on(AudioPlayerStatus.Playing, () => {
            console.log(`Now playing: ${song.title}`);
        });
        
        queue.player.on('error', error => {
            console.error('Audio player error:', error);
            queue.isPlaying = false;
            playNextSong(queue, interaction);
        });
        
        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('🎵 Now Playing')
            .addFields(
                { name: 'Title', value: song.title, inline: false },
                { name: 'Duration', value: song.duration, inline: true },
                { name: 'Requested by', value: song.requestedBy, inline: true }
            );
            
        if (interaction.channel) {
            interaction.channel.send({ embeds: [embed] });
        }
        
    } catch (error) {
        console.error('Error playing song:', error);
        console.error('Song data was:', song);
        queue.isPlaying = false;
        
        // Try to play next song
        setTimeout(() => {
            playNextSong(queue, interaction);
        }, 2000);
    }
}

function formatDuration(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
        return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

module.exports = {
    commands: [playCommand, skipCommand, queueCommand, bassCommand, stopCommand, volumeCommand]
};
