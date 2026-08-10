import { SlashCommandBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('purge')
        .setDescription('Purge messages')
        .addIntegerOption(option =>
            option
                .setName('amount')
                .setDescription('Number of messages to purge')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100)
        ),

    prefixExecute: async (interaction) => {
        const amount = interaction.options.getInteger('amount');

        if (!amount || amount < 1 || amount > 100) {
            return interaction.reply({
                content: 'Please enter a number between 1 and 100.'
            });
        }

        try {
            const deleted = await interaction.channel.bulkDelete(amount, true);

            await interaction.reply({
                content: `Purged ${deleted.size} message${deleted.size === 1 ? '' : 's'}.`
            });

            setTimeout(() => {
                interaction.deleteReply().catch(() => {});
            }, 3000);

        } catch (error) {
            console.error('Purge error:', error);

            await interaction.reply({
                content: 'I cannot delete messages here. Make sure I have Manage Messages permission.'
            });
        }
    }
};
