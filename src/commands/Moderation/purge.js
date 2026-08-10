import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';

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

    async execute(interaction) {
        const amount = interaction.options.getInteger('amount');

        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return interaction.reply({
                content: 'You need the **Manage Messages** permission to use this command.'
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
                content: 'I could not delete those messages.'
            });
        }
    },

    async prefixExecute(interaction) {
        const amount = interaction.options.getInteger('amount');

        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return interaction.reply({
                content: 'You need the **Manage Messages** permission to use this command.'
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
                content: 'I could not delete those messages.'
            });
        }
    }
};
