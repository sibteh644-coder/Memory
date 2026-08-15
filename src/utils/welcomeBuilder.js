import {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    ChannelSelectMenuBuilder,
    ChannelType,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} from 'discord.js';

const configs = new Map();

function getConfig(guildId) {
    if (!configs.has(guildId)) {
        configs.set(guildId, {
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
                icon: ''
            },

            thumbnail: '',
            image: '',

            footer: {
                enabled: true,
                text: "You're the {count} member in the server!",
                icon: ''
            },

            timestamp: false
        });
    }

    return configs.get(guildId);
}

function replaceVariables(text, guild) {
    if (!text) return '';

    return text
        .replaceAll('{server}', guild.name)
        .replaceAll('{server.name}', guild.name)
        .replaceAll(
            '{channel}',
            guild.channels.cache.get(
                getConfig(guild.id).channelId
            )?.toString() || '#channel'
        )
        .replaceAll('{count}', guild.memberCount.toString())
        .replaceAll('{user}', '{user}');
}

function buildEmbed(guild) {
    const config = getConfig(guild.id);

    const embed = new EmbedBuilder()
        .setColor(config.color || '#191717');

    if (config.title) {
        embed.setTitle(
            replaceVariables(config.title, guild)
        );
    }

    if (config.description) {
        embed.setDescription(
            replaceVariables(config.description, guild)
        );
    }

    if (
        config.author.enabled &&
        config.author.name
    ) {
        const author = {
            name: replaceVariables(
                config.author.name,
                guild
            )
        };

        if (config.author.icon) {
            author.iconURL = config.author.icon;
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
        config.footer.enabled &&
        config.footer.text
    ) {
        const footer = {
            text: replaceVariables(
                config.footer.text,
                guild
            )
        };

        if (config.footer.icon) {
            footer.iconURL = config.footer.icon;
        }

        embed.setFooter(footer);
    }

    if (config.timestamp) {
        embed.setTimestamp();
    }

    return embed;
}

function dashboard(guild) {
    const config = getConfig(guild.id);

    const channel = config.channelId
        ? guild.channels.cache.get(config.channelId)
        : null;

    const embed = new EmbedBuilder()
        .setColor(config.color)
        .setTitle('🛠️ Welcome Embed Builder')
        .setDescription(
            'Build your welcome message using the controls below.'
        )
        .addFields(
            {
                name: '🟢 Status',
                value: config.enabled
                    ? 'Enabled'
                    : 'Disabled',
                inline: true
            },
            {
                name: '📢 Channel',
                value: channel
                    ? channel.toString()
                    : 'Not selected',
                inline: true
            },
            {
                name: '🎨 Color',
                value: `\`${config.color}\``,
                inline: true
            },
            {
                name: '📝 Title',
                value:
                    config.title || 'Not set'
            },
            {
                name: '📄 Description',
                value:
                    config.description || 'Not set'
            },
            {
                name: '👤 Author',
                value:
                    config.author.enabled
                        ? config.author.name || 'Enabled'
                        : 'Disabled',
                inline: true
            },
            {
                name: '🖼️ Thumbnail',
                value:
                    config.thumbnail
                        ? 'Set'
                        : 'Not set',
                inline: true
            },
            {
                name: '🌄 Image',
                value:
                    config.image
                        ? 'Set'
                        : 'Not set',
                inline: true
            },
            {
                name: '🦶 Footer',
                value:
                    config.footer.enabled
                        ? config.footer.text || 'Enabled'
                        : 'Disabled'
            },
            {
                name: '🕐 Timestamp',
                value:
                    config.timestamp
                        ? 'Enabled'
                        : 'Disabled',
                inline: true
            }
        );

    const channelRow =
        new ActionRowBuilder().addComponents(
            new ChannelSelectMenuBuilder()
                .setCustomId(
                    'welcome_channel'
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
                    'welcome_edit'
                )
                .setPlaceholder(
                    '✏️ Choose something to edit'
                )
                .addOptions(
                    {
                        label: 'Title',
                        description:
                            'Change the embed title',
                        value: 'title',
                        emoji: '📝'
                    },
                    {
                        label: 'Description',
                        description:
                            'Change the embed description',
                        value: 'description',
                        emoji: '📄'
                    },
                    {
                        label: 'Color',
                        description:
                            'Change the embed color',
                        value: 'color',
                        emoji: '🎨'
                    },
                    {
                        label: 'Author',
                        description:
                            'Change the embed author',
                        value: 'author',
                        emoji: '👤'
                    },
                    {
                        label: 'Thumbnail',
                        description:
                            'Change the thumbnail',
                        value: 'thumbnail',
                        emoji: '🖼️'
                    },
                    {
                        label: 'Image',
                        description:
                            'Change the large image',
                        value: 'image',
                        emoji: '🌄'
                    },
                    {
                        label: 'Footer',
                        description:
                            'Change the footer',
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
                    'welcome_author_toggle'
                )
                .setLabel(
                    config.author.enabled
                        ? 'Disable Author'
                        : 'Enable Author'
                )
                .setEmoji('👤')
                .setStyle(
                    ButtonStyle.Secondary
                ),

            new ButtonBuilder()
                .setCustomId(
                    'welcome_footer_toggle'
                )
                .setLabel(
                    config.footer.enabled
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
                    'welcome_enable'
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
        embeds: [embed],
        components: [
            channelRow,
            editRow,
            buttons1,
            buttons2
        ]
    };
}

function modal(id, title, fields) {
    const result = new ModalBuilder()
        .setCustomId(id)
        .setTitle(title);

    for (const field of fields) {
        const input = new TextInputBuilder()
            .setCustomId(field.id)
            .setLabel(field.label)
            .setStyle(
                field.paragraph
                    ? TextInputStyle.Paragraph
                    : TextInputStyle.Short
            )
            .setRequired(false)
            .setMaxLength(
                field.maxLength || 1000
            );

        if (field.value) {
            input.setValue(
                String(field.value).slice(
                    0,
                    field.maxLength || 1000
                )
            );
        }

        result.addComponents(
            new ActionRowBuilder().addComponents(
                input
            )
        );
    }

    return result;
}

export async function handleWelcome(interaction) {
    if (!interaction.guild) {
        return false;
    }

    const id = interaction.customId || '';
    const config = getConfig(
        interaction.guild.id
    );

    // CHANNEL
    if (
        interaction.isChannelSelectMenu() &&
        id === 'welcome_channel'
    ) {
        config.channelId =
            interaction.values[0];

        await interaction.update(
            dashboard(interaction.guild)
        );

        return true;
    }

    // EDIT MENU
    if (
        interaction.isStringSelectMenu() &&
        id === 'welcome_edit'
    ) {
        const field = interaction.values[0];

        if (field === 'title') {
            await interaction.showModal(
                modal(
                    'welcome_modal_title',
                    'Edit Title',
                    [
                        {
                            id: 'value',
                            label: 'Title',
                            value: config.title,
                            maxLength: 256
                        }
                    ]
                )
            );

            return true;
        }

        if (field === 'description') {
            await interaction.showModal(
                modal(
                    'welcome_modal_description',
                    'Edit Description',
                    [
                        {
                            id: 'value',
                            label: 'Description',
                            value:
                                config.description,
                            paragraph: true,
                            maxLength: 4000
                        }
                    ]
                )
            );

            return true;
        }

        if (field === 'color') {
            await interaction.showModal(
                modal(
                    'welcome_modal_color',
                    'Edit Color',
                    [
                        {
                            id: 'value',
                            label: 'Hex Color',
                            value: config.color,
                            maxLength: 7
                        }
                    ]
                )
            );

            return true;
        }

        if (field === 'author') {
            await interaction.showModal(
                modal(
                    'welcome_modal_author',
                    'Edit Author',
                    [
                        {
                            id: 'name',
                            label: 'Author Name',
                            value:
                                config.author.name,
                            maxLength: 256
                        },
                        {
                            id: 'icon',
                            label: 'Icon URL',
                            value:
                                config.author.icon,
                            maxLength: 1000
                        }
                    ]
                )
            );

            return true;
        }

        if (field === 'thumbnail') {
            await interaction.showModal(
                modal(
                    'welcome_modal_thumbnail',
                    'Edit Thumbnail',
                    [
                        {
                            id: 'value',
                            label: 'Image URL',
                            value:
                                config.thumbnail,
                            maxLength: 1000
                        }
                    ]
                )
            );

            return true;
        }

        if (field === 'image') {
            await interaction.showModal(
                modal(
                    'welcome_modal_image',
                    'Edit Image',
                    [
                        {
                            id: 'value',
                            label: 'Image URL',
                            value:
                                config.image,
                            maxLength: 1000
                        }
                    ]
                )
            );

            return true;
        }

        if (field === 'footer') {
            await interaction.showModal(
                modal(
                    'welcome_modal_footer',
                    'Edit Footer',
                    [
                        {
                            id: 'text',
                            label: 'Footer Text',
                            value:
                                config.footer.text,
                            maxLength: 2048
                        },
                        {
                            id: 'icon',
                            label: 'Icon URL',
                            value:
                                config.footer.icon,
                            maxLength: 1000
                        }
                    ]
                )
            );

            return true;
        }

        return true;
    }

    // BUTTONS
    if (interaction.isButton()) {
        if (id === 'welcome_preview') {
            await interaction.reply({
                content: '**Welcome Embed Preview**',
                embeds: [
                    buildEmbed(
                        interaction.guild
                    )
                ],
                flags: 64
            });

            return true;
        }

        if (id === 'welcome_timestamp') {
            config.timestamp =
                !config.timestamp;

            await interaction.update(
                dashboard(interaction.guild)
            );

            return true;
        }

        if (id === 'welcome_author_toggle') {
            config.author.enabled =
                !config.author.enabled;

            await interaction.update(
                dashboard(interaction.guild)
            );

            return true;
        }

        if (id === 'welcome_footer_toggle') {
            config.footer.enabled =
                !config.footer.enabled;

            await interaction.update(
                dashboard(interaction.guild)
            );

            return true;
        }

        if (id === 'welcome_enable') {
            config.enabled =
                !config.enabled;

            await interaction.update(
                dashboard(interaction.guild)
            );

            return true;
        }

        if (id === 'welcome_reset') {
            configs.delete(
                interaction.guild.id
            );

            await interaction.update(
                dashboard(interaction.guild)
            );

            return true;
        }

        return true;
    }

    // MODALS
    if (interaction.isModalSubmit()) {
        if (id === 'welcome_modal_title') {
            config.title =
                interaction.fields
                    .getTextInputValue(
                        'value'
                    );

            await interaction.reply({
                content: '✅ Title updated.',
                flags: 64
            });

            return true;
        }

        if (
            id ===
            'welcome_modal_description'
        ) {
            config.description =
                interaction.fields
                    .getTextInputValue(
                        'value'
                    );

            await interaction.reply({
                content:
                    '✅ Description updated.',
                flags: 64
            });

            return true;
        }

        if (id === 'welcome_modal_color') {
            const value =
                interaction.fields
                    .getTextInputValue(
                        'value'
                    )
                    .trim();

            if (
                !/^#[0-9A-Fa-f]{6}$/.test(
                    value
                )
            ) {
                await interaction.reply({
                    content:
                        '❌ Invalid color. Use a hex color like `#191717`.',
                    flags: 64
                });

                return true;
            }

            config.color = value;

            await interaction.reply({
                content:
                    `✅ Color changed to \`${value}\`.`,
                flags: 64
            });

            return true;
        }

        if (id === 'welcome_modal_author') {
            config.author.name =
                interaction.fields
                    .getTextInputValue(
                        'name'
                    );

            config.author.icon =
                interaction.fields
                    .getTextInputValue(
                        'icon'
                    );

            await interaction.reply({
                content: '✅ Author updated.',
                flags: 64
            });

            return true;
        }

        if (
            id ===
            'welcome_modal_thumbnail'
        ) {
            config.thumbnail =
                interaction.fields
                    .getTextInputValue(
                        'value'
                    );

            await interaction.reply({
                content:
                    '✅ Thumbnail updated.',
                flags: 64
            });

            return true;
        }

        if (id === 'welcome_modal_image') {
            config.image =
                interaction.fields
                    .getTextInputValue(
                        'value'
                    );

            await interaction.reply({
                content: '✅ Image updated.',
                flags: 64
            });

            return true;
        }

        if (id === 'welcome_modal_footer') {
            config.footer.text =
                interaction.fields
                    .getTextInputValue(
                        'text'
                    );

            config.footer.icon =
                interaction.fields
                    .getTextInputValue(
                        'icon'
                    );

            await interaction.reply({
                content: '✅ Footer updated.',
                flags: 64
            });

            return true;
        }
    }

    return false;
}

export function getWelcomeDashboard(guild) {
    return dashboard(guild);
}
