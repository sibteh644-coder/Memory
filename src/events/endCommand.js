export default {
    name: 'messageCreate',

    async execute(message) {
        if (message.author.bot) return;
        if (!message.guild) return;

        // Only work in this channel
        if (message.channel.id !== '1478900615265386596') return;

        // Only respond to .end
        if (message.content.trim().toLowerCase() !== '.end') return;

        try {
            await message.channel.send(
                '# The raid has ended, you can leave now. ⚠️'
            );
        } catch (error) {
            console.error('End command error:', error);
        }
    }
};
