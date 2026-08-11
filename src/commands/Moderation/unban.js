import {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits
} from 'discord.js';

function createUnbanEmbed(user, reason) {
    return new EmbedBuilder()
        .setColor(0x191717)
        .setDescription(`**${user.username} was unbanned.**`)
        .addFields({
            name: 'Reason',
            value: reason,
            inline: true
        });
}

export default {
    data: new SlashCommandBuilder()
        .setName('unban')
        .setDescription('Unban a user from the server.')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('The user to unban.')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('Reason for the unban.')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    // /unban
    async execute(interaction) {
        const user = interaction.options.getUser('user');
        const reason =
            interaction.options.getString('reason') || 'No reason provided.';

        try {
            const ban = await interaction.guild.bans
                .fetch(user.id)
                .catch(() => null);

            if (!ban) {
                return interaction.reply({
                    content: '❌ That user is not banned.'
                });
            }

            await interaction.guild.members.unban(user.id, reason);

            await interaction.reply({
                embeds: [createUnbanEmbed(user, reason)]
            });

        } catch (error) {
            console.error('Unban error:', error);

            if (!interaction.replied) {
                await interaction.reply({
                    content: '❌ I could not unban that user.'
                });
            }
        }
    },

    // ?unban
    async prefixExecute(interaction) {
        const user = interaction.options.getUser('user');
        const reason =
            interaction.options.getString('reason') || 'No reason provided.';

        if (!user) {
            return interaction.reply({
                content:
                    '❌ Please provide a user ID.\nExample: `?unban 123456789 appeal accepted`'
            });
        }

        try {
            const ban = await interaction.guild.bans
                .fetch(user.id)
                .catch(() => null);

            if (!ban) {
                return interaction.reply({
                    content: '❌ That user is not banned.'
                });
            }

            await interaction.guild.members.unban(user.id, reason);

            await interaction.reply({
                embeds: [createUnbanEmbed(user, reason)]
            });

        } catch (error) {
            console.error('Prefix unban error:', error);

            if (!interaction.replied) {
                await interaction.reply({
                    content: '❌ I could not unban that user.'
                });
            }
        }
    }
};
