import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelSelectMenuBuilder,
    ChannelType,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    EmbedBuilder
} from 'discord.js';

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, '../data');
const configFile = path.join(dataDir, 'welcome.json');

function loadConfig() {
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    if (!fs.existsSync(configFile)) {
        fs.writeFileSync(configFile, '{}');
    }

    return JSON.parse(fs.readFileSync(configFile, 'utf8'));
}

function saveConfig(config) {
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
}

function getGuildConfig(guildId) {
    const config = loadConfig();

    if (!config[guildId]) {
        config[guildId] = {
            enabled: false,
            channelId: null,
            title: 'Welcome {user}!',
            message: 'Hope you enjoy your stay in **{server}**!\nPlease chat in {channel}',
            image: null,
            color: '#191717'
        };

        saveConfig(config);
    }

    return config[guildId];
}

function replacePlaceholders(text, member) {
    return text
        .replaceAll('{user}', `<@${member.id}>`)
        .replaceAll('{username}', member.user.username)
        .replaceAll('{server}', member.guild.name)
        .replaceAll('{channel}', member.guild.channels.cache.get(getGuildConfig(member.guild.id).channelId)?.toString() || '#channel')
        .replaceAll('{count}', member.guild.memberCount.toString());
}

function createDashboard(guild) {
    const config = getGuildConfig(guild.id);

    const channel = config.channelId
        ? guild.channels.cache.get(config.channelId)
        : null;

    const embed = new EmbedBuilder()
        .setColor(config.color || '#191717')
        .setTitle('Welcome Dashboard')
        .setDescription(
            `Configure your server's welcome message here.\n\n` +
            `**Status:** ${config.enabled ? '🟢 Enabled' : '🔴 Disabled'}\n` +
            `**Channel:** ${channel ? channel.toString() : '❌ Not set'}\n\n` +
            `**Title:** ${config.title}\n` +
            `**Message:** ${config.message}\n` +
            `**Image:** ${config.image ? '✅ Set' : '❌ Not set'}\n` +
            `**Color:** \`${config.color}\``
        )
        .setFooter({
            text: 'Use the buttons below to configure your welcome message.'
        });

    const channelRow = new ActionRowBuilder().addComponents(
        new ChannelSelectMenuBuilder()
            .setCustomId(`welcome_channel_${guild.id}`)
            .setPlaceholder('Select welcome channel')
            .setChannelTypes(ChannelType.GuildText)
    );

    const buttonRow1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`welcome_message_${guild.id}`)
            .setLabel('Edit Message')
            .setEmoji('✏️')
            .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
            .setCustomId(`welcome_image_${guild.id}`)
            .setLabel('Set Image')
            .setEmoji('🖼️')
            .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
            .setCustomId(`welcome_color_${guild.id}`)
            .setLabel('Set Color')
            .setEmoji('🎨')
            .setStyle(ButtonStyle.Secondary)
    );

    const buttonRow2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`welcome_preview_${guild.id}`)
            .setLabel('Preview')
            .setEmoji('👀')
            .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
            .setCustomId(`welcome_toggle_${guild.id}`)
            .setLabel(config.enabled ? 'Disable' : 'Enable')
            .setEmoji(config.enabled ? '🔴' : '🟢')
            .setStyle(config.enabled ? ButtonStyle.Danger : ButtonStyle.Success)
    );

    return {
        embeds: [embed],
        components: [channelRow, buttonRow1, buttonRow2]
    };
}

export default {
    data: new SlashCommandBuilder()
        .setName('welcome')
        .setDescription('Configure the server welcome message.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        const dashboard = createDashboard(interaction.guild);

        await interaction.reply({
            ...dashboard,
            ephemeral: true
        });

        const message = await interaction.fetchReply();

        const collector = message.createMessageComponentCollector({
            time: 15 * 60 * 1000
        });

        collector.on('collect', async component => {
            if (!component.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
                return component.reply({
                    content: '❌ You need **Manage Server** permission to use this.',
                    ephemeral: true
                });
            }

            const guildId = interaction.guild.id;
            const config = getGuildConfig(guildId);

            // CHANNEL SELECT
            if (component.customId === `welcome_channel_${guildId}`) {
                const channelId = component.values[0];

                config.channelId = channelId;

                const allConfig = loadConfig();
                allConfig[guildId] = config;
                saveConfig(allConfig);

                await component.update(createDashboard(interaction.guild));
                return;
            }

            // EDIT MESSAGE
            if (component.customId === `welcome_message_${guildId}`) {
                const modal = new ModalBuilder()
                    .setCustomId(`welcome_message_modal_${guildId}`)
                    .setTitle('Edit Welcome Message');

                const titleInput = new TextInputBuilder()
                    .setCustomId('welcome_title')
                    .setLabel('Welcome title')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setMaxLength(256)
                    .setValue(config.title);

                const messageInput = new TextInputBuilder()
                    .setCustomId('welcome_text')
                    .setLabel('Welcome message')
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true)
                    .setMaxLength(4000)
                    .setValue(config.message);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(titleInput),
                    new ActionRowBuilder().addComponents(messageInput)
                );

                await component.showModal(modal);

                try {
                    const submitted = await component.awaitModalSubmit({
                        time: 120000,
                        filter: i =>
                            i.customId === `welcome_message_modal_${guildId}` &&
                            i.user.id === component.user.id
                    });

                    config.title = submitted.fields.getTextInputValue('welcome_title');
                    config.message = submitted.fields.getTextInputValue('welcome_text');

                    const allConfig = loadConfig();
                    allConfig[guildId] = config;
                    saveConfig(allConfig);

                    await submitted.reply({
                        content: '✅ Welcome message updated.',
                        ephemeral: true
                    });

                    await interaction.editReply(createDashboard(interaction.guild));
                } catch {
                    // Modal timed out
                }

                return;
            }

            // SET IMAGE
            if (component.customId === `welcome_image_${guildId}`) {
                const modal = new ModalBuilder()
                    .setCustomId(`welcome_image_modal_${guildId}`)
                    .setTitle('Set Welcome Image');

                const imageInput = new TextInputBuilder()
                    .setCustomId('welcome_image_url')
                    .setLabel('Image URL')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)
                    .setPlaceholder('https://example.com/image.png')
                    .setValue(config.image || '');

                modal.addComponents(
                    new ActionRowBuilder().addComponents(imageInput)
                );

                await component.showModal(modal);

                try {
                    const submitted = await component.awaitModalSubmit({
                        time: 120000,
                        filter: i =>
                            i.customId === `welcome_image_modal_${guildId}` &&
                            i.user.id === component.user.id
                    });

                    config.image =
                        submitted.fields.getTextInputValue('welcome_image_url').trim() || null;

                    const allConfig = loadConfig();
                    allConfig[guildId] = config;
                    saveConfig(allConfig);

                    await submitted.reply({
                        content: config.image
                            ? '✅ Welcome image updated.'
                            : '✅ Welcome image removed.',
                        ephemeral: true
                    });

                    await interaction.editReply(createDashboard(interaction.guild));
                } catch {
                    // Modal timed out
                }

                return;
            }

            // COLOR
            if (component.customId === `welcome_color_${guildId}`) {
                const modal = new ModalBuilder()
                    .setCustomId(`welcome_color_modal_${guildId}`)
                    .setTitle('Set Embed Color');

                const colorInput = new TextInputBuilder()
                    .setCustomId('welcome_color_value')
                    .setLabel('Hex color')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setPlaceholder('#191717')
                    .setValue(config.color);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(colorInput)
                );

                await component.showModal(modal);

                try {
                    const submitted = await component.awaitModalSubmit({
                        time: 120000,
                        filter: i =>
                            i.customId === `welcome_color_modal_${guildId}` &&
                            i.user.id === component.user.id
                    });

                    const color = submitted.fields
                        .getTextInputValue('welcome_color_value')
                        .trim();

                    if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
                        return submitted.reply({
                            content: '❌ Invalid color. Use a hex color such as `#191717`.',
                            ephemeral: true
                        });
                    }

                    config.color = color;

                    const allConfig = loadConfig();
                    allConfig[guildId] = config;
                    saveConfig(allConfig);

                    await submitted.reply({
                        content: `✅ Welcome color changed to \`${color}\`.`,
                        ephemeral: true
                    });

                    await interaction.editReply(createDashboard(interaction.guild));
                } catch {
                    // Modal timed out
                }

                return;
            }

            // TOGGLE
            if (component.customId === `welcome_toggle_${guildId}`) {
                config.enabled = !config.enabled;

                const allConfig = loadConfig();
                allConfig[guildId] = config;
                saveConfig(allConfig);

                await component.update(createDashboard(interaction.guild));
                return;
            }

            // PREVIEW
            if (component.customId === `welcome_preview_${guildId}`) {
                const member = interaction.member;

                const embed = new EmbedBuilder()
                    .setColor(config.color || '#191717')
                    .setTitle(replacePlaceholders(config.title, member))
                    .setDescription(replacePlaceholders(config.message, member));

                if (config.image) {
                    embed.setThumbnail(config.image);
                }

                embed.setFooter({
                    text: `You're the ${interaction.guild.memberCount} member in the server!`
                });

                await component.reply({
                    embeds: [embed],
                    ephemeral: true
                });

                return;
            }
        });
    }
};
