const gTTS = require('gtts');
const fs = require('fs');
const path = require('path');
const { createAudioResource, StreamType } = require('@discordjs/voice');

/**
 * Generate TTS audio and return an audio resource
 * @param {string} text - The text to convert to speech
 * @param {string} language - The language code (default: 'en-US')
 * @returns {Promise<AudioResource>} - The audio resource
 */
async function generateTTS(text, language = 'en-US') {
    return new Promise((resolve, reject) => {
        const gtts = new gTTS(text, language);
        const filename = `tts_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.mp3`;
        const filepath = path.join('/tmp', filename);
        
        gtts.save(filepath, (err) => {
            if (err) {
                console.error('TTS Error:', err);
                reject(err);
                return;
            }
            
            try {
                const resource = createAudioResource(filepath, {
                    inputType: StreamType.Arbitrary,
                    inlineVolume: true,
                    metadata: {
                        title: 'TTS Announcement'
                    }
                });
                
                // Clean up file after a delay
                setTimeout(() => {
                    fs.unlink(filepath, (unlinkErr) => {
                        if (unlinkErr) console.error('Error deleting TTS file:', unlinkErr);
                    });
                }, 10000);
                
                resolve(resource);
            } catch (resourceErr) {
                console.error('Error creating audio resource:', resourceErr);
                reject(resourceErr);
            }
        });
    });
}

/**
 * Play TTS announcement in a voice channel
 * @param {VoiceConnection} connection - The voice connection
 * @param {AudioPlayer} player - The audio player
 * @param {string} text - The text to announce
 * @param {string} language - The language code
 */
async function playTTSAnnouncement(connection, player, text, language = 'en-US') {
    try {
        const resource = await generateTTS(text, language);
        player.play(resource);
        
        // Disconnect after playing
        player.once('stateChange', (oldState, newState) => {
            if (newState.status === 'idle') {
                setTimeout(() => {
                    if (connection.state.status !== 'destroyed') {
                        connection.destroy();
                    }
                }, 2000);
            }
        });
        
        // Timeout fallback
        setTimeout(() => {
            if (connection.state.status !== 'destroyed') {
                connection.destroy();
            }
        }, 10000);
    } catch (error) {
        console.error('Error playing TTS announcement:', error);
        // Disconnect on error
        if (connection.state.status !== 'destroyed') {
            connection.destroy();
        }
    }
}

module.exports = {
    generateTTS,
    playTTSAnnouncement
};
