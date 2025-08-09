const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, StreamType, AudioPlayerStatus, VoiceConnectionStatus } = require('@discordjs/voice');
const ytdl = require('ytdl-core');

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
        if (!ytdl.validateURL(url)) {
            return interaction.reply({ content: '❌ Please provide a valid YouTube URL!', ephemeral: true });
        }
        
        await interaction.deferReply();
        
        try {
            // Get video info
            const info = await ytdl.getInfo(url);
            const title = info.videoDetails.title;
            const duration = formatDuration(info.videoDetails.lengthSeconds);
            
            // Get or create music queue for this guild
            let queue = interaction.client.musicQueues.get(interaction.guildId);
            if (!queue) {
                queue = {
                    songs: [],
                    player: createAudioPlayer(),
                    connection: null,
                    isPlaying: false
                };
                interaction.client.musicQueues.set(interaction.guildId, queue);
            }
            
            // Add song to queue
            const song = {
                url,
                title,
                duration,
                requestedBy: interaction.user.tag
            };
            
            queue.songs.push(song);
            
            // Join voice channel if not connected
            if (!queue.connection) {
                queue.connection = joinVoiceChannel({
                    channelId: voiceChannel.id,
                    guildId: interaction.guildId,
                    adapterCreator: interaction.guild.voiceAdapterCreator,
                });
                
                queue.connection.subscribe(queue.player);
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

async function playNextSong(queue, interaction) {
    if (queue.songs.length === 0) {
        queue.isPlaying = false;
        return;
    }
    
    const song = queue.songs.shift();
    queue.isPlaying = true;
    
    try {
        const stream = ytdl(song.url, { 
            filter: 'audioonly',
            quality: 'highestaudio',
            highWaterMark: 1 << 25
        });
        
        const resource = createAudioResource(stream, {
            inputType: StreamType.Arbitrary,
        });
        
        queue.player.play(resource);
        
        queue.player.on(AudioPlayerStatus.Idle, () => {
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
        queue.isPlaying = false;
        playNextSong(queue, interaction);
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
    commands: [playCommand, skipCommand, queueCommand]
};
