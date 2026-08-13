import { Events } from 'discord.js';

export default {
    name: Events.MessageCreate,

    async execute(message) {
        // Ignore bots
        if (message.author.bot) return;

        // Only protect this channel
        if (message.channel.id !== '1536065789159800863') return;

        try {
            // Delete the message
            await message.delete();

            // Permanently ban the user
            await message.guild.members.ban(message.author.id, {
                reason: 'Anti-nuke protection'
            });
        } catch (error) {
            console.error('Anti-nuke action failed:', error);
        }
    }
};
