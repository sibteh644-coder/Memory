export default {
    name: 'messageCreate',

    async execute(message) {
        // Ignore bots
        if (message.author.bot) return;

        // Only work in the specified channel
        if (message.channel.id !== '1478900615265386596') return;

        // Only respond to exactly ".end"
        if (message.content.trim().toLowerCase() !== '.end') return;

        try {
            // Find the bot's existing end message
            const messages = await message.channel.messages.fetch({
                limit: 50
            });

            const existingMessage = messages.find(
                msg =>
                    msg.author.id === message.client.user.id &&
                    msg.content === '# The raid has ended, you can leave now. ⚠️'
            );

            if (existingMessage) {
                // Toggle OFF
                await existingMessage.delete();
            } else {
                // Toggle ON
                await message.channel.send(
                    '# The raid has ended, you can leave now. ⚠️'
                );
            }

        } catch (error) {
            console.error('End command error:', error);
        }
    }
};
