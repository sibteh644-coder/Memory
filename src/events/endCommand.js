export default {
    name: 'messageCreate',

    async execute(message) {
        if (message.author.bot) return;
        if (!message.guild) return;

        // Only work in this channel
        if (message.channel.id !== '1478900615265386596') return;

        // Command
        if (message.content.trim().toLowerCase() !== '.end') return;

        // Find existing raid-ended message
        const messages = await message.channel.messages.fetch({ limit: 50 });

        const existingMessage = messages.find(
            msg =>
                msg.author.id === message.client.user.id &&
                msg.content === '# The raid has ended, you can leave now. ⚠️'
        );

        if (existingMessage) {
            // Toggle OFF
            await existingMessage.delete();
            return;
        }

        // Toggle ON
        await message.channel.send(
            '# The raid has ended, you can leave now. ⚠️'
        );
    }
};
