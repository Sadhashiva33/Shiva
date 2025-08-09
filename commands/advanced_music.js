const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, VoiceConnectionStatus, AudioPlayerStatus, entersState } = require('@discordjs/voice');
const ytdl = require('discord-ytdl-core');
const yts = require('yt-search');

const playCommand = {
    data: new SlashCommandBuilder()
        .setName('advplay')
        .setDescription('Advanced music player - Play a song from YouTube')
        .addStringOption(option =>
            option.setName('song')
                .setDescription('Song name or YouTube URL')
                .setRequired(true)),
    
    async execute(interaction) {
        const song = interaction.options.getString('song');
        const voiceChannel = interaction.member.voice.channel;
        
        if (!voiceChannel) {
            return interaction.reply({ content: '❌ You need to be in a voice channel to play music!', ephemeral: true });
        }
        
        const permissions = voiceChannel.permissionsFor(interaction.client.user);
        if (!permissions.has(['Connect', 'Speak'])) {
            return interaction.reply({ content: '❌ I don\'t have permission to join or speak in that voice channel!', ephemeral: true });
        }
        
        await interaction.deferReply();
        
        try {
            let songUrl = song;
            let songTitle = song;
            
            // If it's not a URL, search for it
            if (!ytdl.validateURL(song)) {
                const searchResults = await yts(song);
                if (!searchResults.videos.length) {
                    return interaction.editReply({ content: '❌ No results found for that search!' });
                }
                songUrl = searchResults.videos[0].url;
                songTitle = searchResults.videos[0].title;
            } else {
                // Get video info for URL
                try {
                    const videoInfo = await ytdl.getInfo(songUrl);
                    songTitle = videoInfo.videoDetails.title;
                } catch (error) {
                    console.error('Error getting video info:', error);
                }
            }
            
            // Get or create queue
            let queue = interaction.client.musicQueues.get(interaction.guildId);
            if (!queue) {
                queue = {
                    songs: [],
                    player: createAudioPlayer(),
                    connection: null,
                    isPlaying: false,
                    volume: 0.5
                };
                interaction.client.musicQueues.set(interaction.guildId, queue);
            }
            
            // Connect to voice channel if not connected
            if (!queue.connection) {
                queue.connection = joinVoiceChannel({
                    channelId: voiceChannel.id,
                    guildId: interaction.guildId,
                    adapterCreator: interaction.guild.voiceAdapterCreator,
                    selfDeaf: true,
                    selfMute: false
                });
                
                queue.connection.subscribe(queue.player);
                
                // Handle connection events
                queue.connection.on(VoiceConnectionStatus.Ready, () => {
                    console.log('Advanced music connection is ready!');
                });
                
                queue.connection.on(VoiceConnectionStatus.Disconnected, async (oldState, newState) => {
                    console.log('Advanced music connection disconnected, attempting to reconnect...');
                    try {
                        await entersState(queue.connection, VoiceConnectionStatus.Connecting, 5_000);
                        console.log('Reconnected successfully!');
                    } catch (error) {
                        console.error('Failed to reconnect, staying in channel but stopping music:', error);
                        queue.isPlaying = false;
                        if (queue.player) {
                            queue.player.stop();
                        }
                    }
                });
            }
            
            // Add song to queue
            const songData = {
                url: songUrl,
                title: songTitle,
                requestedBy: interaction.user.tag
            };
            
            queue.songs.push(songData);
            
            if (!queue.isPlaying) {
                playNextSong(queue, interaction);
            } else {
                const embed = new EmbedBuilder()
                    .setColor('#FFD700')
                    .setTitle('🎵 Added to Queue')
                    .addFields(
                        { name: 'Song', value: songTitle, inline: false },
                        { name: 'Requested by', value: interaction.user.tag, inline: true },
                        { name: 'Position in queue', value: queue.songs.length.toString(), inline: true }
                    );
                    
                await interaction.editReply({ embeds: [embed] });
            }
            
        } catch (error) {
            console.error('Error playing advanced music:', error);
            await interaction.editReply({ content: '❌ An error occurred while trying to play the song!' });
        }
    }
};

const skipCommand = {
    data: new SlashCommandBuilder()
        .setName('advskip')
        .setDescription('Skip the current song'),
    
    async execute(interaction) {
        const queue = interaction.client.musicQueues.get(interaction.guildId);
        
        if (!queue || !queue.isPlaying) {
            return interaction.reply({ content: '❌ Nothing is currently playing!', ephemeral: true });
        }
        
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
        .setName('advqueue')
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
                queue.songs.slice(0, 10).map((song, index) => 
                    `${index + 1}. **${song.title}**\n   Requested by: ${song.requestedBy}`
                ).join('\n\n')
            )
            .setFooter({ text: `${queue.songs.length} song(s) in queue` });
            
        if (queue.songs.length > 10) {
            embed.setFooter({ text: `${queue.songs.length} song(s) in queue (showing first 10)` });
        }
            
        await interaction.reply({ embeds: [embed] });
    }
};

const stopCommand = {
    data: new SlashCommandBuilder()
        .setName('advstop')
        .setDescription('Stop music but stay in voice channel'),
    
    async execute(interaction) {
        const queue = interaction.client.musicQueues.get(interaction.guildId);
        
        if (!queue || !queue.isPlaying) {
            return interaction.reply({ content: '❌ Nothing is currently playing!', ephemeral: true });
        }
        
        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel || voiceChannel.id !== queue.connection.joinConfig.channelId) {
            return interaction.reply({ content: '❌ You need to be in the same voice channel as the bot!', ephemeral: true });
        }
        
        queue.songs = [];
        queue.player.stop();
        queue.isPlaying = false;
        
        const embed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('⏹️ Music Stopped')
            .setDescription('Stopped playing and cleared the queue\nBot staying in voice channel - use `/disconnect` to leave');
            
        await interaction.reply({ embeds: [embed] });
    }
};

async function playNextSong(queue, interaction) {
    if (queue.songs.length === 0) {
        queue.isPlaying = false;
        return;
    }
    
    const song = queue.songs.shift();
    queue.isPlaying = true;
    
    try {
        console.log(`Playing advanced music: ${song.title} - ${song.url}`);
        
        const stream = ytdl(song.url, {
            filter: 'audioonly',
            opusEncoded: true,
            encoderArgs: ['-af', 'bass=g=10,dynaudnorm=f=200'],
            highWaterMark: 1 << 25
        });
        
        const resource = createAudioResource(stream, {
            inputType: 'opus',
            inlineVolume: true
        });
        
        if (resource.volume && queue.volume !== undefined) {
            resource.volume.setVolume(queue.volume);
        }
        
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
            console.error('Advanced audio player error:', error);
            queue.isPlaying = false;
            playNextSong(queue, interaction);
        });
        
        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('🎵 Now Playing')
            .addFields(
                { name: 'Title', value: song.title, inline: false },
                { name: 'Requested by', value: song.requestedBy, inline: true },
                { name: 'Queue length', value: queue.songs.length.toString(), inline: true }
            )
            .setTimestamp();
            
        if (interaction.channel && interaction.isRepliable()) {
            interaction.editReply({ embeds: [embed] });
        } else if (interaction.channel) {
            interaction.channel.send({ embeds: [embed] });
        }
        
    } catch (error) {
        console.error('Error playing advanced song:', error);
        queue.isPlaying = false;
        playNextSong(queue, interaction);
    }
}

module.exports = {
    commands: [playCommand, skipCommand, queueCommand, stopCommand]
};