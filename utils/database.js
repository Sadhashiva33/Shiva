const fs = require('fs').promises;
const path = require('path');

// Simple JSON-based database for storing bot data
const DB_FILE = path.join(__dirname, '..', 'data.json');

// Default data structure
const defaultData = {
    guilds: {},
    channels: {},
    users: {}
};

/**
 * Load data from the JSON file
 * @returns {Promise<Object>} - The loaded data
 */
async function loadData() {
    try {
        const data = await fs.readFile(DB_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        // File doesn't exist or is invalid, return default data
        return { ...defaultData };
    }
}

/**
 * Save data to the JSON file
 * @param {Object} data - The data to save
 */
async function saveData(data) {
    try {
        await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error saving data:', error);
    }
}

/**
 * Get a guild setting
 * @param {string} guildId - The guild ID
 * @param {string} key - The setting key
 * @param {*} defaultValue - Default value if setting doesn't exist
 * @returns {Promise<*>} - The setting value
 */
async function getGuildSetting(guildId, key, defaultValue = null) {
    const data = await loadData();
    return data.guilds[guildId]?.[key] ?? defaultValue;
}

/**
 * Set a guild setting
 * @param {string} guildId - The guild ID
 * @param {string} key - The setting key
 * @param {*} value - The value to set
 */
async function setGuildSetting(guildId, key, value) {
    const data = await loadData();
    
    if (!data.guilds[guildId]) {
        data.guilds[guildId] = {};
    }
    
    data.guilds[guildId][key] = value;
    await saveData(data);
}

/**
 * Get channel count for counting game
 * @param {string} channelId - The channel ID
 * @returns {Promise<number>} - The current count
 */
async function getChannelCount(channelId) {
    const data = await loadData();
    return data.channels[channelId]?.count ?? 0;
}

/**
 * Set channel count for counting game
 * @param {string} channelId - The channel ID
 * @param {number} count - The count to set
 */
async function setChannelCount(channelId, count) {
    const data = await loadData();
    
    if (!data.channels[channelId]) {
        data.channels[channelId] = {};
    }
    
    data.channels[channelId].count = count;
    data.channels[channelId].lastUser = null;
    await saveData(data);
}

/**
 * Update channel count and last user for counting game
 * @param {string} channelId - The channel ID
 * @param {number} count - The new count
 * @param {string} userId - The user who counted
 */
async function updateChannelCount(channelId, count, userId) {
    const data = await loadData();
    
    if (!data.channels[channelId]) {
        data.channels[channelId] = {};
    }
    
    data.channels[channelId].count = count;
    data.channels[channelId].lastUser = userId;
    await saveData(data);
}

/**
 * Get last user who counted in a channel
 * @param {string} channelId - The channel ID
 * @returns {Promise<string|null>} - The last user ID or null
 */
async function getLastCountUser(channelId) {
    const data = await loadData();
    return data.channels[channelId]?.lastUser ?? null;
}

module.exports = {
    getGuildSetting,
    setGuildSetting,
    getChannelCount,
    setChannelCount,
    updateChannelCount,
    getLastCountUser
};
