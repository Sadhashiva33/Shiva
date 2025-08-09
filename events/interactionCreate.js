module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        // Handle slash commands
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            
            if (!command) {
                console.error(`No command matching ${interaction.commandName} was found.`);
                return;
            }
            
            try {
                await command.execute(interaction);
            } catch (error) {
                console.error('Error executing command:', error);
                
                const errorMessage = {
                    content: '❌ There was an error while executing this command!',
                    ephemeral: true
                };
                
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(errorMessage);
                } else {
                    await interaction.reply(errorMessage);
                }
            }
        }
    },
};
