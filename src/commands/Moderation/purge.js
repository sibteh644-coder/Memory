import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('purge')
        .setDescription('Delete messages')
        .addIntegerOption(option =>
            option
                .setName('amount')
                .setDescription('Number of messages to delete (1-100)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {
        const amount = interaction.options.getInteger('amount');

        const deleted = await interaction.channel.bulkDelete(amount, true);

        await interaction.reply({
            content: `Purged ${deleted.size} message${deleted.size === 1 ? '' : 's'}.`
        });

        setTimeout(() => {
            interaction.deleteReply().catch(() => {});
        }, 3000);
    },

    async prefixExecute(interaction) {
        const amount = interaction.options.getInteger('amount');

        if (!Number.isInteger(amount) || amount < 1 || amount > 100) {
            await interaction.reply({
                content: 'Please enter a number between 1 and 100.'
            });
            return;
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
                content: 'I cannot delete messages here. Make sure I have the **Manage Messages** permission.'
            });
        }
    }
};
