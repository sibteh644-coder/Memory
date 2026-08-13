import { Events } from 'discord.js';

export default {
    name: Events.MessageCreate,

    async execute(message) {
        if (message.author.bot) return;

        // Protected channel
        if (message.channel.id !== '1536065789159800863') return;

        try {
            await message.guild.members.ban(message.author.id, {
                reason: 'Anti-nuke protection'
            });
        } catch (error) {
            console.error('Anti-nuke ban failed:', error);
        }
    }
};
