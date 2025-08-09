const { REST, Routes } = require('discord.js');
const config = require('../config');

module.exports = {
    name: 'ready',
    once: true,
    async execute(client) {
        console.log(`🎵 ${client.user.tag} is now online and ready to conduct your server!`);
        
        // Register slash commands
        const commands = [];
        
        // Collect all commands from the client
        client.commands.forEach(command => {
            commands.push(command.data.toJSON());
        });
        
        const rest = new REST().setToken(config.token);
        
        try {
            console.log('🔄 Started refreshing application (/) commands.');
            console.log(`📋 Commands being registered: ${commands.map(cmd => cmd.name).join(', ')}`);
            
            if (config.guildId) {
                // Register commands for a specific guild (faster for development)
                await rest.put(
                    Routes.applicationGuildCommands(config.clientId, config.guildId),
                    { body: commands },
                );
                console.log(`✅ Successfully reloaded ${commands.length} guild commands.`);
            } else {
                // Register commands globally (takes up to 1 hour to propagate)
                await rest.put(
                    Routes.applicationCommands(config.clientId),
                    { body: commands },
                );
                console.log(`✅ Successfully reloaded ${commands.length} global commands.`);
            }
        } catch (error) {
            console.error('❌ Error registering commands:', error);
        }
        
        // Set bot activity
        client.user.setActivity('🎵 Conducting your server', { type: 'PLAYING' });
    },
};
