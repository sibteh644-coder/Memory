export default {
    name: 'messageCreate',

    async execute(message) {
        if (message.author.bot) return;
        if (!message.guild) return;

        // Command
        if (message.content.trim().toLowerCase() !== '?lock') return;

        // Check permission
        if (!message.member.permissions.has('ManageChannels')) {
            return message.reply('You need the **Manage Channels** permission.');
        }

        const channel = message.channel;

        try {
            // Lock the current channel for @everyone
            await channel.permissionOverwrites.edit(
                message.guild.roles.everyone,
                {
                    SendMessages: false
                }
            );

            await message.reply('🔒 This channel has been locked.');
        } catch (error) {
            console.error('Lock command error:', error);
            await message.reply('I could not lock this channel.');
        }
    }
};
