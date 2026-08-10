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

    prefixOnly: true,

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
                content: `Purged ${deleted.size} message${deleted.size === 1 ? '' : 's'}.`
            });

            setTimeout(() => {
                interaction.deleteReply().catch(() => {});
            }, 3000);

        } catch (error) {
            console.error('Purge error:', error);

            await interaction.reply({
                content: 'I could not delete those messages. Make sure I have **Manage Messages** permission.'
            });
        }
    }
};
