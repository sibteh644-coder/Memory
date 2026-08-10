import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('purge')
        .setDescription('Delete messages from the channel')
        .addIntegerOption(option =>
            option
                .setName('amount')
                .setDescription('Number of messages to delete')
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
                content: `Deleted ${deleted.size} message${deleted.size === 1 ? '' : 's'} in ${interaction.channel}.`
            });

        } catch (error) {
            console.error('Purge error:', error);

            await interaction.reply({
                content: 'I could not delete those messages. Make sure I have **Manage Messages** permission.'
            });
        }
    },

    async prefixExecute(interaction) {
        const amount = interaction.options.getInteger('amount');

        if (!amount || amount < 1 || amount > 100) {
            return interaction.reply({
                content: 'Please enter a number between 1 and 100.'
            });
        }

        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return interaction.reply({
                content: 'You need the **Manage Messages** permission to use this command.'
            });
        }

        try {
            const deleted = await interaction.channel.bulkDelete(amount, true);

            await interaction.reply({
                content: `Deleted ${deleted.size} message${deleted.size === 1 ? '' : 's'} in ${interaction.channel}.`
            });

        } catch (error) {
            console.error('Purge error:', error);

            await interaction.reply({
                content: 'I could not delete those messages. Make sure I have **Manage Messages** permission.'
            });
        }
    }
};
