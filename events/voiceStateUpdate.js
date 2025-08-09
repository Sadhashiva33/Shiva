const { joinVoiceChannel, createAudioPlayer, AudioPlayerStatus } = require('@discordjs/voice');
const { getGuildSetting } = require('../utils/database');
const { playTTSAnnouncement } = require('../utils/tts');

module.exports = {
    name: 'voiceStateUpdate',
    async execute(oldState, newState, client) {
        const guildId = newState.guild.id;
        
        // Check if TTS announcements are enabled for this guild
        const ttsEnabled = await getGuildSetting(guildId, 'tts_announcements', false);
        if (!ttsEnabled) return;
        
        const member = newState.member;
        if (!member || member.user.bot) return; // Ignore bots
        
        let announcementText = null;
        let targetChannel = null;
        
        // User joined a voice channel
        if (!oldState.channel && newState.channel) {
            announcementText = `${member.displayName} has joined the channel`;
            targetChannel = newState.channel;
        }
        // User left a voice channel
        else if (oldState.channel && !newState.channel) {
            announcementText = `${member.displayName} has left the channel`;
            targetChannel = oldState.channel;
        }
        // User moved between channels
        else if (oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id) {
            // Announce in the new channel
            announcementText = `${member.displayName} has joined the channel`;
            targetChannel = newState.channel;
            
            // Also announce in the old channel after a delay
            setTimeout(async () => {
                await makeAnnouncement(
                    client,
                    oldState.channel,
                    `${member.displayName} has left the channel`
                );
            }, 1000);
        }
        
        if (announcementText && targetChannel) {
            await makeAnnouncement(client, targetChannel, announcementText);
        }
    },
};

async function makeAnnouncement(client, channel, text) {
    try {
        // Don't announce if the channel is empty (except for the bot)
        const nonBotMembers = channel.members.filter(member => !member.user.bot);
        if (nonBotMembers.size === 0) return;
        
        // Check if bot has permission to connect to the voice channel
        const permissions = channel.permissionsFor(client.user);
        if (!permissions.has('Connect') || !permissions.has('Speak')) {
            console.log(`Missing permissions for voice channel: ${channel.name}`);
            return;
        }
        
        // Create a temporary voice connection for the announcement
        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
        });
        
        const player = createAudioPlayer();
        connection.subscribe(player);
        
        // Play the TTS announcement
        await playTTSAnnouncement(connection, player, text);
        
    } catch (error) {
        console.error('Error making TTS announcement:', error);
    }
}
