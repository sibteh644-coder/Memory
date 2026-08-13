export default {
    name: 'messageCreate',

    async execute(message) {
        if (message.author.bot) return;
        if (!message.guild) return;

        if (message.content.trim().toLowerCase() !== '?lock') return;

        if (!message.member.permissions.has('ManageChannels')) {
            return message.reply('You need the **Manage Channels** permission.');
        }

        const channel = message.channel;

        try {
            // Lock @everyone
            await channel.permissionOverwrites.edit(
                message.guild.roles.everyone,
                {
                    SendMessages: false
                }
            );

            // Lock every role that currently has permission to send
            for (const overwrite of channel.permissionOverwrites.cache.values()) {
                if (overwrite.id === message.guild.roles.everyone.id) continue;

                const role = message.guild.roles.cache.get(overwrite.id);

                if (role) {
                    await channel.permissionOverwrites.edit(role, {
                        SendMessages: false
                    });
                }
            }

            await message.reply( 'This channel has been locked.');
        } catch (error) {
            console.error('Lock command error:', error);
            await message.reply('I could not lock this channel.');
        }
    }
};
