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

const dataDir = path.join(__dirname, '../data');
const dataFile = path.join(dataDir, 'welcome.json');

function ensureDataFile() {
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    if (!fs.existsSync(dataFile)) {
        fs.writeFileSync(dataFile, '{}');
    }
}

export function loadWelcomeData() {
    ensureDataFile();

    try {
        return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    } catch {
        return {};
    }
}

export function saveWelcomeData(data) {
    ensureDataFile();
    fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
}

export function getWelcomeConfig(guildId) {
    const data = loadWelcomeData();

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
                text: "You're the {count} member in the server!",
                iconURL: ''
            },

            timestamp: false
        };

        saveWelcomeData(data);
    }

    return data[guildId];
}

export function updateWelcomeConfig(guildId, config) {
    const data = loadWelcomeData();
    data[guildId] = config;
    saveWelcomeData(data);
}

export function replacePlaceholders(text, member, config) {
    if (!text) return '';

    const channel = member.guild.channels.cache.get(config.channelId);

    return text
        .replaceAll('{user}', `<@${member.id}>`)
        .replaceAll('{username}', member.user.username)
        .replaceAll('{server}', member.guild.name)
        .replaceAll('{channel}', channel ? channel.toString() : '#channel')
        .replaceAll('{count}', member.guild.memberCount.toString());
}

export function buildWelcomeEmbed(member, config) {
    const embed = new EmbedBuilder()
        .setColor(config.color || '#191717');

    if (config.title) {
        embed.setTitle(
            replacePlaceholders(config.title, member, config)
        );
    }

    if (config.description) {
        embed.setDescription(
            replacePlaceholders(config.description, member, config)
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
        try {
            embed.setThumbnail(config.thumbnail);
        } catch {}
    }

    if (config.image) {
        try {
            embed.setImage(config.image);
        } catch {}
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

function dashboardEmbed(guild) {
    const config = getWelcomeConfig(guild.id);

    const channel = config.channelId
        ? guild.channels.cache.get(config.channelId)
        : null;

    const author = config.author?.enabled
        ? config.author.name || 'Not configured'
        : 'Disabled';

    const footer = config.footer?.enabled
        ? config.footer.text || 'Not configured'
        : 'Disabled';

    return new EmbedBuilder()
        .setColor(config.color || '#191717')
        .setTitle('🛠️ Welcome Embed Builder')
        .setDescription(
            'Configure your server welcome embed using the controls below.'
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
                value: `\`${config.color || '#191717'}\``,
                inline: true
            },
            {
                name: '📝 Title',
                value: config.title
                    ? `\`\`\`\n${config.title.slice(0, 1000)}\n\`\`\``
                    : 'Not set'
            },
            {
                name: '📄 Description',
                value: config.description
                    ? `\`\`\`\n${config.description.slice(0, 1000)}\n\`\`\``
                    : 'Not set'
            },
            {
                name: '👤 Author',
                value: author,
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
                value: footer,
                inline: true
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
            text: 'Changes are saved automatically.'
        });
}

export function createWelcomeDashboard(guild) {
    const config = getWelcomeConfig(guild.id);

    const channelRow = new ActionRowBuilder()
        .addComponents(
            new ChannelSelectMenuBuilder()
                .setCustomId('welcome_select_channel')
                .setPlaceholder('📢 Select welcome channel')
                .setChannelTypes(ChannelType.GuildText)
                .setMaxValues(1)
        );

    const fieldRow = new ActionRowBuilder()
        .addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('welcome_edit_field')
                .setPlaceholder('✏️ Choose something to edit')
                .addOptions(
                    {
                        label: 'Title',
                        description: 'Edit the embed title',
                        value: 'title',
                        emoji: '📝'
                    },
                    {
                        label: 'Description',
                        description: 'Edit the embed description',
                        value: 'description',
                        emoji: '📄'
                    },
                    {
                        label: 'Author',
                        description: 'Edit the embed author',
                        value: 'author',
                        emoji: '👤'
                    },
                    {
                        label: 'Color',
                        description: 'Change the embed color',
                        value: 'color',
                        emoji: '🎨'
                    },
                    {
                        label: 'Thumbnail',
                        description: 'Set or remove the thumbnail',
                        value: 'thumbnail',
                        emoji: '🖼️'
                    },
                    {
                        label: 'Image',
                        description: 'Set or remove the large image',
                        value: 'image',
                        emoji: '🌄'
                    },
                    {
                        label: 'Footer',
                        description: 'Edit the embed footer',
                        value: 'footer',
                        emoji: '🦶'
                    }
                )
        );

    const buttonRow1 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('welcome_preview')
                .setLabel('Preview')
                .setEmoji('👀')
                .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
                .setCustomId('welcome_timestamp')
                .setLabel(
                    config.timestamp
                        ? 'Remove Timestamp'
                        : 'Add Timestamp'
                )
                .setEmoji('🕐')
                .setStyle(ButtonStyle.Secondary),

            new ButtonBuilder()
                .setCustomId('welcome_toggle_author')
                .setLabel(
                    config.author?.enabled
                        ? 'Disable Author'
                        : 'Enable Author'
                )
                .setEmoji('👤')
                .setStyle(ButtonStyle.Secondary),

            new ButtonBuilder()
                .setCustomId('welcome_toggle_footer')
                .setLabel(
                    config.footer?.enabled
                        ? 'Disable Footer'
                        : 'Enable Footer'
                )
                .setEmoji('🦶')
                .setStyle(ButtonStyle.Secondary)
        );

    const buttonRow2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('welcome_save')
                .setLabel('Save')
                .setEmoji('💾')
                .setStyle(ButtonStyle.Success),

            new ButtonBuilder()
                .setCustomId('welcome_toggle')
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
                .setCustomId('welcome_reset')
                .setLabel('Reset')
                .setEmoji('🔄')
                .setStyle(ButtonStyle.Danger)
        );

    return {
        embeds: [dashboardEmbed(guild)],
        components: [
            channelRow,
            fieldRow,
            buttonRow1,
            buttonRow2
        ]
    };
}

export default {
    data: new SlashCommandBuilder()
        .setName('welcome')
        .setDescription('Open the welcome embed builder.')
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageGuild
        ),

    async execute(interaction) {
        if (!interaction.guild) {
            return interaction.reply({
                content: '❌ This command can only be used in a server.',
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
            ...createWelcomeDashboard(interaction.guild),
            ephemeral: true
        });
    }
};
