const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, StreamType, AudioPlayerStatus, VoiceConnectionStatus, entersState } = require('@discordjs/voice');
const play = require('play-dl');

// Enhanced music commands inspired by professional music bots
const playMusicCommand = {
    data: new SlashCommandBuilder()
        .setName('music')
        .setDescription('Advanced music player with search and queue management')
        .addSubcommand(subcommand =>
            subcommand
                .setName('play')
                .setDescription('Play music from YouTube or search')
                .addStringOption(option =>
                    option.setName('query')
                        .setDescription('YouTube URL or search terms')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('search')
                .setDescription('Search for music on YouTube')
                .addStringOption(option =>
                    option.setName('query')
                        .setDescription('Search terms')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('skip')
                .setDescription('Skip the current song'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('stop')
                .setDescription('Stop music and clear queue'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('queue')
                .setDescription('Show the current music queue'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('nowplaying')
                .setDescription('Show currently playing song'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('shuffle')
                .setDescription('Shuffle the current queue'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('loop')
                .setDescription('Toggle loop mode')
                .addStringOption(option =>
                    option.setName('mode')
                        .setDescription('Loop mode')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Off', value: 'off' },
                            { name: 'Song', value: 'song' },
                            { name: 'Queue', value: 'queue' }
                        ))),
    
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        
        // Check if user is in a voice channel
        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel && !['queue', 'nowplaying'].includes(subcommand)) {
            return interaction.reply({ content: '❌ You need to be in a voice channel to use music commands!', ephemeral: true });
        }
        
        switch (subcommand) {
            case 'play':
                await handlePlay(interaction);
                break;
            case 'search':
                await handleSearch(interaction);
                break;
            case 'skip':
                await handleSkip(interaction);
                break;
            case 'stop':
                await handleStop(interaction);
                break;
            case 'queue':
                await handleQueue(interaction);
                break;
            case 'nowplaying':
                await handleNowPlaying(interaction);
                break;
            case 'shuffle':
                await handleShuffle(interaction);
                break;
            case 'loop':
                await handleLoop(interaction);
                break;
        }
    }
};

async function handlePlay(interaction) {
    const query = interaction.options.getString('query');
    const voiceChannel = interaction.member.voice.channel;
    
    await interaction.deferReply();
    
    try {
        let url = query;
        
        // If not a YouTube URL, search for it
        if (!play.yt_validate(query)) {
            const searchResults = await play.search(query, { limit: 1 });
            if (searchResults.length === 0) {
                return interaction.editReply({ content: '❌ No results found for your search!' });
            }
            url = searchResults[0].url;
        }
        
        // Get video info
        const info = await play.video_info(url);
        const title = info.video_details.title;
        const duration = formatDuration(info.video_details.durationInSec);
        const thumbnail = info.video_details.thumbnails[0]?.url;
        
        // Get or create enhanced music queue
        let queue = interaction.client.musicQueues.get(interaction.guildId);
        if (!queue) {
            queue = {
                songs: [],
                player: createAudioPlayer(),
                connection: null,
                isPlaying: false,
                volume: 0.5,
                currentResource: null,
                loopMode: 'off', // off, song, queue
                currentSong: null
            };
            interaction.client.musicQueues.set(interaction.guildId, queue);
        }
        
        // Add song to queue
        const song = {
            url: url,
            title: title,
            duration: duration,
            thumbnail: thumbnail,
            requestedBy: interaction.user.tag,
            addedAt: Date.now()
        };
        
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
                
                // Enhanced connection handling
                queue.connection.on(VoiceConnectionStatus.Ready, () => {
                    console.log('Music connection established!');
                });
                
                queue.connection.on(VoiceConnectionStatus.Disconnected, async () => {
                    try {
                        await entersState(queue.connection, VoiceConnectionStatus.Connecting, 5_000);
                    } catch (error) {
                        console.error('Connection lost, cleaning up...');
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
        
        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('✅ Added to Queue')
            .setDescription(`**${title}**`)
            .addFields(
                { name: '⏱️ Duration', value: duration, inline: true },
                { name: '👤 Requested by', value: interaction.user.username, inline: true },
                { name: '📍 Position in Queue', value: queue.songs.length.toString(), inline: true }
            )
            .setThumbnail(thumbnail)
            .setTimestamp();
            
        await interaction.editReply({ embeds: [embed] });
        
        // Start playing if nothing is currently playing
        if (!queue.isPlaying) {
            await playNextSong(queue, interaction);
        }
        
    } catch (error) {
        console.error('Error in music play:', error);
        await interaction.editReply({ content: '❌ Failed to add song to queue!' });
    }
}

async function handleSearch(interaction) {
    const query = interaction.options.getString('query');
    
    await interaction.deferReply();
    
    try {
        const searchResults = await play.search(query, { limit: 5 });
        
        if (searchResults.length === 0) {
            return interaction.editReply({ content: '❌ No results found!' });
        }
        
        const embed = new EmbedBuilder()
            .setColor('#7289DA')
            .setTitle('🔍 Search Results')
            .setDescription(`Results for: **${query}**`)
            .setTimestamp();
            
        searchResults.forEach((result, index) => {
            const duration = formatDuration(result.durationInSec);
            embed.addFields({
                name: `${index + 1}. ${result.title}`,
                value: `Duration: ${duration} | Channel: ${result.channel?.name || 'Unknown'}`,
                inline: false
            });
        });
        
        embed.setFooter({ text: 'Use /music play <URL> to add a song to the queue' });
        
        await interaction.editReply({ embeds: [embed] });
        
    } catch (error) {
        console.error('Search error:', error);
        await interaction.editReply({ content: '❌ Search failed!' });
    }
}

async function handleSkip(interaction) {
    const queue = interaction.client.musicQueues.get(interaction.guildId);
    
    if (!queue || !queue.isPlaying) {
        return interaction.reply({ content: '❌ Nothing is currently playing!', ephemeral: true });
    }
    
    const currentSong = queue.currentSong;
    queue.player.stop();
    
    const embed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('⏭️ Song Skipped')
        .setDescription(currentSong ? `Skipped: **${currentSong.title}**` : 'Skipped current song')
        .setFooter({ text: `Skipped by ${interaction.user.username}` })
        .setTimestamp();
        
    await interaction.reply({ embeds: [embed] });
}

async function handleStop(interaction) {
    const queue = interaction.client.musicQueues.get(interaction.guildId);
    
    if (!queue) {
        return interaction.reply({ content: '❌ No music queue found!', ephemeral: true });
    }
    
    queue.songs = [];
    queue.isPlaying = false;
    queue.currentSong = null;
    queue.player.stop();
    
    if (queue.connection) {
        queue.connection.destroy();
        queue.connection = null;
    }
    
    const embed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('⏹️ Music Stopped')
        .setDescription('Queue cleared and disconnected from voice channel')
        .setFooter({ text: `Stopped by ${interaction.user.username}` })
        .setTimestamp();
        
    await interaction.reply({ embeds: [embed] });
}

async function handleQueue(interaction) {
    const queue = interaction.client.musicQueues.get(interaction.guildId);
    
    if (!queue || queue.songs.length === 0) {
        return interaction.reply({ content: '❌ The queue is empty!', ephemeral: true });
    }
    
    const embed = new EmbedBuilder()
        .setColor('#7289DA')
        .setTitle('📋 Music Queue')
        .setDescription(`**${queue.songs.length}** songs in queue | Loop: **${queue.loopMode}**`)
        .setTimestamp();
        
    // Show current song if playing
    if (queue.currentSong) {
        embed.addFields({
            name: '🎵 Now Playing',
            value: `**${queue.currentSong.title}**\nRequested by: ${queue.currentSong.requestedBy}`,
            inline: false
        });
    }
    
    // Show next songs in queue
    const upNext = queue.songs.slice(0, 10);
    if (upNext.length > 0) {
        const queueList = upNext.map((song, index) => 
            `**${index + 1}.** ${song.title} - *${song.duration}*`
        ).join('\n');
        
        embed.addFields({
            name: '⏭️ Up Next',
            value: queueList,
            inline: false
        });
        
        if (queue.songs.length > 10) {
            embed.addFields({
                name: '➕ More',
                value: `And ${queue.songs.length - 10} more songs...`,
                inline: false
            });
        }
    }
    
    await interaction.reply({ embeds: [embed] });
}

async function handleNowPlaying(interaction) {
    const queue = interaction.client.musicQueues.get(interaction.guildId);
    
    if (!queue || !queue.currentSong) {
        return interaction.reply({ content: '❌ Nothing is currently playing!', ephemeral: true });
    }
    
    const song = queue.currentSong;
    const playTime = Math.floor((Date.now() - song.startedAt) / 1000);
    const progressBar = createProgressBar(playTime, song.durationInSec || 0);
    
    const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('🎵 Now Playing')
        .setDescription(`**${song.title}**`)
        .addFields(
            { name: '👤 Requested by', value: song.requestedBy, inline: true },
            { name: '⏱️ Duration', value: song.duration, inline: true },
            { name: '🔊 Volume', value: `${Math.round((queue.volume || 0.5) * 100)}%`, inline: true },
            { name: '📊 Progress', value: progressBar, inline: false }
        )
        .setThumbnail(song.thumbnail)
        .setTimestamp();
        
    await interaction.reply({ embeds: [embed] });
}

async function handleShuffle(interaction) {
    const queue = interaction.client.musicQueues.get(interaction.guildId);
    
    if (!queue || queue.songs.length === 0) {
        return interaction.reply({ content: '❌ The queue is empty!', ephemeral: true });
    }
    
    // Shuffle the queue
    for (let i = queue.songs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [queue.songs[i], queue.songs[j]] = [queue.songs[j], queue.songs[i]];
    }
    
    const embed = new EmbedBuilder()
        .setColor('#9932CC')
        .setTitle('🔀 Queue Shuffled')
        .setDescription(`Shuffled **${queue.songs.length}** songs`)
        .setFooter({ text: `Shuffled by ${interaction.user.username}` })
        .setTimestamp();
        
    await interaction.reply({ embeds: [embed] });
}

async function handleLoop(interaction) {
    const mode = interaction.options.getString('mode');
    const queue = interaction.client.musicQueues.get(interaction.guildId);
    
    if (!queue) {
        return interaction.reply({ content: '❌ No music queue found!', ephemeral: true });
    }
    
    queue.loopMode = mode;
    
    const modeEmojis = {
        'off': '❌',
        'song': '🔂',
        'queue': '🔁'
    };
    
    const embed = new EmbedBuilder()
        .setColor('#00BFFF')
        .setTitle(`${modeEmojis[mode]} Loop Mode Changed`)
        .setDescription(`Loop mode set to: **${mode.charAt(0).toUpperCase() + mode.slice(1)}**`)
        .setFooter({ text: `Changed by ${interaction.user.username}` })
        .setTimestamp();
        
    await interaction.reply({ embeds: [embed] });
}

// Enhanced playNextSong function with loop support
async function playNextSong(queue, interaction) {
    if (queue.songs.length === 0 && queue.loopMode !== 'song') {
        queue.isPlaying = false;
        queue.currentSong = null;
        return;
    }
    
    let song;
    
    if (queue.loopMode === 'song' && queue.currentSong) {
        song = queue.currentSong;
    } else {
        song = queue.songs.shift();
        
        if (queue.loopMode === 'queue' && song) {
            queue.songs.push(song);
        }
    }
    
    if (!song) {
        queue.isPlaying = false;
        queue.currentSong = null;
        return;
    }
    
    queue.isPlaying = true;
    queue.currentSong = song;
    song.startedAt = Date.now();
    
    try {
        console.log(`Playing: ${song.title}`);
        const stream = await play.stream(song.url);
        
        const resource = createAudioResource(stream.stream, {
            inputType: stream.type,
            inlineVolume: true
        });
        
        if (resource.volume && queue.volume !== undefined) {
            resource.volume.setVolume(queue.volume);
        }
        
        queue.currentResource = resource;
        queue.player.play(resource);
        
        // Remove old listeners to prevent memory leaks
        queue.player.removeAllListeners(AudioPlayerStatus.Idle);
        queue.player.removeAllListeners('error');
        
        queue.player.once(AudioPlayerStatus.Idle, () => {
            setTimeout(() => {
                playNextSong(queue, interaction);
            }, 1000);
        });
        
        queue.player.once('error', error => {
            console.error('Audio player error:', error);
            queue.isPlaying = false;
            setTimeout(() => {
                playNextSong(queue, interaction);
            }, 2000);
        });
        
    } catch (error) {
        console.error('Error playing song:', error);
        queue.isPlaying = false;
        setTimeout(() => {
            playNextSong(queue, interaction);
        }, 2000);
    }
}

function formatDuration(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function createProgressBar(current, total, length = 20) {
    if (total === 0) return '▬'.repeat(length);
    
    const progress = Math.floor((current / total) * length);
    const bar = '█'.repeat(progress) + '▬'.repeat(length - progress);
    
    const currentTime = formatDuration(current);
    const totalTime = formatDuration(total);
    
    return `${currentTime} ${bar} ${totalTime}`;
}

module.exports = {
    commands: [playMusicCommand]
};