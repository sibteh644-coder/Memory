export default {
    name: 'messageCreate',

    async execute(message) {
        if (message.author.bot) return;
        if (!message.guild) return;

        if (message.content.trim().toLowerCase() !== '?unlock') return;

        if (!message.member.permissions.has('ManageChannels')) {
            return message.reply('You need the **Manage Channels** permission.');
        }

        const channel = message.channel;

        try {
            // Unlock @everyone
            await channel.permissionOverwrites.edit(
                message.guild.roles.everyone,
                {
                    SendMessages: null
                }
            );

            // Remove the SendMessages override from roles
            for (const overwrite of channel.permissionOverwrites.cache.values()) {
                if (overwrite.id === message.guild.roles.everyone.id) continue;

                const role = message.guild.roles.cache.get(overwrite.id);

                if (role) {
                    await channel.permissionOverwrites.edit(role, {
                        SendMessages: null
                    });
                }
            }

            await message.reply(' This channel has been unlocked.');
        } catch (error) {
            console.error('Unlock command error:', error);
            await message.reply('I could not unlock this channel.');
        }
    }
};
