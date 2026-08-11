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
            interaction.options.getString('reason') ||
            'No reason provided.';

        try {
            const ban = await interaction.guild.bans
                .fetch(user.id)
                .catch(() => null);

            if (!ban) {
                return interaction.reply({
                    content: '❌ That user is not banned.'
                });
            }

            await interaction.guild.members.unban(
                user.id,
                reason
            );

            await interaction.reply({
                embeds: [
                    createUnbanEmbed(user, reason)
                ]
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
    async prefixExecute(interaction, args, client) {

        if (!args || args.length === 0) {
            return interaction.reply({
                content:
                    '❌ Please provide a username, mention, or user ID.\nExample: `?unban @user appeal accepted`'
            });
        }

        const input = args[0];

        let user = null;

        try {
            // User ID
            if (/^\d{17,20}$/.test(input)) {
                user = await client.users.fetch(input);
            }

            // Mention
            else if (/^<@!?(\d+)>$/.test(input)) {
                const userId = input.match(/^<@!?(\d+)>$/)[1];
                user = await client.users.fetch(userId);
            }

            // Username
            else {
                const username = input.toLowerCase();

                // Search through cached users first
                user = client.users.cache.find(
                    u =>
                        u.username.toLowerCase() === username ||
                        u.tag?.toLowerCase() === username
                );

                // Try guild members if not cached
                if (!user) {
                    const members = await interaction.guild.members.fetch();

                    const member = members.find(
                        m =>
                            m.user.username.toLowerCase() === username ||
                            m.user.tag?.toLowerCase() === username ||
                            m.displayName.toLowerCase() === username
                    );

                    if (member) {
                        user = member.user;
                    }
                }
            }

            if (!user) {
                return interaction.reply({
                    content:
                        '❌ I could not find that user. Use their username, mention, or ID.'
                });
            }

            const reason =
                args.slice(1).join(' ') ||
                'No reason provided.';

            const ban = await interaction.guild.bans
                .fetch(user.id)
                .catch(() => null);

            if (!ban) {
                return interaction.reply({
                    content: '❌ That user is not banned.'
                });
            }

            await interaction.guild.members.unban(
                user.id,
                reason
            );

            await interaction.reply({
                embeds: [
                    createUnbanEmbed(user, reason)
                ]
            });

        } catch (error) {
            console.error('Prefix unban error:', error);

            if (!interaction.replied) {
                await interaction.reply({
                    content:
                        '❌ I could not find or unban that user.'
                });
            }
        }
    }
};
