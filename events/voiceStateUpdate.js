// events/voiceStateUpdate.js
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  entersState,
  AudioPlayerStatus,
  VoiceConnectionStatus
} = require('@discordjs/voice');

const { getGuildSetting } = require('../utils/database'); // your DB helper
const gTTS = require('gtts');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Use a Map to store guild-specific data
const GUILD_MAP = new Map(); // guildId -> { connection, musicPlayer, ttsPlayer, ttsQueue:[], isTTSPlaying }

module.exports = {
  name: 'voiceStateUpdate',
  async execute(oldState, newState, client) {
    try {
      const guild = newState.guild || oldState.guild;
      if (!guild) return;
      const guildId = guild.id;

      const ttsEnabled = await getGuildSetting(guildId, 'tts_announcements', false);
      if (!ttsEnabled) return;

      const member = newState.member || oldState.member;
      if (!member || member.user.bot) return;
      if (member.user.id === client.user.id) return;

      // Determine event
      if (!oldState.channelId && newState.channelId) {
        // Joined
        const text = `${member.displayName} joined the voice channel`;
        await queueAnnouncement(client, guildId, newState.channelId, text);
      } else if (oldState.channelId && !newState.channelId) {
        // Left
        const text = `${member.displayName} left the voice channel`;
        await queueAnnouncement(client, guildId, oldState.channelId, text);
      } else if (
        oldState.channelId &&
        newState.channelId &&
        oldState.channelId !== newState.channelId
      ) {
        // Moved: announce join in new channel and leave in old
        const joinText = `${member.displayName} joined ${newState.channel?.name || 'a voice channel'}`;
        const leaveText = `${member.displayName} left ${oldState.channel?.name || 'a voice channel'}`;

        await queueAnnouncement(client, guildId, newState.channelId, joinText);

        setTimeout(() => {
          queueAnnouncement(client, guildId, oldState.channelId, leaveText).catch(err => console.error(err));
        }, 1400);
      }
    } catch (err) {
      console.error('voiceStateUpdate handler error:', err);
    }
  }
};

async function queueAnnouncement(client, guildId, channelId, text) {
  try {
    const channel = await fetchChannel(client, guildId, channelId);
    if (!channel) return;

    // If channel has no non-bot members, skip
    const nonBotMembers = channel.members.filter(m => !m.user.bot);
    if (nonBotMembers.size === 0) return;

    const guildConn = await ensureGuildConnection(client, guildId, channel);
    if (!guildConn) return;

    // Initialize ttsQueue if it doesn't exist
    if (!guildConn.ttsQueue) {
      guildConn.ttsQueue = [];
    }

    guildConn.ttsQueue.push({ text, channelId });
    
    // Use a guild-specific lock for TTS processing
    if (!guildConn.isTTSPlaying) {
      processTTSQueue(client, guildId).catch(err => console.error(`TTS queue error for guild ${guildId}:`, err));
    }
  } catch (err) {
    console.error(`queueAnnouncement error for guild ${guildId}:`, err);
  }
}

async function fetchChannel(client, guildId, channelId) {
  try {
    const guild = client.guilds.cache.get(guildId) || (await client.guilds.fetch(guildId).catch(() => null));
    if (!guild) return null;
    const channel =
      guild.channels.cache.get(channelId) || (await guild.channels.fetch(channelId).catch(() => null));
    return channel?.isVoice() || channel?.type === 2 ? channel : null; // voice channel check
  } catch (err) {
    return null;
  }
}

async function ensureGuildConnection(client, guildId, channel) {
  let guildConn = GUILD_MAP.get(guildId);

  // If connection exists but channel changed, move later before playing
  if (guildConn && guildConn.connection && guildConn.connection.joinConfig.channelId) {
    // valid entry
    return guildConn;
  }

  // Create new guild entry
  try {
    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
      selfDeaf: false,
      selfMute: false
    });

    // players: musicPlayer (for your music system) and ttsPlayer (for announcements)
    const musicPlayer = createAudioPlayer();
    const ttsPlayer = createAudioPlayer();

    // default: subscribe musicPlayer (if you have an external music system, swap in your player)
    connection.subscribe(musicPlayer);

    guildConn = {
      connection,
      musicPlayer,
      ttsPlayer,
      ttsQueue: [],
      isTTSPlaying: false
    };
    GUILD_MAP.set(guildId, guildConn);

    // keep connection healthy
    connection.on('stateChange', (oldState, newState) => {
      if (newState.status === VoiceConnectionStatus.Disconnected) {
        // try to reconnect
        setTimeout(async () => {
          try {
            await entersState(connection, VoiceConnectionStatus.Ready, 15000);
          } catch (e) {
            try { connection.destroy(); } catch {}
            GUILD_MAP.delete(guildId);
          }
        }, 5000);
      } else if (newState.status === VoiceConnectionStatus.Destroyed) {
        GUILD_MAP.delete(guildId);
      }
    });

    return guildConn;
  } catch (err) {
    console.error(`ensureGuildConnection error for guild ${guildId}:`, err);
    return null;
  }
}

async function moveConnectionToChannel(guildConn, channel) {
  try {
    // Only destroy the connection if it's for the same guild
    if (guildConn.connection && guildConn.connection.joinConfig.guildId === channel.guild.id) {
      try { guildConn.connection.destroy(); } catch {}
    }

// Remove the duplicate function. Keep only the following correct implementation.
async function moveConnectionToChannel(guildConn, channel) {
  try {
    if (guildConn.connection && guildConn.connection.joinConfig.channelId !== channel.id) {
      guildConn.connection.rejoin({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator,
        selfDeaf: false,
        selfMute: false,
      });
    }
    return guildConn;
  } catch (err) {
    console.error(`moveConnectionToChannel error for guild ${channel.guild.id}:`, err);
    return null;
  }
}

async function processTTSQueue(client, guildId) {
  const guildConn = GUILD_MAP.get(guildId);
  if (!guildConn) return;
  
  // Prevent concurrent processing for the same guild
  if (guildConn.isTTSPlaying) return;
  guildConn.isTTSPlaying = true;

  try {
    while (guildConn.ttsQueue && guildConn.ttsQueue.length > 0) {
      const item = guildConn.ttsQueue.shift();
      const { text, channelId } = item;

      const channel = await fetchChannel(client, guildId, channelId);
      if (!channel) continue;

      // reconnect/move if channel differs
      if (!guildConn.connection || guildConn.connection.joinConfig.channelId !== channel.id) {
        // check permissions before moving
        const perms = channel.permissionsFor(client.user);
        if (!perms || !perms.has('Connect') || !perms.has('Speak')) {
          continue;
        }
        await moveConnectionToChannel(guildConn, channel);
        try {
          await entersState(guildConn.connection, VoiceConnectionStatus.Ready, 15000);
        } catch (err) {
          console.error(`Failed to move/join for TTS in guild ${guildId}:`, err);
          continue;
        }
      }

      // If channel empty (except bot), skip
      const nonBotMembers = channel.members.filter(m => !m.user.bot);
      if (nonBotMembers.size === 0) continue;

      // Play the TTS using the ttsPlayer; temporarily subscribe it so it takes precedence
      try {
        // subscribe ttsPlayer (takes over audio)
        guildConn.connection.subscribe(guildConn.ttsPlayer);

        // generate TTS file
        const filepath = await generateTTSFile(text);

        // create resource and play
        const resource = createAudioResource(filepath, { inlineVolume: true });
        guildConn.ttsPlayer.play(resource);

        // wait until TTS playback finishes or times out
        try {
          await entersState(guildConn.ttsPlayer, AudioPlayerStatus.Idle, 30000);
        } catch (err) {
          // in case of timeout or error, log and move on
          console.error(`TTS play timeout/error for guild ${guildId}:`, err);
        }

        // cleanup temp file
        fs.unlink(filepath, () => {});

        // restore musicPlayer subscription (if you want music to resume)
        guildConn.connection.subscribe(guildConn.musicPlayer);
      } catch (err) {
        console.error(`Error while playing TTS for guild ${guildId}:`, err);
        // try to recover by re-subscribing music player
        try { guildConn.connection.subscribe(guildConn.musicPlayer); } catch {}
      }
    }
  } catch (err) {
    console.error(`Error in processTTSQueue for guild ${guildId}:`, err);
  } finally {
    // Always make sure to release the lock, even if an error occurs
    if (guildConn) {
      guildConn.isTTSPlaying = false;
    }
  }
}

// create a temp mp3 via gTTS and return filepath
function generateTTSFile(text)
  {
  return new Promise((resolve, reject) => 
    {
    try
    {
      const safeText = String(text).slice(0, 200); // keep small
      const filename = `tts-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.mp3`;
      const filepath = path.join(os.tmpdir(), filename);
      const gtts = new gTTS(safeText, 'en');

      gtts.save(filepath, err =>
        {
        if (err) return reject(err);
        resolve(filepath);
      });
    } catch (err)
    {
      reject(err);
    }
  });
}
