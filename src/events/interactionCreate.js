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
import { getGuildConfig } from '../services/config/guildConfig.js';

import {
  getBotMessage,
  isBotOwner,
  isCommandCategoryEnabled,
  isMaintenanceMode
} from '../config/bot.js';

import botConfig from '../config/bot.js';

import {
  handleApplicationModal
} from '../commands/Community/apply.js';

import {
  handleInteractionError,
  createError,
  ErrorTypes,
  ErrorCodes
} from '../utils/errorHandler.js';

import { InteractionHelper } from '../utils/interactionHelper.js';

import {
  createInteractionTraceContext,
  runWithTraceContext
} from '../utils/logger.js';

import {
  validateChatInputPayloadOrThrow
} from '../utils/commandInputValidation.js';

import {
  enforceAbuseProtection,
  formatCooldownDuration
} from '../utils/abuseProtection.js';

import {
  isCommandEnabled
} from '../services/commandAccessService.js';

import {
  resolveSlashAccessKey
} from '../utils/messageAdapter.js';

import {
  isCollectorManagedComponent
} from '../utils/collectorComponents.js';

import {
  ResponseCoordinator
} from '../utils/responseCoordinator.js';

import {
  enforceDefaultCommandPermissions
} from '../utils/permissionGuard.js';

import {
  getWelcomeConfig,
  saveWelcomeConfig
} from '../utils/database.js';


const COMMAND_ERROR_SUBTYPES = {
  warn: 'warn_failed',
  kick: 'kick_failed',
  ban: 'ban_failed',
  unban: 'unban_failed',
  timeout: 'timeout_failed',
  untimeout: 'untimeout_failed',
  warnings: 'warnings_view_failed',
  ticket: 'ticket_failed',
  serverstats: 'serverstats_failed',
  gcreate: 'giveaway_failed',
  gend: 'giveaway_failed',
  gdelete: 'giveaway_failed',
  greroll: 'giveaway_failed'
};


/* =========================================================
   WELCOME BUILDER
========================================================= */

function defaultWelcomeConfig() {
  return {
    enabled: false,
    channelId: null,

    welcomeMessage:
      'Welcome {user} to {server}!',

    welcomePing: false,

    welcomeEmbed: {
      title: '🎉 Welcome!',
      description:
        'Welcome {user} to {server}!',
      color: '#191717',
      footer:
        'Welcome to {server}!',

      image: {
        url: null
      },

      thumbnail: null
    },

    welcomeImage: null
  };
}


const temporaryWelcomeConfigs =
  new Map();


function getBuilderConfig(guildId) {
  if (
    !temporaryWelcomeConfigs.has(
      guildId
    )
  ) {
    temporaryWelcomeConfigs.set(
      guildId,
      defaultWelcomeConfig()
    );
  }

  return temporaryWelcomeConfigs.get(
    guildId
  );
}


function normalizeWelcomeConfig(
  config
) {
  const defaults =
    defaultWelcomeConfig();

  return {
    ...defaults,
    ...(config || {}),

    welcomeEmbed: {
      ...defaults.welcomeEmbed,
      ...(config?.welcomeEmbed || {})
    }
  };
}


async function loadWelcomeBuilderConfig(
  client,
  guildId
) {
  try {
    const databaseConfig =
      await getWelcomeConfig(
        client,
        guildId
      );

    const config =
      normalizeWelcomeConfig(
        databaseConfig
      );

    temporaryWelcomeConfigs.set(
      guildId,
      config
    );

    return config;

  } catch (error) {
    logger.error(
      'Failed to load welcome configuration:',
      {
        guildId,
        error
      }
    );

    return getBuilderConfig(
      guildId
    );
  }
}


function replaceWelcomeVariables(
  text,
  interaction
) {
  if (!text) {
    return '';
  }

  const user =
    interaction.user;

  const guild =
    interaction.guild;

  return String(text)
    .replaceAll(
      '{user.mention}',
      user?.toString() ||
        'User'
    )
    .replaceAll(
      '{user}',
      user?.toString() ||
        'User'
    )
    .replaceAll(
      '{user.username}',
      user?.username ||
        'User'
    )
    .replaceAll(
      '{username}',
      user?.username ||
        'User'
    )
    .replaceAll(
      '{user.id}',
      user?.id ||
        ''
    )
    .replaceAll(
      '{server.name}',
      guild?.name ||
        'Server'
    )
    .replaceAll(
      '{guild.name}',
      guild?.name ||
        'Server'
    )
    .replaceAll(
      '{server}',
      guild?.name ||
        'Server'
    )
    .replaceAll(
      '{guild.id}',
      guild?.id ||
        ''
    )
    .replaceAll(
      '{memberCount}',
      String(
        guild?.memberCount ||
          0
      )
    )
    .replaceAll(
      '{membercount}',
      String(
        guild?.memberCount ||
          0
      )
    )
    .replaceAll(
      '{count}',
      String(
        guild?.memberCount ||
          0
      )
    );
}


function parseWelcomeColor(
  value
) {
  if (
    typeof value === 'number'
  ) {
    return value;
  }

  if (
    typeof value === 'string'
  ) {
    const trimmed =
      value.trim();

    if (
      /^#[0-9A-Fa-f]{6}$/.test(
        trimmed
      )
    ) {
      return parseInt(
        trimmed.slice(1),
        16
      );
    }
  }

  return 0x191717;
}


function isValidUrl(
  value
) {
  if (!value) {
    return false;
  }

  try {
    const url =
      new URL(value);

    return (
      url.protocol ===
        'http:' ||
      url.protocol ===
        'https:'
    );

  } catch {
    return false;
  }
}


function getWelcomeImageUrl(
  config
) {
  if (
    typeof config.welcomeImage ===
      'string' &&
    config.welcomeImage
  ) {
    return config.welcomeImage;
  }

  if (
    config.welcomeEmbed?.image
      ?.url
  ) {
    return config.welcomeEmbed
      .image.url;
  }

  return null;
}


function createWelcomeEmbed(
  interaction,
  config
) {
  config =
    normalizeWelcomeConfig(
      config
    );

  const embed =
    new EmbedBuilder()
      .setColor(
        parseWelcomeColor(
          config.welcomeEmbed
            ?.color
        )
      );


  const title =
    replaceWelcomeVariables(
      config.welcomeEmbed
        ?.title ||
        '🎉 Welcome!',
      interaction
    );

  if (title) {
    embed.setTitle(
      title.slice(0, 256)
    );
  }


  const description =
    replaceWelcomeVariables(
      config.welcomeEmbed
        ?.description ||
        config.welcomeMessage ||
        'Welcome {user} to {server}!',
      interaction
    );

  if (description) {
    embed.setDescription(
      description.slice(0, 4096)
    );
  }


  const image =
    getWelcomeImageUrl(
      config
    );

  if (
    image &&
    isValidUrl(image)
  ) {
    embed.setImage(
      image
    );
  }


  if (
    config.welcomeEmbed
      ?.thumbnail?.url &&
    isValidUrl(
      config.welcomeEmbed
        .thumbnail.url
    )
  ) {
    embed.setThumbnail(
      config.welcomeEmbed
        .thumbnail.url
    );
  }


  const footer =
    config.welcomeEmbed
      ?.footer;

  if (footer) {
    embed.setFooter({
      text:
        replaceWelcomeVariables(
          footer,
          interaction
        ).slice(0, 2048)
    });
  }


  return embed;
}


function createWelcomeDashboard(
  interaction,
  config
) {
  config =
    normalizeWelcomeConfig(
      config
    );

  const embed =
    new EmbedBuilder()
      .setColor(
        parseWelcomeColor(
          config.welcomeEmbed
            ?.color
        )
      )
      .setTitle(
        '🛠️ Welcome Builder'
      )
      .setDescription(
        'Configure the message that will be sent when someone joins the server.'
      )
      .addFields(
        {
          name: '📢 Channel',
          value:
            config.channelId
              ? `<#${config.channelId}>`
              : 'Not selected',
          inline: true
        },
        {
          name: '🟢 Status',
          value:
            config.enabled
              ? 'Enabled'
              : 'Disabled',
          inline: true
        },
        {
          name: '🎨 Color',
          value:
            `\`${config.welcomeEmbed?.color || '#191717'}\``,
          inline: true
        },
        {
          name: '📝 Title',
          value:
            config.welcomeEmbed
              ?.title ||
            'Not set',
          inline: false
        },
        {
          name: '📄 Description',
          value:
            (
              config.welcomeEmbed
                ?.description ||
              'Not set'
            ).slice(0, 1024),
          inline: false
        }
      );


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


  if (
    config.channelId
  ) {
    channelMenu.setDefaultChannels(
      config.channelId
    );
  }


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
            'Edit the welcome title',
          value: 'title',
          emoji: '📝'
        },
        {
          label: 'Description',
          description:
            'Edit the welcome description',
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
          label: 'Footer',
          description:
            'Change the embed footer',
          value: 'footer',
          emoji: '🔻'
        },
        {
          label: 'Image',
          description:
            'Set the welcome image',
          value: 'image',
          emoji: '🖼️'
        },
        {
          label: 'Thumbnail',
          description:
            'Set the thumbnail',
          value: 'thumbnail',
          emoji: '🌄'
        }
      );


  const channelRow =
    new ActionRowBuilder()
      .addComponents(
        channelMenu
      );


  const editRow =
    new ActionRowBuilder()
      .addComponents(
        editMenu
      );


  const buttonRow =
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
              ? 'Disable'
              : 'Enable'
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
            ButtonStyle.Secondary
          )
      );


  return {
    embeds: [embed],
    components: [
      channelRow,
      editRow,
      buttonRow
    ]
  };
}


/* =========================================================
   IMPORTANT FIX:
   This function MUST NOT be async.
========================================================= */

function createWelcomeModal(
  customId,
  title,
  value,
  label,
  style = TextInputStyle.Short,
  maxLength = 1000
) {
  const input =
    new TextInputBuilder()
      .setCustomId('value')
      .setLabel(label)
      .setStyle(style)
      .setRequired(false)
      .setMaxLength(maxLength);

  if (
    value !== undefined &&
    value !== null &&
    String(value).length > 0
  ) {
    input.setValue(
      String(value).slice(
        0,
        maxLength
      )
    );
  }

  return new ModalBuilder()
    .setCustomId(customId)
    .setTitle(title)
    .addComponents(
      new ActionRowBuilder()
        .addComponents(input)
    );
}


async function saveWelcomeBuilderConfig(
  client,
  guildId,
  config
) {
  try {
    const normalized =
      normalizeWelcomeConfig(
        config
      );

    const databaseConfig = {
      enabled:
        normalized.enabled,

      channelId:
        normalized.channelId,

      welcomeMessage:
        normalized.welcomeMessage ||
        normalized.welcomeEmbed
          ?.description ||
        'Welcome {user} to {server}!',

      welcomePing:
        normalized.welcomePing === true,

      welcomeEmbed: {
        title:
          normalized.welcomeEmbed
            ?.title ||
          '🎉 Welcome!',

        description:
          normalized.welcomeEmbed
            ?.description ||
          normalized.welcomeMessage ||
          'Welcome {user} to {server}!',

        color:
          normalized.welcomeEmbed
            ?.color ||
          '#191717',

        footer:
          normalized.welcomeEmbed
            ?.footer ||
          null,

        image: {
          url:
            getWelcomeImageUrl(
              normalized
            )
        },

        thumbnail:
          normalized.welcomeEmbed
            ?.thumbnail?.url
            ? {
                url:
                  normalized
                    .welcomeEmbed
                    .thumbnail
                    .url
              }
            : null
      },

      welcomeImage:
        getWelcomeImageUrl(
          normalized
        )
    };


    const result =
      await saveWelcomeConfig(
        client,
        guildId,
        databaseConfig
      );


    if (
      result === false
    ) {
      return false;
    }


    temporaryWelcomeConfigs.set(
      guildId,
      normalized
    );

    return true;

  } catch (error) {
    logger.error(
      'Failed to save welcome configuration:',
      {
        guildId,
        error
      }
    );

    return false;
  }
}


async function handleWelcomeInteraction(
  interaction,
  client
) {
  if (
    !interaction.guildId
  ) {
    return false;
  }


  /* =====================================================
     /welcome COMMAND
  ===================================================== */

  if (
    interaction.isChatInputCommand() &&
    interaction.commandName ===
      'welcome'
  ) {
    const config =
      await loadWelcomeBuilderConfig(
        client,
        interaction.guildId
      );


    await interaction.reply({
      ...createWelcomeDashboard(
        interaction,
        config
      ),
      flags:
        MessageFlags.Ephemeral
    });


    return true;
  }


  /* =====================================================
     CHANNEL SELECT
  ===================================================== */

  if (
    interaction.isChannelSelectMenu() &&
    interaction.customId ===
      'welcome_channel'
  ) {
    const config =
      await loadWelcomeBuilderConfig(
        client,
        interaction.guildId
      );


    config.channelId =
      interaction.values[0] ||
      null;


    temporaryWelcomeConfigs.set(
      interaction.guildId,
      config
    );


    await interaction.update(
      createWelcomeDashboard(
        interaction,
        config
      )
    );


    return true;
  }


  /* =====================================================
     EDIT SELECT MENU
  ===================================================== */

  if (
    interaction.isStringSelectMenu() &&
    interaction.customId ===
      'welcome_edit'
  ) {
    const config =
      await loadWelcomeBuilderConfig(
        client,
        interaction.guildId
      );


    const selected =
      interaction.values[0];


    if (
      selected === 'title'
    ) {
      await interaction.showModal(
        createWelcomeModal(
          'welcome_modal_title',
          'Edit Welcome Title',
          config.welcomeEmbed
            ?.title ||
            '',
          'Title',
          TextInputStyle.Short,
          256
        )
      );

      return true;
    }


    if (
      selected ===
        'description'
    ) {
      await interaction.showModal(
        createWelcomeModal(
          'welcome_modal_description',
          'Edit Welcome Description',
          config.welcomeEmbed
            ?.description ||
            config.welcomeMessage ||
            '',
          'Description',
          TextInputStyle.Paragraph,
          4096
        )
      );

      return true;
    }


    if (
      selected === 'color'
    ) {
      await interaction.showModal(
        createWelcomeModal(
          'welcome_modal_color',
          'Edit Embed Color',
          config.welcomeEmbed
            ?.color ||
            '#191717',
          'Hex Color',
          TextInputStyle.Short,
          7
        )
      );

      return true;
    }


    if (
      selected === 'footer'
    ) {
      await interaction.showModal(
        createWelcomeModal(
          'welcome_modal_footer',
          'Edit Embed Footer',
          config.welcomeEmbed
            ?.footer ||
            '',
          'Footer',
          TextInputStyle.Short,
          2048
        )
      );

      return true;
    }


    if (
      selected === 'image'
    ) {
      await interaction.showModal(
        createWelcomeModal(
          'welcome_modal_image',
          'Edit Welcome Image',
          getWelcomeImageUrl(
            config
          ) || '',
          'Image URL',
          TextInputStyle.Short,
          1000
        )
      );

      return true;
    }


    if (
      selected === 'thumbnail'
    ) {
      const thumbnail =
        config.welcomeEmbed
          ?.thumbnail?.url ||
        '';

      await interaction.showModal(
        createWelcomeModal(
          'welcome_modal_thumbnail',
          'Edit Thumbnail',
          thumbnail,
          'Image URL',
          TextInputStyle.Short,
          1000
        )
      );

      return true;
    }
  }


  /* =====================================================
     BUTTONS
  ===================================================== */

  if (
    interaction.isButton() &&
    interaction.customId.startsWith(
      'welcome_'
    )
  ) {
    const config =
      await loadWelcomeBuilderConfig(
        client,
        interaction.guildId
      );


    /* ===============================
       PREVIEW
    =============================== */

    if (
      interaction.customId ===
        'welcome_preview'
    ) {
      await interaction.reply({
        content:
          config.welcomePing
            ? interaction.user.toString()
            : undefined,

        embeds: [
          createWelcomeEmbed(
            interaction,
            config
          )
        ],

        flags:
          MessageFlags.Ephemeral
      });


      return true;
    }


    /* ===============================
       SAVE
    =============================== */

    if (
      interaction.customId ===
        'welcome_save'
    ) {
      const saved =
        await saveWelcomeBuilderConfig(
          client,
          interaction.guildId,
          config
        );


      if (!saved) {
        await interaction.reply({
          content:
            '❌ I could not save the welcome configuration. Check the bot console for the database error.',

          flags:
            MessageFlags.Ephemeral
        });

        return true;
      }


      await interaction.reply({
        content:
          '✅ Welcome settings saved successfully!',

        flags:
          MessageFlags.Ephemeral
      });


      return true;
    }


    /* ===============================
       ENABLE / DISABLE
    =============================== */

    if (
      interaction.customId ===
        'welcome_enable'
    ) {
      config.enabled =
        !config.enabled;


      const saved =
        await saveWelcomeBuilderConfig(
          client,
          interaction.guildId,
          config
        );


      if (!saved) {
        await interaction.reply({
          content:
            '❌ Failed to save the welcome status.',

          flags:
            MessageFlags.Ephemeral
        });

        return true;
      }


      await interaction.update(
        createWelcomeDashboard(
          interaction,
          config
        )
      );


      return true;
    }


    /* ===============================
       RESET
    =============================== */

    if (
      interaction.customId ===
        'welcome_reset'
    ) {
      const resetConfig =
        defaultWelcomeConfig();


      temporaryWelcomeConfigs.set(
        interaction.guildId,
        resetConfig
      );


      await saveWelcomeBuilderConfig(
        client,
        interaction.guildId,
        resetConfig
      );


      await interaction.update(
        createWelcomeDashboard(
          interaction,
          resetConfig
        )
      );


      return true;
    }
  }


  /* =====================================================
     MODALS
  ===================================================== */

  if (
    interaction.isModalSubmit() &&
    interaction.customId.startsWith(
      'welcome_modal_'
    )
  ) {
    const config =
      await loadWelcomeBuilderConfig(
        client,
        interaction.guildId
      );


    let value = '';


    try {
      value =
        interaction.fields.getTextInputValue(
          'value'
        );
    } catch {
      value = '';
    }


    /* ===============================
       TITLE
    =============================== */

    if (
      interaction.customId ===
        'welcome_modal_title'
    ) {
      config.welcomeEmbed.title =
        value.trim();
    }


    /* ===============================
       DESCRIPTION
    =============================== */

    else if (
      interaction.customId ===
        'welcome_modal_description'
    ) {
      config.welcomeEmbed.description =
        value;

      config.welcomeMessage =
        value ||
        'Welcome {user} to {server}!';
    }


    /* ===============================
       COLOR
    =============================== */

    else if (
      interaction.customId ===
        'welcome_modal_color'
    ) {
      const color =
        value.trim();


      if (
        !/^#[0-9A-Fa-f]{6}$/.test(
          color
        )
      ) {
        await interaction.reply({
          content:
            '❌ Invalid color. Use a 6-digit hex color such as `#191717`.',

          flags:
            MessageFlags.Ephemeral
        });

        return true;
      }


      config.welcomeEmbed.color =
        color;
    }


    /* ===============================
       FOOTER
    =============================== */

    else if (
      interaction.customId ===
        'welcome_modal_footer'
    ) {
      config.welcomeEmbed.footer =
        value.trim() ||
        null;
    }


    /* ===============================
       IMAGE
    =============================== */

    else if (
      interaction.customId ===
        'welcome_modal_image'
    ) {
      const image =
        value.trim();


      if (
        image &&
        !isValidUrl(image)
      ) {
        await interaction.reply({
          content:
            '❌ That is not a valid image URL.',

          flags:
            MessageFlags.Ephemeral
        });

        return true;
      }


      config.welcomeImage =
        image || null;


      config.welcomeEmbed.image = {
        url:
          image || null
      };
    }


    /* ===============================
       THUMBNAIL
    =============================== */

    else if (
      interaction.customId ===
        'welcome_modal_thumbnail'
    ) {
      const thumbnail =
        value.trim();


      if (
        thumbnail &&
        !isValidUrl(
          thumbnail
        )
      ) {
        await interaction.reply({
          content:
            '❌ That is not a valid image URL.',

          flags:
            MessageFlags.Ephemeral
        });

        return true;
      }


      config.welcomeEmbed.thumbnail =
        thumbnail
          ? {
              url: thumbnail
            }
          : null;
    }


    temporaryWelcomeConfigs.set(
      interaction.guildId,
      config
    );


    const saved =
      await saveWelcomeBuilderConfig(
        client,
        interaction.guildId,
        config
      );


    if (!saved) {
      await interaction.reply({
        content:
          '❌ Your change could not be saved. Check the bot console for the database error.',

        flags:
          MessageFlags.Ephemeral
      });

      return true;
    }


    await interaction.reply({
      content:
        '✅ Updated and saved successfully!',

      flags:
        MessageFlags.Ephemeral
    });


    return true;
  }


  return false;
}


export default {
  name: Events.InteractionCreate,

  async execute(interaction, client) {
    const interactionTraceContext =
      createInteractionTraceContext(
        interaction
      );

    interaction.traceContext =
      interactionTraceContext;

    interaction.traceId =
      interactionTraceContext.traceId;

    return runWithTraceContext(
      interactionTraceContext,
      async () => {
        try {
          InteractionHelper.patchInteractionResponses(
            interaction
          );

          ResponseCoordinator.attach(
            interaction
          );


          /* =================================================
             WELCOME BUILDER
          ================================================= */

          if (
            await handleWelcomeInteraction(
              interaction,
              client
            )
          ) {
            return;
          }


          /* =================================================
             SLASH COMMANDS
          ================================================= */

          if (
            interaction.isChatInputCommand()
          ) {
            try {
              logger.info(
                `Command executed: /${interaction.commandName} by ${interaction.user.tag}`,
                {
                  event:
                    'interaction.command.received',

                  traceId:
                    interactionTraceContext.traceId,

                  guildId:
                    interaction.guildId,

                  userId:
                    interaction.user?.id,

                  command:
                    interaction.commandName
                }
              );


              validateChatInputPayloadOrThrow(
                interaction,
                {
                  traceId:
                    interactionTraceContext.traceId,

                  guildId:
                    interaction.guildId,

                  userId:
                    interaction.user?.id,

                  command:
                    interaction.commandName
                }
              );


              const command =
                client.commands.get(
                  interaction.commandName
                );


              if (!command) {
                throw createError(
                  `No command matching ${interaction.commandName} was found.`,

                  ErrorTypes.CONFIGURATION,

                  'Sorry, that command does not exist.',

                  {
                    traceId:
                      interactionTraceContext.traceId,

                    guildId:
                      interaction.guildId,

                    userId:
                      interaction.user?.id,

                    command:
                      interaction.commandName
                  }
                );
              }


              if (
                isMaintenanceMode() &&
                !isBotOwner(
                  interaction.user.id
                )
              ) {
                throw createError(
                  'Bot is in maintenance mode',

                  ErrorTypes.CONFIGURATION,

                  getBotMessage(
                    'maintenanceMode'
                  ),

                  {
                    traceId:
                      interactionTraceContext.traceId,

                    guildId:
                      interaction.guildId,

                    userId:
                      interaction.user?.id,

                    command:
                      interaction.commandName
                  }
                );
              }


              if (
                !isCommandCategoryEnabled(
                  command.category
                )
              ) {
                throw createError(
                  `Feature disabled for category ${command.category}`,

                  ErrorTypes.CONFIGURATION,

                  getBotMessage(
                    'commandDisabled'
                  ),

                  {
                    traceId:
                      interactionTraceContext.traceId,

                    guildId:
                      interaction.guildId,

                    userId:
                      interaction.user?.id,

                    command:
                      interaction.commandName
                  }
                );
              }


              const defaultCooldownSec =
                Number(
                  botConfig.commands
                    ?.defaultCooldown
                ) || 0;


              if (
                defaultCooldownSec > 0 &&
                !isBotOwner(
                  interaction.user.id
                )
              ) {
                const cooldownKey =
                  `${interaction.user.id}:${interaction.commandName}`;

                const expiresAt =
                  client.cooldowns.get(
                    cooldownKey
                  );


                if (
                  expiresAt &&
                  Date.now() <
                    expiresAt
                ) {
                  const remainingSec =
                    Math.ceil(
                      (
                        expiresAt -
                        Date.now()
                      ) / 1000
                    );


                  throw createError(
                    `Default command cooldown active for ${interaction.commandName}`,

                    ErrorTypes.RATE_LIMIT,

                    getBotMessage(
                      'cooldownActive',
                      {
                        time:
                          `${remainingSec}s`
                      }
                    ),

                    {
                      traceId:
                        interactionTraceContext.traceId,

                      guildId:
                        interaction.guildId,

                      userId:
                        interaction.user?.id,

                      command:
                        interaction.commandName,

                      remainingSec
                    }
                  );
                }


                client.cooldowns.set(
                  cooldownKey,
                  Date.now() +
                    defaultCooldownSec *
                      1000
                );
              }


              const abuseProtection =
                await enforceAbuseProtection(
                  interaction,
                  command,
                  interaction.commandName
                );


              if (
                !abuseProtection.allowed
              ) {
                const formattedCooldown =
                  formatCooldownDuration(
                    abuseProtection.remainingMs
                  );


                throw createError(
                  `Risky command cooldown active for ${interaction.commandName}`,

                  ErrorTypes.RATE_LIMIT,

                  `This command is on cooldown. Please wait ${formattedCooldown} before trying again.`,

                  {
                    traceId:
                      interactionTraceContext.traceId,

                    guildId:
                      interaction.guildId,

                    userId:
                      interaction.user?.id,

                    command:
                      interaction.commandName,

                    subtype:
                      'command_cooldown',

                    expected:
                      true,

                    cooldownMs:
                      abuseProtection.remainingMs,

                    cooldownWindowMs:
                      abuseProtection.policy
                        ?.windowMs,

                    cooldownMaxAttempts:
                      abuseProtection.policy
                        ?.maxAttempts
                  }
                );
              }


              let guildConfig =
                null;


              if (
                interaction.guild
              ) {
                guildConfig =
                  await getGuildConfig(
                    client,
                    interaction.guild.id,
                    interactionTraceContext
                  );


                const accessKey =
                  resolveSlashAccessKey(
                    interaction
                  );


                if (
                  !(
                    await isCommandEnabled(
                      client,
                      interaction.guild.id,
                      accessKey,
                      command.category
                    )
                  )
                ) {
                  throw createError(
                    `Command ${accessKey} is disabled in this guild`,

                    ErrorTypes.CONFIGURATION,

                    'This command has been disabled for this server.',

                    {
                      traceId:
                        interactionTraceContext.traceId,

                      guildId:
                        interaction.guild.id,

                      userId:
                        interaction.user?.id,

                      command:
                        accessKey
                    }
                  );
                }
              }


              const permissionAllowed =
                await enforceDefaultCommandPermissions(
                  interaction,
                  command,
                  {
                    source:
                      'interactionCreate',

                    guildConfig
                  }
                );


              if (
                !permissionAllowed
              ) {
                return;
              }


              await command.execute(
                interaction,
                guildConfig,
                client
              );

            } catch (error) {
              await handleInteractionError(
                interaction,
                error,
                {
                  traceId:
                    interactionTraceContext.traceId,

                  guildId:
                    interaction.guildId,

                  userId:
                    interaction.user?.id,

                  command:
                    interaction.commandName,

                  type:
                    'command',

                  subtype:
                    COMMAND_ERROR_SUBTYPES[
                      interaction.commandName
                    ] ||
                    error?.context
                      ?.subtype
                }
              );
            }

            return;
          }


          /* =================================================
             AUTOCOMPLETE
          ================================================= */

          else if (
            interaction.isAutocomplete()
          ) {
            const autocompleteCommand =
              client.commands.get(
                interaction.commandName
              );


            if (
              autocompleteCommand?.autocomplete
            ) {
              try {
                await autocompleteCommand.autocomplete(
                  interaction,
                  client
                );
              } catch (error) {
                logger.error(
                  'Error handling command autocomplete:',
                  {
                    error:
                      error.message,

                    guildId:
                      interaction.guildId,

                    commandName:
                      interaction.commandName
                  }
                );


                await interaction
                  .respond([])
                  .catch(
                    () => {}
                  );
              }

              return;
            }


            const focusedOption =
              interaction.options.getFocused(
                true
              );


            if (
              interaction.commandName ===
                'apply' &&
              focusedOption.name ===
                'application'
            ) {
              try {
                const {
                  getApplicationRoles
                } =
                  await import(
                    '../utils/database.js'
                  );


                const roles =
                  await getApplicationRoles(
                    client,
                    interaction.guildId
                  );


                const roleName =
                  interaction.options.getString(
                    'application',
                    false
                  );


                const filtered =
                  roles.filter(
                    role =>
                      role.enabled !==
                        false &&
                      role.name
                        .toLowerCase()
                        .startsWith(
                          roleName
                            ?.toLowerCase() ||
                            ''
                        )
                  );


                await interaction.respond(
                  filtered
                    .slice(0, 25)
                    .map(
                      role => ({
                        name:
                          `${role.name}${role.enabled === false ? ' (disabled)' : ''}`,
                        value:
                          role.name
                      })
                    )
                );

              } catch (error) {
                logger.error(
                  'Error handling autocomplete:',
                  {
                    error:
                      error.message,

                    guildId:
                      interaction.guildId,

                    commandName:
                      interaction.commandName
                  }
                );


                await interaction
                  .respond([])
                  .catch(
                    () => {}
                  );
              }

            }


            else if (
              interaction.commandName ===
                'app-admin' &&
              focusedOption.name ===
                'application'
            ) {
              try {
                const {
                  getApplicationRoles
                } =
                  await import(
                    '../utils/database.js'
                  );


                const roles =
                  await getApplicationRoles(
                    client,
                    interaction.guildId
                  );


                const appName =
                  interaction.options.getString(
                    'application',
                    false
                  );


                const filtered =
                  roles.filter(
                    role =>
                      role.name
                        .toLowerCase()
                        .startsWith(
                          appName
                            ?.toLowerCase() ||
                            ''
                        )
                  );


                await interaction.respond(
                  filtered
                    .slice(0, 25)
                    .map(
                      role => ({
                        name:
                          `${role.name}${role.enabled === false ? ' (disabled)' : ''}`,
                        value:
                          role.name
                      })
                    )
                );

              } catch (error) {
                logger.error(
                  'Error handling app-admin autocomplete:',
                  {
                    error:
                      error.message,

                    guildId:
                      interaction.guildId,

                    commandName:
                      interaction.commandName
                  }
                );


                await interaction
                  .respond([])
                  .catch(
                    () => {}
                  );
              }
            }


            else if (
              interaction.commandName ===
                'reactroles' &&
              focusedOption.name ===
                'panel'
            ) {
              try {
                const {
                  getAllReactionRoleMessages,
                  deleteReactionRoleMessage
                } =
                  await import(
                    '../services/reactionRoleService.js'
                  );


                const guildId =
                  interaction.guildId;

                const guild =
                  interaction.guild;


                const panels =
                  await getAllReactionRoleMessages(
                    client,
                    guildId
                  );


                if (
                  !panels ||
                  panels.length === 0
                ) {
                  await interaction.respond(
                    []
                  );

                  return;
                }


                const validPanels =
                  [];


                for (
                  const panel of panels
                ) {
                  if (
                    !panel.messageId ||
                    !panel.channelId
                  ) {
                    continue;
                  }


                  const channel =
                    guild.channels.cache.get(
                      panel.channelId
                    );


                  if (!channel) {
                    await deleteReactionRoleMessage(
                      client,
                      guildId,
                      panel.messageId
                    ).catch(
                      () => {}
                    );

                    continue;
                  }


                  const msg =
                    await channel.messages
                      .fetch(
                        panel.messageId
                      )
                      .catch(
                        () => null
                      );


                  if (!msg) {
                    await deleteReactionRoleMessage(
                      client,
                      guildId,
                      panel.messageId
                    ).catch(
                      () => {}
                    );

                    continue;
                  }


                  validPanels.push(
                    panel
                  );
                }


                const choices =
                  await Promise.all(
                    validPanels
                      .slice(0, 25)
                      .map(
                        async panel => {
                          try {
                            const channel =
                              guild.channels.cache.get(
                                panel.channelId
                              );


                            if (!channel) {
                              return null;
                            }


                            const msg =
                              await channel.messages
                                .fetch(
                                  panel.messageId
                                )
                                .catch(
                                  () => null
                                );


                            if (!msg) {
                              return null;
                            }


                            const title =
                              msg?.embeds?.[0]
                                ?.title ??
                              'Untitled Panel';


                            return {
                              name:
                                `${title} (${channel.name})`
                                  .substring(
                                    0,
                                    100
                                  ),

                              value:
                                panel.messageId
                            };

                          } catch {
                            return null;
                          }
                        }
                      )
                  );


                await interaction.respond(
                  choices.filter(
                    Boolean
                  )
                );

              } catch (error) {
                logger.error(
                  'Error handling reactroles autocomplete:',
                  {
                    error:
                      error.message,

                    guildId:
                      interaction.guildId,

                    commandName:
                      interaction.commandName
                  }
                );


                await interaction
                  .respond([])
                  .catch(
                    () => {}
                  );
              }
            }
          }


          /* =================================================
             BUTTONS
          ================================================= */

          else if (
            interaction.isButton()
          ) {
            if (
              interaction.customId.startsWith(
                'shared_todo_'
              )
            ) {
              const parts =
                interaction.customId.split(
                  '_'
                );

              const buttonType =
                parts
                  .slice(0, 3)
                  .join('_');

              const listId =
                parts[3];

              const button =
                client.buttons.get(
                  buttonType
                );

              if (button) {
                try {
                  await button.execute(
                    interaction,
                    client,
                    [listId]
                  );
                } catch (error) {
                  await handleInteractionError(
                    interaction,
                    error,
                    {
                      traceId:
                        interactionTraceContext.traceId,
                      guildId:
                        interaction.guildId,
                      userId:
                        interaction.user?.id,
                      type:
                        'button',
                      customId:
                        interaction.customId,
                      handler:
                        'todo'
                    }
                  );
                }
              } else {
                throw createError(
                  `No button handler found for ${buttonType}`,
                  ErrorTypes.CONFIGURATION,
                  'This button is not available.',
                  {
                    traceId:
                      interactionTraceContext.traceId,
                    guildId:
                      interaction.guildId,
                    userId:
                      interaction.user?.id,
                    customId:
                      interaction.customId
                  }
                );
              }

              return;
            }


            const [
              customId,
              ...args
            ] =
              interaction.customId.split(
                ':'
              );


            const button =
              client.buttons.get(
                customId
              );


            if (!button) {
              if (
                !interaction.customId.includes(
                  ':'
                ) ||
                isCollectorManagedComponent(
                  customId
                )
              ) {
                return;
              }


              throw createError(
                `No button handler found for ${customId}`,
                ErrorTypes.CONFIGURATION,
                'This button is not available.',
                {
                  traceId:
                    interactionTraceContext.traceId,
                  guildId:
                    interaction.guildId,
                  userId:
                    interaction.user?.id,
                  customId:
                    interaction.customId
                }
              );
            }


            try {
              await button.execute(
                interaction,
                client,
                args
              );
            } catch (error) {
              await handleInteractionError(
                interaction,
                error,
                {
                  traceId:
                    interactionTraceContext.traceId,
                  guildId:
                    interaction.guildId,
                  userId:
                    interaction.user?.id,
                  type:
                    'button',
                  customId:
                    interaction.customId,
                  handler:
                    'general'
                }
              );
            }
          }


          /* =================================================
             STRING SELECT MENUS
          ================================================= */

          else if (
            interaction.isStringSelectMenu()
          ) {
            const [
              customId,
              ...args
            ] =
              interaction.customId.split(
                ':'
              );


            const selectMenu =
              client.selectMenus.get(
                customId
              );


            if (!selectMenu) {
              if (
                !interaction.customId.includes(
                  ':'
                ) ||
                isCollectorManagedComponent(
                  customId
                )
              ) {
                return;
              }


              throw createError(
                `No select menu handler found for ${customId}`,
                ErrorTypes.CONFIGURATION,
                'This select menu is not available.',
                {
                  traceId:
                    interactionTraceContext.traceId,
                  guildId:
                    interaction.guildId,
                  userId:
                    interaction.user?.id,
                  customId:
                    interaction.customId
                }
              );
            }


            try {
              await selectMenu.execute(
                interaction,
                client,
                args
              );
            } catch (error) {
              await handleInteractionError(
                interaction,
                error,
                {
                  traceId:
                    interactionTraceContext.traceId,
                  guildId:
                    interaction.guildId,
                  userId:
                    interaction.user?.id,
                  type:
                    'select_menu',
                  customId:
                    interaction.customId
                }
              );
            }
          }


          /* =================================================
             MODALS
          ================================================= */

          else if (
            interaction.isModalSubmit()
          ) {
            if (
              interaction.customId.startsWith(
                'app_modal_'
              )
            ) {
              try {
                await handleApplicationModal(
                  interaction
                );
              } catch (error) {
                await handleInteractionError(
                  interaction,
                  error,
                  {
                    traceId:
                      interactionTraceContext.traceId,
                    guildId:
                      interaction.guildId,
                    userId:
                      interaction.user?.id,
                    type:
                      'modal',
                    customId:
                      interaction.customId,
                    handler:
                      'application'
                  }
                );
              }

              return;
            }


            if (
              interaction.customId.startsWith(
                'app_review_'
              ) ||
              interaction.customId.startsWith(
                'jtc_'
              ) ||
              interaction.customId.startsWith(
                'config_wizard_modal:'
              ) ||
              interaction.customId.startsWith(
                'log_dash_channel_modal:'
              ) ||
              interaction.customId.startsWith(
                'log_dash_filter_modal:'
              )
            ) {
              logger.debug(
                `Skipping modal handler lookup for inline-awaited modal: ${interaction.customId}`,
                {
                  event:
                    'interaction.modal.inline_skipped',

                  traceId:
                    interactionTraceContext.traceId
                }
              );

              return;
            }


            const [
              customId,
              ...args
            ] =
              interaction.customId.split(
                ':'
              );


            const modal =
              client.modals.get(
                customId
              );


            if (!modal) {
              if (
                !interaction.customId.includes(
                  ':'
                )
              ) {
                return;
              }


              throw createError(
                `No modal handler found for ${customId}`,
                ErrorTypes.CONFIGURATION,
                'This form is not available.',
                {
                  traceId:
                    interactionTraceContext.traceId,
                  guildId:
                    interaction.guildId,
                  userId:
                    interaction.user?.id,
                  customId:
                    interaction.customId
                }
              );
            }


            try {
              await modal.execute(
                interaction,
                client,
                args
              );
            } catch (error) {
              await handleInteractionError(
                interaction,
                error,
                {
                  traceId:
                    interactionTraceContext.traceId,
                  guildId:
                    interaction.guildId,
                  userId:
                    interaction.user?.id,
                  type:
                    'modal',
                  customId:
                    interaction.customId,
                  handler:
                    'general'
                }
              );
            }
          }


        } catch (error) {
          logger.error(
            'Unhandled error in interactionCreate:',
            {
              event:
                'interaction.unhandled_error',

              errorCode:
                ErrorCodes.INTERACTION_UNHANDLED,

              error,

              traceId:
                interactionTraceContext.traceId,

              interactionId:
                interaction.id,

              guildId:
                interaction.guildId,

              userId:
                interaction.user?.id
            }
          );


          try {
            await handleInteractionError(
              interaction,
              error,
              {
                traceId:
                  interactionTraceContext.traceId,

                guildId:
                  interaction.guildId,

                userId:
                  interaction.user?.id,

                type:
                  'interaction',

                commandName:
                  interaction.commandName,

                customId:
                  interaction.customId,

                source:
                  'interactionCreate.unhandled'
              }
            );
          } catch (replyError) {
            logger.error(
              'Failed to send fallback error response:',
              {
                event:
                  'interaction.error_response_failed',

                errorCode:
                  ErrorCodes.INTERACTION_RESPONSE_FAILED,

                error:
                  replyError,

                traceId:
                  interactionTraceContext.traceId
              }
            );
          }
        }
      }
    );
  }
};
