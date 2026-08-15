import {
    PermissionFlagsBits,
    ModalBuilder,
    ActionRowBuilder,
    TextInputBuilder,
    TextInputStyle
} from 'discord.js';

import {
    getWelcomeConfig,
    updateWelcomeConfig,
    createWelcomeDashboard,
    buildWelcomeEmbed
} from '../commands/welcome.js';

function createModal(customId, title, fields) {
    const modal = new ModalBuilder()
        .setCustomId(customId)
        .setTitle(title);

    for (const field of fields) {
        const input = new TextInputBuilder()
            .setCustomId(field.id)
            .setLabel(field.label)
            .setStyle(field.style || TextInputStyle.Short)
            .setRequired(field.required ?? false)
            .setMaxLength(field.maxLength || 4000);

        if (field.placeholder) {
            input.setPlaceholder(field.placeholder);
        }

        if (field.value !== undefined && field.value !== '') {
            input.setValue(String(field.value).slice(0, 4000));
        }

        modal.addComponents(
            new ActionRowBuilder().addComponents(input)
        );
    }

    return modal;
}

export async function handleWelcomeInteraction(interaction) {
    const customId = interaction.customId || '';

    if (!customId.startsWith('welcome_')) {
        return false;
    }

    if (!interaction.guild) {
        return true;
    }

    if (
        !interaction.memberPermissions?.has(
            PermissionFlagsBits.ManageGuild
        )
    ) {
        await interaction.reply({
            content: '❌ You need **Manage Server** permission to use this.',
            ephemeral: true
        }).catch(() => {});

        return true;
    }

    const guild = interaction.guild;
    const guildId = guild.id;
    const config = getWelcomeConfig(guildId);

    // ==========================================
    // CHANNEL SELECT
    // ==========================================

    if (
        interaction.isChannelSelectMenu() &&
        customId === 'welcome_select_channel'
    ) {
        config.channelId = interaction.values[0];

        updateWelcomeConfig(guildId, config);

        await interaction.update(
            createWelcomeDashboard(guild)
        );

        return true;
    }

    // ==========================================
    // EDIT FIELD SELECT
    // ==========================================

    if (
        interaction.isStringSelectMenu() &&
        customId === 'welcome_edit_field'
    ) {
        const field = interaction.values[0];

        if (field === 'title') {
            return await showModal(
                interaction,
                createModal(
                    'welcome_modal_title',
                    'Edit Embed Title',
                    [
                        {
                            id: 'title',
                            label: 'Title',
                            value: config.title || '',
                            maxLength: 256,
                            required: false,
                            placeholder: 'Welcome {user}!'
                        }
                    ]
                )
            );
        }

        if (field === 'description') {
            return await showModal(
                interaction,
                createModal(
                    'welcome_modal_description',
                    'Edit Embed Description',
                    [
                        {
                            id: 'description',
                            label: 'Description',
                            value: config.description || '',
                            style: TextInputStyle.Paragraph,
                            maxLength: 4000,
                            required: false,
                            placeholder:
                                'Hope you enjoy your stay in {server}!'
                        }
                    ]
                )
            );
        }

        if (field === 'author') {
            return await showModal(
                interaction,
                createModal(
                    'welcome_modal_author',
                    'Edit Embed Author',
                    [
                        {
                            id: 'author_name',
                            label: 'Author name',
                            value: config.author?.name || '',
                            maxLength: 256,
                            required: false,
                            placeholder: 'Welcome to {server}!'
                        },
                        {
                            id: 'author_icon',
                            label: 'Author icon URL',
                            value: config.author?.iconURL || '',
                            maxLength: 1000,
                            required: false,
                            placeholder:
                                'https://example.com/icon.png'
                        }
                    ]
                )
            );
        }

        if (field === 'color') {
            return await showModal(
                interaction,
                createModal(
                    'welcome_modal_color',
                    'Edit Embed Color',
                    [
                        {
                            id: 'color',
                            label: 'Hex color',
                            value: config.color || '#191717',
                            maxLength: 7,
                            required: true,
                            placeholder: '#191717'
                        }
                    ]
                )
            );
        }

        if (field === 'thumbnail') {
            return await showModal(
                interaction,
                createModal(
                    'welcome_modal_thumbnail',
                    'Edit Thumbnail',
                    [
                        {
                            id: 'thumbnail',
                            label: 'Thumbnail URL',
                            value: config.thumbnail || '',
                            maxLength: 1000,
                            required: false,
                            placeholder:
                                'Leave empty to remove'
                        }
                    ]
                )
            );
        }

        if (field === 'image') {
            return await showModal(
                interaction,
                createModal(
                    'welcome_modal_image',
                    'Edit Image',
                    [
                        {
                            id: 'image',
                            label: 'Image URL',
                            value: config.image || '',
                            maxLength: 1000,
                            required: false,
                            placeholder:
                                'Leave empty to remove'
                        }
                    ]
                )
            );
        }

        if (field === 'footer') {
            return await showModal(
                interaction,
                createModal(
                    'welcome_modal_footer',
                    'Edit Embed Footer',
                    [
                        {
                            id: 'footer_text',
                            label: 'Footer text',
                            value: config.footer?.text || '',
                            maxLength: 2048,
                            required: false,
                            placeholder:
                                "You're the {count} member!"
                        },
                        {
                            id: 'footer_icon',
                            label: 'Footer icon URL',
                            value: config.footer?.iconURL || '',
                            maxLength: 1000,
                            required: false,
                            placeholder:
                                'https://example.com/icon.png'
                        }
                    ]
                )
            );
        }

        return true;
    }

    // ==========================================
    // BUTTONS
    // ==========================================

    if (interaction.isButton()) {

        // Preview
        if (customId === 'welcome_preview') {
            const embed = buildWelcomeEmbed(
                interaction.member,
                config
            );

            await interaction.reply({
                content: '**Welcome Embed Preview**',
                embeds: [embed],
                ephemeral: true
            });

            return true;
        }

        // Timestamp
        if (customId === 'welcome_timestamp') {
            config.timestamp = !config.timestamp;

            updateWelcomeConfig(guildId, config);

            await interaction.update(
                createWelcomeDashboard(guild)
            );

            return true;
        }

        // Author toggle
        if (customId === 'welcome_toggle_author') {
            config.author.enabled =
                !config.author.enabled;

            updateWelcomeConfig(guildId, config);

            await interaction.update(
                createWelcomeDashboard(guild)
            );

            return true;
        }

        // Footer toggle
        if (customId === 'welcome_toggle_footer') {
            config.footer.enabled =
                !config.footer.enabled;

            updateWelcomeConfig(guildId, config);

            await interaction.update(
                createWelcomeDashboard(guild)
            );

            return true;
        }

        // Enable / Disable
        if (customId === 'welcome_toggle') {
            config.enabled = !config.enabled;

            updateWelcomeConfig(guildId, config);

            await interaction.update(
                createWelcomeDashboard(guild)
            );

            return true;
        }

        // Save
        if (customId === 'welcome_save') {
            updateWelcomeConfig(guildId, config);

            await interaction.reply({
                content: '✅ Welcome embed settings saved.',
                ephemeral: true
            });

            return true;
        }

        // Reset
        if (customId === 'welcome_reset') {
            const defaultConfig = {
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

            updateWelcomeConfig(
                guildId,
                defaultConfig
            );

            await interaction.update(
                createWelcomeDashboard(guild)
            );

            return true;
        }

        return true;
    }

    // ==========================================
    // MODALS
    // ==========================================

    if (interaction.isModalSubmit()) {

        if (customId === 'welcome_modal_title') {
            config.title =
                interaction.fields
                    .getTextInputValue('title')
                    .trim();

            updateWelcomeConfig(guildId, config);

            await interaction.reply({
                content: '✅ Title updated.',
                ephemeral: true
            });

            return true;
        }

        if (customId === 'welcome_modal_description') {
            config.description =
                interaction.fields
                    .getTextInputValue('description')
                    .trim();

            updateWelcomeConfig(guildId, config);

            await interaction.reply({
                content: '✅ Description updated.',
                ephemeral: true
            });

            return true;
        }

        if (customId === 'welcome_modal_author') {
            const name =
                interaction.fields
                    .getTextInputValue('author_name')
                    .trim();

            const icon =
                interaction.fields
                    .getTextInputValue('author_icon')
                    .trim();

            config.author.name = name;
            config.author.iconURL = icon;

            if (name) {
                config.author.enabled = true;
            }

            updateWelcomeConfig(guildId, config);

            await interaction.reply({
                content: '✅ Author updated.',
                ephemeral: true
            });

            return true;
        }

        if (customId === 'welcome_modal_color') {
            const color =
                interaction.fields
                    .getTextInputValue('color')
                    .trim();

            if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
                await interaction.reply({
                    content:
                        '❌ Invalid color. Use a hex color like `#191717`.',
                    ephemeral: true
                });

                return true;
            }

            config.color = color;

            updateWelcomeConfig(guildId, config);

            await interaction.reply({
                content:
                    `✅ Embed color changed to \`${color}\`.`,
                ephemeral: true
            });

            return true;
        }

        if (customId === 'welcome_modal_thumbnail') {
            config.thumbnail =
                interaction.fields
                    .getTextInputValue('thumbnail')
                    .trim();

            updateWelcomeConfig(guildId, config);

            await interaction.reply({
                content: config.thumbnail
                    ? '✅ Thumbnail updated.'
                    : '✅ Thumbnail removed.',
                ephemeral: true
            });

            return true;
        }

        if (customId === 'welcome_modal_image') {
            config.image =
                interaction.fields
                    .getTextInputValue('image')
                    .trim();

            updateWelcomeConfig(guildId, config);

            await interaction.reply({
                content: config.image
                    ? '✅ Image updated.'
                    : '✅ Image removed.',
                ephemeral: true
            });

            return true;
        }

        if (customId === 'welcome_modal_footer') {
            const text =
                interaction.fields
                    .getTextInputValue('footer_text')
                    .trim();

            const icon =
                interaction.fields
                    .getTextInputValue('footer_icon')
                    .trim();

            config.footer.text = text;
            config.footer.iconURL = icon;

            if (text) {
                config.footer.enabled = true;
            }

            updateWelcomeConfig(guildId, config);

            await interaction.reply({
                content: '✅ Footer updated.',
                ephemeral: true
            });

            return true;
        }

        return true;
    }

    return false;
}

async function showModal(interaction, modal) {
    await interaction.showModal(modal);
    return true;
}
