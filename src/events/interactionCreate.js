import {
  Events,
  MessageFlags,
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

import { logger } from '../utils/logger.js';

import {
  getWelcomeConfig,
  saveWelcomeConfig,
  updateWelcomeConfig
} from '../utils/database.js';


// ============================================================
// DEFAULT CONFIG
// ============================================================

const DEFAULT_WELCOME = {
  enabled: false,
  channelId: null,

  welcomeMessage: 'Welcome {user} to {server}!',

  title: 'Welcome {user}!',
  description:
    'Hope you enjoy your stay in **{server}**!',

  color: '#191717',

  authorEnabled: false,
  authorName: '',
  authorIcon: '',

  thumbnail: '',
  image: '',

  footerEnabled: true,
  footerText: "You're member #{count}!",
  footerIcon: '',

  timestamp: false
};


// ============================================================
// GET CONFIG
// ============================================================

async function getConfig(client, guildId) {
  try {
    const config = await getWelcomeConfig(
      client,
      guildId
    );

    return {
      ...DEFAULT_WELCOME,
      ...(config || {})
    };
  } catch (error) {
    logger.error(
      '[WELCOME] Failed to get config:',
      error
    );

    return {
      ...DEFAULT_WELCOME
    };
  }
}


// ============================================================
// VARIABLES
// ============================================================

function replaceVariables(text, interaction) {
  if (!text) return '';

  const user = interaction.user;
  const guild = interaction.guild;

  return String(text)
    .replaceAll(
      '{user}',
      user?.toString() || 'User'
    )
    .replaceAll(
      '{user.mention}',
      user?.toString() || 'User'
    )
    .replaceAll(
      '{user.username}',
      user?.username || 'User'
    )
    .replaceAll(
      '{username}',
      user?.username || 'User'
    )
    .replaceAll(
      '{user.id}',
      user?.id || ''
    )
    .replaceAll(
      '{server}',
      guild?.name || 'Server'
    )
    .replaceAll(
      '{server.name}',
      guild?.name || 'Server'
    )
    .replaceAll(
      '{guild.name}',
      guild?.name || 'Server'
    )
    .replaceAll(
      '{guild.id}',
      guild?.id || ''
    )
    .replaceAll(
      '{memberCount}',
      String(guild?.memberCount || 0)
    )
    .replaceAll(
      '{membercount}',
      String(guild?.memberCount || 0)
    )
    .replaceAll(
      '{count}',
      String(guild?.memberCount || 0)
    );
}


// ============================================================
// URL CHECK
// ============================================================

function validUrl(value) {
  if (
    typeof value !== 'string' ||
    !value.trim()
  ) {
    return false;
  }

  try {
    const url = new URL(value.trim());

    return (
      url.protocol === 'http:' ||
      url.protocol === 'https:'
    );
  } catch {
    return false;
  }
}


// ============================================================
// BUILD WELCOME EMBED
// ============================================================

function buildWelcomeEmbed(interaction, config) {
  const embed = new EmbedBuilder();

  const colorText =
  typeof config.color === 'string' &&
  /^#[0-9A-Fa-f]{6}$/.test(config.color.trim())
    ? config.color.trim()
    : '#191717';

const colorNumber = parseInt(
  colorText.replace('#', ''),
  16
);

embed.setColor(colorNumber);


  // TITLE
  if (config.title?.trim()) {
    embed.setTitle(
      replaceVariables(
        config.title,
        interaction
      ).slice(0, 256)
    );
  }


  // DESCRIPTION
  if (config.description?.trim()) {
    embed.setDescription(
      replaceVariables(
        config.description,
        interaction
      ).slice(0, 4096)
    );
  }


  // AUTHOR
  if (
    config.authorEnabled &&
    config.authorName?.trim()
  ) {
    const author = {
      name: replaceVariables(
        config.authorName,
        interaction
      ).slice(0, 256)
    };

    if (validUrl(config.authorIcon)) {
      author.iconURL =
        config.authorIcon.trim();
    }

    embed.setAuthor(author);
  }


  // THUMBNAIL
  if (validUrl(config.thumbnail)) {
    embed.setThumbnail(
      config.thumbnail.trim()
    );
  }


  // IMAGE
  if (validUrl(config.image)) {
    embed.setImage(
      config.image.trim()
    );
  }


  // FOOTER
  if (
    config.footerEnabled &&
    config.footerText?.trim()
  ) {
    const footer = {
      text: replaceVariables(
        config.footerText,
        interaction
      ).slice(0, 2048)
    };

    if (validUrl(config.footerIcon)) {
      footer.iconURL =
        config.footerIcon.trim();
    }

    embed.setFooter(footer);
  }


  // TIMESTAMP
  if (config.timestamp) {
    embed.setTimestamp();
  }

  return embed;
}


// ============================================================
// DASHBOARD
// ============================================================

function buildDashboard(interaction, config) {
  const channel =
    config.channelId
      ? interaction.guild.channels.cache.get(
          config.channelId
        )
      : null;


  const embed =
    new EmbedBuilder()
      .setColor(
        config.color || '#191717'
      )
      .setTitle(
        '🛠️ Welcome Embed Builder'
      )
      .setDescription(
        'Build your welcome embed using the controls below.'
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
          value:
            `\`${config.color}\``,
          inline: true
        },
        {
          name: '📝 Title',
          value:
            config.title ||
            'Not set'
        },
        {
          name: '📄 Description',
          value:
            config.description ||
            'Not set'
        },
        {
          name: '👤 Author',
          value:
            config.authorEnabled
              ? (
                  config.authorName ||
                  'Enabled'
                )
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
            config.footerEnabled
              ? (
                  config.footerText ||
                  'Enabled'
                )
              : 'Disabled',
          inline: true
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


  // CHANNEL SELECTOR
  const channelMenu =
    new ChannelSelectMenuBuilder()
      .setCustomId(
        'welcome_channel'
      )
      .setPlaceholder(
        '📢 Select welcome channel'
      )
      .setChannelTypes(
        ChannelType.GuildText
      );


  // EDIT SELECTOR
  const editMenu =
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
          label: 'Color',
          description:
            'Change the embed color',
          value: 'color',
          emoji: '🎨'
        },
        {
          label: 'Author',
          description:
            'Edit the embed author',
          value: 'author',
          emoji: '👤'
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
      );


  // BUTTON ROW
  const row3 =
    new ActionRowBuilder()
      .addComponents(

        new ButtonBuilder()
          .setCustomId(
            'welcome_preview'
          )
          .setLabel(
            'Preview'
          )
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
            'welcome_author'
          )
          .setLabel(
            config.authorEnabled
              ? 'Disable Author'
              : 'Enable Author'
          )
          .setEmoji('👤')
          .setStyle(
            ButtonStyle.Secondary
          ),

        new ButtonBuilder()
          .setCustomId(
            'welcome_footer'
          )
          .setLabel(
            config.footerEnabled
              ? 'Disable Footer'
              : 'Enable Footer'
          )
          .setEmoji('🦶')
          .setStyle(
            ButtonStyle.Secondary
          )
      );


  // SAVE / ENABLE / RESET
  const row4 =
    new ActionRowBuilder()
      .addComponents(

        new ButtonBuilder()
          .setCustomId(
            'welcome_save'
          )
          .setLabel(
            'Save'
          )
          .setEmoji('💾')
          .setStyle(
            ButtonStyle.Success
          ),

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
          .setLabel(
            'Reset'
          )
          .setEmoji('🔄')
          .setStyle(
            ButtonStyle.Danger
          )
      );


  return {
    embeds: [embed],

    components: [
      new ActionRowBuilder()
        .addComponents(
          channelMenu
        ),

      new ActionRowBuilder()
        .addComponents(
          editMenu
        ),

      row3,
      row4
    ]
  };
}


// ============================================================
// MODAL CREATOR
// ============================================================

function createModal(
  customId,
  title,
  fields
) {
  const modal =
    new ModalBuilder()
      .setCustomId(customId)
      .setTitle(title);


  for (const field of fields) {
    const input =
      new TextInputBuilder()
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


    if (
      field.value !== undefined &&
      field.value !== null &&
      String(field.value).length
    ) {
      input.setValue(
        String(field.value).slice(
          0,
          field.maxLength || 1000
        )
      );
    }


    modal.addComponents(
      new ActionRowBuilder()
        .addComponents(input)
    );
  }

  return modal;
}


// ============================================================
// INTERACTION CREATE
// ============================================================

export default {
  name: Events.InteractionCreate,

  once: false,

  async execute(
    interaction,
    client
  ) {

    try {

      // ========================================================
      // /WELCOME
      // ========================================================

      if (
        interaction.isChatInputCommand() &&
        interaction.commandName === 'welcome'
      ) {

        if (!interaction.guild) {
          await interaction.reply({
            content:
              '❌ This command can only be used in a server.',
            flags:
              MessageFlags.Ephemeral
          });

          return;
        }


        const config =
          await getConfig(
            client,
            interaction.guild.id
          );


        await interaction.reply({
          ...buildDashboard(
            interaction,
            config
          ),

          flags:
            MessageFlags.Ephemeral
        });

        return;
      }


      // ========================================================
      // CHANNEL SELECT
      // ========================================================

      if (
        interaction.isChannelSelectMenu() &&
        interaction.customId ===
          'welcome_channel'
      ) {

        const channelId =
          interaction.values[0];


        await updateWelcomeConfig(
          client,
          interaction.guild.id,
          {
            channelId
          }
        );


        const config =
          await getConfig(
            client,
            interaction.guild.id
          );


        await interaction.update(
          buildDashboard(
            interaction,
            config
          )
        );

        return;
      }


      // ========================================================
      // EDIT SELECT
      // ========================================================

      if (
        interaction.isStringSelectMenu() &&
        interaction.customId ===
          'welcome_edit'
      ) {

        const type =
          interaction.values[0];


        const config =
          await getConfig(
            client,
            interaction.guild.id
          );


        // TITLE
        if (type === 'title') {

          await interaction.showModal(
            createModal(
              'welcome_modal_title',
              'Edit Welcome Title',
              [
                {
                  id: 'title',
                  label: 'Title',
                  value:
                    config.title,
                  maxLength: 256
                }
              ]
            )
          );

          return;
        }


        // DESCRIPTION
        if (type === 'description') {

          await interaction.showModal(
            createModal(
              'welcome_modal_description',
              'Edit Welcome Description',
              [
                {
                  id: 'description',
                  label:
                    'Description',
                  value:
                    config.description,
                  paragraph: true,
                  maxLength: 4096
                }
              ]
            )
          );

          return;
        }


        // COLOR
        if (type === 'color') {

          await interaction.showModal(
            createModal(
              'welcome_modal_color',
              'Edit Embed Color',
              [
                {
                  id: 'color',
                  label:
                    'Hex Color',
                  value:
                    config.color,
                  maxLength: 7
                }
              ]
            )
          );

          return;
        }


        // AUTHOR
        if (type === 'author') {

          await interaction.showModal(
            createModal(
              'welcome_modal_author',
              'Edit Author',
              [
                {
                  id: 'authorName',
                  label:
                    'Author Name',
                  value:
                    config.authorName,
                  maxLength: 256
                },
                {
                  id: 'authorIcon',
                  label:
                    'Author Icon URL',
                  value:
                    config.authorIcon,
                  maxLength: 1000
                }
              ]
            )
          );

          return;
        }


        // THUMBNAIL
        if (type === 'thumbnail') {

          await interaction.showModal(
            createModal(
              'welcome_modal_thumbnail',
              'Edit Thumbnail',
              [
                {
                  id: 'thumbnail',
                  label:
                    'Thumbnail URL',
                  value:
                    config.thumbnail,
                  maxLength: 1000
                }
              ]
            )
          );

          return;
        }


        // IMAGE
        if (type === 'image') {

          await interaction.showModal(
            createModal(
              'welcome_modal_image',
              'Edit Image',
              [
                {
                  id: 'image',
                  label:
                    'Image URL',
                  value:
                    config.image,
                  maxLength: 1000
                }
              ]
            )
          );

          return;
        }


        // FOOTER
        if (type === 'footer') {

          await interaction.showModal(
            createModal(
              'welcome_modal_footer',
              'Edit Footer',
              [
                {
                  id: 'footerText',
                  label:
                    'Footer Text',
                  value:
                    config.footerText,
                  maxLength: 2048
                },
                {
                  id: 'footerIcon',
                  label:
                    'Footer Icon URL',
                  value:
                    config.footerIcon,
                  maxLength: 1000
                }
              ]
            )
          );

          return;
        }
      }


      // ========================================================
      // BUTTONS
      // ========================================================

      if (
        interaction.isButton()
      ) {

        const guildId =
          interaction.guildId;


        if (!guildId) {
          return;
        }


        // ------------------------------------------------------
        // PREVIEW
        // ------------------------------------------------------

        if (
          interaction.customId ===
          'welcome_preview'
        ) {

          const config =
            await getConfig(
              client,
              guildId
            );


          const embed =
            buildWelcomeEmbed(
              interaction,
              config
            );


          await interaction.reply({
            content:
              '👀 **Welcome Message Preview**',
            embeds: [embed],
            flags:
              MessageFlags.Ephemeral
          });

          return;
        }


        // ------------------------------------------------------
        // SAVE
        // ------------------------------------------------------

        if (
          interaction.customId ===
          'welcome_save'
        ) {

          const config =
            await getConfig(
              client,
              guildId
            );


          await saveWelcomeConfig(
            client,
            guildId,
            config
          );


          await interaction.reply({
            content:
              '💾 **Welcome embed saved successfully!**',
            flags:
              MessageFlags.Ephemeral
          });

          return;
        }


        // ------------------------------------------------------
        // TIMESTAMP
        // ------------------------------------------------------

        if (
          interaction.customId ===
          'welcome_timestamp'
        ) {

          const config =
            await getConfig(
              client,
              guildId
            );


          await updateWelcomeConfig(
            client,
            guildId,
            {
              timestamp:
                !config.timestamp
            }
          );


          const updated =
            await getConfig(
              client,
              guildId
            );


          await interaction.update(
            buildDashboard(
              interaction,
              updated
            )
          );

          return;
        }


        // ------------------------------------------------------
        // AUTHOR
        // ------------------------------------------------------

        if (
          interaction.customId ===
          'welcome_author'
        ) {

          const config =
            await getConfig(
              client,
              guildId
            );


          await updateWelcomeConfig(
            client,
            guildId,
            {
              authorEnabled:
                !config.authorEnabled
            }
          );


          const updated =
            await getConfig(
              client,
              guildId
            );


          await interaction.update(
            buildDashboard(
              interaction,
              updated
            )
          );

          return;
        }


        // ------------------------------------------------------
        // FOOTER
        // ------------------------------------------------------

        if (
          interaction.customId ===
          'welcome_footer'
        ) {

          const config =
            await getConfig(
              client,
              guildId
            );


          await updateWelcomeConfig(
            client,
            guildId,
            {
              footerEnabled:
                !config.footerEnabled
            }
          );


          const updated =
            await getConfig(
              client,
              guildId
            );


          await interaction.update(
            buildDashboard(
              interaction,
              updated
            )
          );

          return;
        }


        // ------------------------------------------------------
        // ENABLE / DISABLE
        // ------------------------------------------------------

        if (
          interaction.customId ===
          'welcome_enable'
        ) {

          const config =
            await getConfig(
              client,
              guildId
            );


          if (!config.channelId) {

            await interaction.reply({
              content:
                '❌ Select a welcome channel first.',
              flags:
                MessageFlags.Ephemeral
            });

            return;
          }


          await updateWelcomeConfig(
            client,
            guildId,
            {
              enabled:
                !config.enabled
            }
          );


          const updated =
            await getConfig(
              client,
              guildId
            );


          await interaction.update(
            buildDashboard(
              interaction,
              updated
            )
          );

          return;
        }


        // ------------------------------------------------------
        // RESET
        // ------------------------------------------------------

        if (
          interaction.customId ===
          'welcome_reset'
        ) {

          await saveWelcomeConfig(
            client,
            guildId,
            {
              ...DEFAULT_WELCOME
            }
          );


          const config =
            await getConfig(
              client,
              guildId
            );


          await interaction.update(
            buildDashboard(
              interaction,
              config
            )
          );

          return;
        }
      }


      // ========================================================
      // MODALS
      // ========================================================

      if (
        interaction.isModalSubmit()
      ) {

        const guildId =
          interaction.guildId;


        if (!guildId) {
          return;
        }


        // ------------------------------------------------------
        // TITLE
        // ------------------------------------------------------

        if (
          interaction.customId ===
          'welcome_modal_title'
        ) {

          await updateWelcomeConfig(
            client,
            guildId,
            {
              title:
                interaction.fields.getTextInputValue(
                  'title'
                )
            }
          );


          const config =
            await getConfig(
              client,
              guildId
            );


          await interaction.update(
            buildDashboard(
              interaction,
              config
            )
          );

          return;
        }


        // ------------------------------------------------------
        // DESCRIPTION
        // ------------------------------------------------------

        if (
          interaction.customId ===
          'welcome_modal_description'
        ) {

          await updateWelcomeConfig(
            client,
            guildId,
            {
              description:
                interaction.fields.getTextInputValue(
                  'description'
                )
            }
          );


          const config =
            await getConfig(
              client,
              guildId
            );


          await interaction.update(
            buildDashboard(
              interaction,
              config
            )
          );

          return;
        }


        // ------------------------------------------------------
        // COLOR
        // ------------------------------------------------------

        if (
          interaction.customId ===
          'welcome_modal_color'
        ) {

          const color =
            interaction.fields
              .getTextInputValue(
                'color'
              )
              .trim();


          if (
            !/^#[0-9A-Fa-f]{6}$/.test(
              color
            )
          ) {

            await interaction.reply({
              content:
                '❌ Invalid color. Use a hex color like `#191717`.',
              flags:
                MessageFlags.Ephemeral
            });

            return;
          }


          await updateWelcomeConfig(
            client,
            guildId,
            {
              color
            }
          );


          const config =
            await getConfig(
              client,
              guildId
            );


          await interaction.update(
            buildDashboard(
              interaction,
              config
            )
          );

          return;
        }


        // ------------------------------------------------------
        // AUTHOR
        // ------------------------------------------------------

        if (
          interaction.customId ===
          'welcome_modal_author'
        ) {

          await updateWelcomeConfig(
            client,
            guildId,
            {
              authorEnabled: true,

              authorName:
                interaction.fields.getTextInputValue(
                  'authorName'
                ),

              authorIcon:
                interaction.fields.getTextInputValue(
                  'authorIcon'
                )
            }
          );


          const config =
            await getConfig(
              client,
              guildId
            );


          await interaction.update(
            buildDashboard(
              interaction,
              config
            )
          );

          return;
        }


        // ------------------------------------------------------
        // THUMBNAIL
        // ------------------------------------------------------

        if (
          interaction.customId ===
          'welcome_modal_thumbnail'
        ) {

          await updateWelcomeConfig(
            client,
            guildId,
            {
              thumbnail:
                interaction.fields.getTextInputValue(
                  'thumbnail'
                )
            }
          );


          const config =
            await getConfig(
              client,
              guildId
            );


          await interaction.update(
            buildDashboard(
              interaction,
              config
            )
          );

          return;
        }


        // ------------------------------------------------------
        // IMAGE
        // ------------------------------------------------------

        if (
          interaction.customId ===
          'welcome_modal_image'
        ) {

          await updateWelcomeConfig(
            client,
            guildId,
            {
              image:
                interaction.fields.getTextInputValue(
                  'image'
                )
            }
          );


          const config =
            await getConfig(
              client,
              guildId
            );


          await interaction.update(
            buildDashboard(
              interaction,
              config
            )
          );

          return;
        }


        // ------------------------------------------------------
        // FOOTER
        // ------------------------------------------------------

        if (
          interaction.customId ===
          'welcome_modal_footer'
        ) {

          await updateWelcomeConfig(
            client,
            guildId,
            {
              footerEnabled: true,

              footerText:
                interaction.fields.getTextInputValue(
                  'footerText'
                ),

              footerIcon:
                interaction.fields.getTextInputValue(
                  'footerIcon'
                )
            }
          );


          const config =
            await getConfig(
              client,
              guildId
            );


          await interaction.update(
            buildDashboard(
              interaction,
              config
            )
          );

          return;
        }
      }

    } catch (error) {

      logger.error(
        '[WELCOME] Interaction error:',
        error
      );


      try {

        const errorMessage =
          error?.message ||
          'Unknown error';

        if (
          interaction.replied ||
          interaction.deferred
        ) {

          await interaction.followUp({
            content:
              `❌ Welcome Builder error: \`${errorMessage}\``,
            flags:
              MessageFlags.Ephemeral
          });

        } else {

          await interaction.reply({
            content:
              `❌ Welcome Builder error: \`${errorMessage}\``,
            flags:
              MessageFlags.Ephemeral
          });
        }

      } catch {
        // Ignore Discord response errors
      }
    }
  }
};
