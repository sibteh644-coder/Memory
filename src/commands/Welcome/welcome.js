import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelSelectMenuBuilder,
    ChannelType,
    StringSelectMenuBuilder,
    EmbedBuilder
} from 'discord.js';

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '../data');
const DATA_FILE = path.join(DATA_DIR, 'welcome.json');

function ensureFile() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (!fs.existsSync(DATA_FILE)) {
        fs.writeFileSync(DATA_FILE, '{}');
    }
}

function loadData() {
    ensureFile();

    try {
        return JSON.parse(
            fs.readFileSync(DATA_FILE, 'utf8')
        );
    } catch {
        return {};
    }
}

function saveData(data) {
    ensureFile();

    fs.writeFileSync(
        DATA_FILE,
        JSON.stringify(data, null, 2)
    );
}

export function getWelcomeConfig(guildId) {
    const data = loadData();

    if (!data[guildId]) {
        data[guildId] = {
            enabled: false,
            channelId: null,

            title: 'Welcome {user}!',

            description:
                'Hope you enjoy your stay in **{server}**!\n' +
                'Please chat in {channel}',

            color: '#191717',

            author: {
                enabled: false,
                name: '',
                iconURL: ''
            },

            thumbnail: '',
            image: '',

            footer: {
                enabled: true,
                text:
                    "You're the {count} member in the server!",
                iconURL: ''
            },

            timestamp: false
        };

        saveData(data);
    }

    return data[guildId];
}

export function updateWelcomeConfig(guildId, config) {
    const data = loadData();

    data[guildId] = config;

    saveData(data);
}

function replacePlaceholders(text, member, config) {
    if (!text) return '';

    const channel = member.guild.channels.cache.get(
        config.channelId
    );

    return text
        .replaceAll(
            '{user}',
            `<@${member.id}>`
        )
        .replaceAll(
            '{username}',
            member.user.username
        )
        .replaceAll(
            '{server}',
            member.guild.name
        )
        .replaceAll(
            '{channel}',
            channel ? channel.toString() : '#channel'
        )
        .replaceAll(
            '{count}',
            member.guild.memberCount.toString()
        );
}

export function buildWelcomeEmbed(member, config) {
    const embed = new EmbedBuilder()
        .setColor(config.color || '#191717');

    if (config.title) {
        embed.setTitle(
            replacePlaceholders(
                config.title,
                member,
                config
            )
        );
    }

    if (config.description) {
        embed.setDescription(
            replacePlaceholders(
                config.description,
                member,
                config
            )
        );
    }

    if (
        config.author?.enabled &&
        config.author.name
    ) {
        const author = {
            name: replacePlaceholders(
                config.author.name,
                member,
                config
            )
        };

        if (config.author.iconURL) {
            author.iconURL = config.author.iconURL;
        }

        embed.setAuthor(author);
    }

    if (config.thumbnail) {
        embed.setThumbnail(config.thumbnail);
    }

    if (config.image) {
        embed.setImage(config.image);
    }

    if (
        config.footer?.enabled &&
        config.footer.text
    ) {
        const footer = {
            text: replacePlaceholders(
                config.footer.text,
                member,
                config
            )
        };

        if (config.footer.iconURL) {
            footer.iconURL = config.footer.iconURL;
        }

        embed.setFooter(footer);
    }

    if (config.timestamp) {
        embed.setTimestamp();
    }

    return embed;
}

function getDashboardEmbed(guild) {
    const config = getWelcomeConfig(guild.id);

    const channel = config.channelId
        ? guild.channels.cache.get(
              config.channelId
          )
        : null;

    return new EmbedBuilder()
        .setColor(config.color || '#191717')
        .setTitle('🛠️ Welcome Embed Builder')
        .setDescription(
            'Build your entire welcome embed using the controls below.'
        )
        .addFields(
            {
                name: 'Status',
                value: config.enabled
                    ? '🟢 Enabled'
                    : '🔴 Disabled',
                inline: true
            },
            {
                name: 'Channel',
                value: channel
                    ? channel.toString()
                    : '❌ Not set',
                inline: true
            },
            {
                name: 'Color',
                value: `\`${config.color}\``,
                inline: true
            },
            {
                name: '📝 Title',
                value:
                    config.title?.slice(0, 1024) ||
                    'Not set'
            },
            {
                name: '📄 Description',
                value:
                    config.description?.slice(0, 1024) ||
                    'Not set'
            },
            {
                name: '👤 Author',
                value:
                    config.author?.enabled &&
                    config.author.name
                        ? config.author.name
                        : 'Disabled',
                inline: true
            },
            {
                name: '🖼️ Thumbnail',
                value: config.thumbnail
                    ? '✅ Set'
                    : '❌ Not set',
                inline: true
            },
            {
                name: '🌄 Image',
                value: config.image
                    ? '✅ Set'
                    : '❌ Not set',
                inline: true
            },
            {
                name: '🦶 Footer',
                value:
                    config.footer?.enabled &&
                    config.footer.text
                        ? config.footer.text
                        : 'Disabled',
                inline: false
            },
            {
                name: '🕐 Timestamp',
                value: config.timestamp
                    ? '🟢 Enabled'
                    : '🔴 Disabled',
                inline: true
            }
        )
        .setFooter({
            text:
                'Use the menu to edit the embed.'
        });
}

export function createWelcomeDashboard(guild) {
    const config = getWelcomeConfig(
        guild.id
    );

    const channelRow =
        new ActionRowBuilder().addComponents(
            new ChannelSelectMenuBuilder()
                .setCustomId(
                    'welcome_select_channel'
                )
                .setPlaceholder(
                    '📢 Select welcome channel'
                )
                .setChannelTypes(
                    ChannelType.GuildText
                )
        );

    const editRow =
        new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId(
                    'welcome_edit_field'
                )
                .setPlaceholder(
                    '✏️ Choose something to edit'
                )
                .addOptions(
                    {
                        label: 'Title',
                        description:
                            'Edit the embed title',
                        value: 'title',
                        emoji: '📝'
                    },
                    {
                        label: 'Description',
                        description:
                            'Edit the embed description',
                        value: 'description',
                        emoji: '📄'
                    },
                    {
                        label: 'Author',
                        description:
                            'Edit the embed author',
                        value: 'author',
                        emoji: '👤'
                    },
                    {
                        label: 'Color',
                        description:
                            'Change the embed color',
                        value: 'color',
                        emoji: '🎨'
                    },
                    {
                        label: 'Thumbnail',
                        description:
                            'Set the thumbnail',
                        value: 'thumbnail',
                        emoji: '🖼️'
                    },
                    {
                        label: 'Image',
                        description:
                            'Set the large image',
                        value: 'image',
                        emoji: '🌄'
                    },
                    {
                        label: 'Footer',
                        description:
                            'Edit the footer',
                        value: 'footer',
                        emoji: '🦶'
                    }
                )
        );

    const buttons1 =
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(
                    'welcome_preview'
                )
                .setLabel('Preview')
                .setEmoji('👀')
                .setStyle(
                    ButtonStyle.Primary
                ),

            new ButtonBuilder()
                .setCustomId(
                    'welcome_timestamp'
                )
                .setLabel(
                    config.timestamp
                        ? 'Remove Timestamp'
                        : 'Add Timestamp'
                )
                .setEmoji('🕐')
                .setStyle(
                    ButtonStyle.Secondary
                ),

            new ButtonBuilder()
                .setCustomId(
                    'welcome_toggle_author'
                )
                .setLabel(
                    config.author?.enabled
                        ? 'Disable Author'
                        : 'Enable Author'
                )
                .setEmoji('👤')
                .setStyle(
                    ButtonStyle.Secondary
                ),

            new ButtonBuilder()
                .setCustomId(
                    'welcome_toggle_footer'
                )
                .setLabel(
                    config.footer?.enabled
                        ? 'Disable Footer'
                        : 'Enable Footer'
                )
                .setEmoji('🦶')
                .setStyle(
                    ButtonStyle.Secondary
                )
        );

    const buttons2 =
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(
                    'welcome_save'
                )
                .setLabel('Save')
                .setEmoji('💾')
                .setStyle(
                    ButtonStyle.Success
                ),

            new ButtonBuilder()
                .setCustomId(
                    'welcome_toggle'
                )
                .setLabel(
                    config.enabled
                        ? 'Disable Welcome'
                        : 'Enable Welcome'
                )
                .setEmoji(
                    config.enabled
                        ? '🔴'
                        : '🟢'
                )
                .setStyle(
                    config.enabled
                        ? ButtonStyle.Danger
                        : ButtonStyle.Success
                ),

            new ButtonBuilder()
                .setCustomId(
                    'welcome_reset'
                )
                .setLabel('Reset')
                .setEmoji('🔄')
                .setStyle(
                    ButtonStyle.Danger
                )
        );

    return {
        embeds: [
            getDashboardEmbed(guild)
        ],

        components: [
            channelRow,
            editRow,
            buttons1,
            buttons2
        ]
    };
}

export default {
    name: 'welcome',

    // Use the same category your existing
    // community commands use.
    category: 'Community',

    data: new SlashCommandBuilder()
        .setName('welcome')
        .setDescription(
            'Open the welcome embed builder.'
        )
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageGuild
        ),

    async execute(
        interaction,
        guildConfig,
        client
    ) {
        try {
            if (!interaction.guild) {
                return interaction.reply({
                    content:
                        '❌ This command can only be used in a server.',
                    ephemeral: true
                });
            }

            if (
                !interaction.memberPermissions?.has(
                    PermissionFlagsBits.ManageGuild
                )
            ) {
                return interaction.reply({
                    content:
                        '❌ You need **Manage Server** permission to use this.',
                    ephemeral: true
                });
            }

            await interaction.reply({
                ...createWelcomeDashboard(
                    interaction.guild
                ),
                ephemeral: true
            });

        } catch (error) {
            console.error(
                'WELCOME COMMAND ERROR:',
                error
            );

            if (
                !interaction.replied &&
                !interaction.deferred
            ) {
                await interaction.reply({
                    content:
                        '❌ Failed to open the Welcome Embed Builder.',
                    ephemeral: true
                }).catch(() => {});
            }
        }
    }
};
