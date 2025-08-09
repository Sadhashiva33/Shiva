module.exports = {
    token: process.env.DISCORD_TOKEN || 'your_bot_token_here',
    clientId: process.env.CLIENT_ID || 'your_client_id_here',
    guildId: process.env.GUILD_ID || null, // Leave null for global commands
    
    // Music settings
    maxQueueSize: 50,
    defaultVolume: 0.5,
    
    // TTS settings
    ttsLanguage: 'en-US',
    ttsSpeed: 1.0,
    
    // Bot settings
    embedColor: '#FF6B6B',
    ownerIds: process.env.OWNER_IDS ? process.env.OWNER_IDS.split(',') : [],
    
    // 8ball responses
    eightBallResponses: [
        "It is certain",
        "It is decidedly so",
        "Without a doubt",
        "Yes definitely",
        "You may rely on it",
        "As I see it, yes",
        "Most likely",
        "Outlook good",
        "Yes",
        "Signs point to yes",
        "Reply hazy, try again",
        "Ask again later",
        "Better not tell you now",
        "Cannot predict now",
        "Concentrate and ask again",
        "Don't count on it",
        "My reply is no",
        "My sources say no",
        "Outlook not so good",
        "Very doubtful"
    ]
};
