import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    ChannelSelectMenuBuilder,
    ChannelType
} from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('welcome')
        .setDescription('Open the welcome embed builder')
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageGuild
        ),

    async execute(interaction) {
        try {
            const embed = new EmbedBuilder()
                .setColor('#191717')
                .setTitle('🛠️ Welcome Embed Builder')
                .setDescription(
                    'Build your welcome embed using the controls below.'
                )
                .addFields(
                    {
                        name: 'Status',
                        value: '🔴 Disabled',
                        inline: true
                    },
                    {
                        name: 'Channel',
                        value: '❌ Not set',
                        inline: true
                    },
                    {
                        name: 'Color',
                        value: '`#191717`',
                        inline: true
                    },
                    {
                        name: '📝 Title',
                        value: 'Welcome {user}!'
                    },
                    {
                        name: '📄 Description',
                        value:
                            'Hope you enjoy your stay in **{server}**!\\nPlease chat in {channel}'
                    },
                    {
                        name: '👤 Author',
                        value: 'Disabled',
                        inline: true
                    },
                    {
                        name: '🖼️ Thumbnail',
                        value: '❌ Not set',
                        inline: true
                    },
                    {
                        name: '🌄 Image',
                        value: '❌ Not set',
                        inline: true
                    },
                    {
                        name: '🦶 Footer',
                        value:
                            "You're the {count} member in the server!"
                    },
                    {
                        name: '🕐 Timestamp',
                        value: '🔴 Disabled',
                        inline: true
                    }
                )
                .setFooter({
                    text: 'Use the menu below to edit your welcome embed.'
                });

            const channelRow =
                new ActionRowBuilder().addComponents(
                    new ChannelSelectMenuBuilder()
                        .setCustomId(
                            'welcome_builder_channel'
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
                            'welcome_builder_edit'
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
                                    'Edit the embed footer',
                                value: 'footer',
                                emoji: '🦶'
                            }
                        )
                );

            const buttonRow1 =
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(
                            'welcome_builder_preview'
                        )
                        .setLabel('Preview')
                        .setEmoji('👀')
                        .setStyle(
                            ButtonStyle.Primary
                        ),

                    new ButtonBuilder()
                        .setCustomId(
                            'welcome_builder_timestamp'
                        )
                        .setLabel(
                            'Toggle Timestamp'
                        )
                        .setEmoji('🕐')
                        .setStyle(
                            ButtonStyle.Secondary
                        ),

                    new ButtonBuilder()
                        .setCustomId(
                            'welcome_builder_save'
                        )
                        .setLabel('Save')
                        .setEmoji('💾')
                        .setStyle(
                            ButtonStyle.Success
                        )
                );

            const buttonRow2 =
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(
                            'welcome_builder_enable'
                        )
                        .setLabel('Enable Welcome')
                        .setEmoji('🟢')
                        .setStyle(
                            ButtonStyle.Success
                        ),

                    new ButtonBuilder()
                        .setCustomId(
                            'welcome_builder_reset'
                        )
                        .setLabel('Reset')
                        .setEmoji('🔄')
                        .setStyle(
                            ButtonStyle.Danger
                        )
                );

            await interaction.reply({
                embeds: [embed],
                components: [
                    channelRow,
                    editRow,
                    buttonRow1,
                    buttonRow2
                ],
                ephemeral: true
            });

        } catch (error) {
            console.error(
                'Welcome builder error:',
                error
            );

            if (
                !interaction.replied &&
                !interaction.deferred
            ) {
                await interaction.reply({
                    content:
                        '❌ Failed to open the welcome builder.',
                    ephemeral: true
                }).catch(() => {});
            }
        }
    }
};
