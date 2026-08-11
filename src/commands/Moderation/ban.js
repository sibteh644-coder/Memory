import {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits
} from 'discord.js';

function parseDuration(duration) {
    if (!duration) return null;

    const match = duration.toLowerCase().match(/^(\d+)(s|m|h|d|w)$/);

    if (!match) return null;

    const amount = Number(match[1]);
    const unit = match[2];

    const units = {
        s: 1000,
        m: 60 * 1000,
        h: 60 * 60 * 1000,
        d: 24 * 60 * 60 * 1000,
        w: 7 * 24 * 60 * 60 * 1000
    };

    return amount * units[unit];
}

function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);

    if (seconds < 60) return `${seconds} second${seconds === 1 ? '' : 's'}`;

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'}`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'}`;

    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} day${days === 1 ? '' : 's'}`;

    const weeks = Math.floor(days / 7);
    return `${weeks} week${weeks === 1 ? '' : 's'}`;
}

export default {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Ban a member from the server.')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('The member to ban.')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('duration')
                .setDescription('Ban duration. Example: 10m, 2h, 7d. Leave empty for permanent.')
                .setRequired(false)
        )
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('Reason for the ban.')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    async execute(interaction) {
        const user = interaction.options.getUser('user');
        const duration = interaction.options.getString('duration');
        const reason =
            interaction.options.getString('reason') || 'No reason provided.';

        const member = await interaction.guild.members
            .fetch(user.id)
            .catch(() => null);

        if (!member) {
            return interaction.reply({
                content: '❌ That user is not in this server.'
            });
        }

        if (member.id === interaction.user.id) {
            return interaction.reply({
                content: '❌ You cannot ban yourself.'
            });
        }

        if (!member.bannable) {
            return interaction.reply({
                content: '❌ I cannot ban that member. Their role may be higher than mine.'
            });
        }

        const durationMs = parseDuration(duration);

        if (duration && !durationMs) {
            return interaction.reply({
                content:
                    '❌ Invalid duration. Use formats like `10s`, `10m`, `2h`, `7d`, or `1w`.'
            });
        }

        try {
            await member.ban({ reason });

            const permanent = !durationMs;

            const embed = new EmbedBuilder()
                .setTitle('🔨 Member Banned')
                .setDescription(
                    `**User:** ${user}\n` +
                    `**Duration:** ${permanent ? 'Permanent' : formatDuration(durationMs)}\n` +
                    `**Reason:** ${reason}`
                )
                .setFooter({
                    text: `Banned by ${interaction.user.username}`
                });

            await interaction.reply({
                embeds: [embed]
            });

            // Temporary ban
            if (durationMs) {
                setTimeout(async () => {
                    try {
                        await interaction.guild.members.unban(
                            user.id,
                            'Temporary ban expired'
                        );

                        console.log(
                            `Automatically unbanned ${user.tag} after ${formatDuration(durationMs)}.`
                        );
                    } catch (error) {
                        console.error(
                            `Failed to automatically unban ${user.tag}:`,
                            error
                        );
                    }
                }, durationMs);
            }

        } catch (error) {
            console.error('Ban error:', error);

            if (!interaction.replied) {
                await interaction.reply({
                    content: '❌ I could not ban that member.'
                });
            }
        }
    },

    async prefixExecute(interaction) {
        const user = interaction.options.getUser('user');
        const duration = interaction.options.getString('duration');
        const reason =
            interaction.options.getString('reason') || 'No reason provided.';

        if (!user) {
            return interaction.reply({
                content:
                    '❌ Please mention a user.\nExample: `?ban @user 2h spamming`'
            });
        }

        const member = await interaction.guild.members
            .fetch(user.id)
            .catch(() => null);

        if (!member) {
            return interaction.reply({
                content: '❌ That user is not in this server.'
            });
        }

        if (member.id === interaction.user.id) {
            return interaction.reply({
                content: '❌ You cannot ban yourself.'
            });
        }

        if (!member.bannable) {
            return interaction.reply({
                content:
                    '❌ I cannot ban that member. Their role may be higher than mine.'
            });
        }

        const durationMs = parseDuration(duration);

        if (duration && !durationMs) {
            return interaction.reply({
                content:
                    '❌ Invalid duration. Use `10s`, `10m`, `2h`, `7d`, or `1w`.'
            });
        }

        try {
            await member.ban({ reason });

            const permanent = !durationMs;

            const embed = new EmbedBuilder()
                .setTitle('🔨 Member Banned')
                .setDescription(
                    `**User:** ${user}\n` +
                    `**Duration:** ${permanent ? 'Permanent' : formatDuration(durationMs)}\n` +
                    `**Reason:** ${reason}`
                )
                .setFooter({
                    text: `Banned by ${interaction.user.username}`
                });

            await interaction.reply({
                embeds: [embed]
            });

            if (durationMs) {
                setTimeout(async () => {
                    try {
                        await interaction.guild.members.unban(
                            user.id,
                            'Temporary ban expired'
                        );

                        console.log(
                            `Automatically unbanned ${user.tag} after ${formatDuration(durationMs)}.`
                        );
                    } catch (error) {
                        console.error(
                            `Failed to automatically unban ${user.tag}:`,
                            error
                        );
                    }
                }, durationMs);
            }

        } catch (error) {
            console.error('Prefix ban error:', error);

            if (!interaction.replied) {
                await interaction.reply({
                    content: '❌ I could not ban that member.'
                });
            }
        }
    }
};
