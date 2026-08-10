export default {
    name: 'messageCreate',

    async execute(message) {
        if (message.author.bot) return;
        if (!message.guild) return;

        const args = message.content.trim().split(/\s+/);

        if (args[0].toLowerCase() !== '?purge') return;

        const amount = Number(args[1]);

        if (!Number.isInteger(amount) || amount < 1 || amount > 100) {
            await message.reply('Please enter a number between 1 and 100.');
            return;
        }

        try {
            const deleted = await message.channel.bulkDelete(amount, true);

            const confirmation = await message.channel.send(
                `Purged ${deleted.size} message${deleted.size === 1 ? '' : 's'}.`
            );

            setTimeout(() => {
                confirmation.delete().catch(() => {});
            }, 3000);

        } catch (error) {
            console.error('Purge error:', error);

            await message.reply(
                'I could not delete the messages. Make sure I have **Manage Messages** permission.'
            );
        }
    }
};
