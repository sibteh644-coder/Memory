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

import { handleApplicationModal } from '../commands/Community/apply.js';

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


function withTraceContext(
  context = {},
  traceContext = {}
) {
  return {
    traceId: traceContext.traceId,
    guildId:
      context.guildId ||
      traceContext.guildId,
    userId:
      context.userId ||
      traceContext.userId,
    command:
      context.commandName ||
      traceContext.command,
    ...context
  };
}


/* =========================================================
   WELCOME BUILDER
========================================================= */

const welcomeConfigs = new Map();


function getWelcomeConfig(guildId) {
  if (!welcomeConfigs.has(guildId)) {
    welcomeConfigs.set(guildId, {
      enabled: false,
      channelId: null,

      title: 'Welcome {user}!',

      description:
        'Hope you enjoy your stay in **{server}**!\n' +
        'Please chat in <#CHANNEL_ID>.',

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
    });
  }

  return welcomeConfigs.get(guildId);
}


function replaceWelcomeVariables(
  text,
  interaction
) {
  if (!text) return '';

  const user = interaction.user;
  const guild = interaction.guild;

  let result = String(text);

  result = result.replaceAll(
    '{user}',
    user?.toString() || 'User'
  );

  result = result.replaceAll(
    '{user.mention}',
    user?.toString() || 'User'
  );

  result = result.replaceAll(
    '{user.username}',
    user?.username || 'User'
  );

  result = result.replaceAll(
    '{username}',
    user?.username || 'User'
  );

  result = result.replaceAll(
    '{user.id}',
    user?.id || ''
  );

  result = result.replaceAll(
    '{server}',
    guild?.name || 'Server'
  );

  result = result.replaceAll(
    '{server.name}',
    guild?.name || 'Server'
  );

  result = result.replaceAll(
    '{guild.name}',
    guild?.name || 'Server'
  );

  result = result.replaceAll(
    '{memberCount}',
    String(guild?.memberCount || 0)
  );

  result = result.replaceAll(
    '{count}',
    String(guild?.memberCount || 0)
  );

  return result;
}


function createWelcomeEmbed(
  interaction
) {
  const config = getWelcomeConfig(
    interaction.guild.id
  );

  const embed = new EmbedBuilder()
    .setColor(config.color || '#191717');

  if (config.title) {
    embed.setTitle(
      replaceWelcomeVariables(
        config.title,
        interaction
      )
    );
  }

  if (config.description) {
    embed.setDescription(
      replaceWelcomeVariables(
        config.description,
        interaction
      )
    );
  }

  if (
    config.authorEnabled &&
    config.authorName
  ) {
    const author = {
      name: replaceWelcomeVariables(
        config.authorName,
        interaction
      )
    };

    if (config.authorIcon) {
      author.iconURL = config.authorIcon;
    }

    embed.setAuthor(author);
  }

  if (config.thumbnail) {
    embed.setThumbnail(
      config.thumbnail
    );
  }

  if (config.image) {
    embed.setImage(config.image);
  }

  if (
    config.footerEnabled &&
    config.footerText
  ) {
    const footer = {
      text: replaceWelcomeVariables(
        config.footerText,
        interaction
      )
    };

    if (config.footerIcon) {
      footer.iconURL = config.footerIcon;
    }

    embed.setFooter(footer);
  }

  if (config.timestamp) {
    embed.setTimestamp();
  }

  return embed;
}


function createWelcomeDashboard(
  interaction
) {
  const config = getWelcomeConfig(
    interaction.guild.id
  );

  const channel = config.channelId
    ? interaction.guild.channels.cache.get(
        config.channelId
      )
    : null;

  const dashboardEmbed =
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
          value: `\`${config.color}\``,
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
              ? config.authorName ||
                'Enabled'
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
              ? config.footerText ||
                'Enabled'
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

  const row1 =
    new ActionRowBuilder().addComponents(
      channelMenu
    );

  const row2 =
    new ActionRowBuilder().addComponents(
      editMenu
    );

  const row3 =
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

  const row4 =
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
    embeds: [dashboardEmbed],
    components: [
      row1,
      row2,
      row3,
      row4
    ]
  };
}


function createWelcomeModal(
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
      new ActionRowBuilder().addComponents(
        input
      )
    );
  }

  return modal;
}


/* =========================================================
   WELCOME INTERACTION HANDLER
========================================================= */

async function handleWelcomeInteraction(
  interaction
) {
  if (!interaction.guild) {
    return false;
  }

  /* /welcome */

  if (
    interaction.isChatInputCommand() &&
    interaction.commandName ===
      'welcome'
  ) {
    try {
      await interaction.reply({
        ...createWelcomeDashboard(
          interaction
        ),
        flags:
          MessageFlags.Ephemeral
      });
    } catch (error) {
      logger.error(
        '[WELCOME] Dashboard error:',
        {
          error: error.message,
          stack: error.stack
        }
      );

      if (
        !interaction.replied &&
        !interaction.deferred
      ) {
        await interaction.reply({
          content:
            `❌ Welcome builder error: \`${error.message}\``,
          flags:
            MessageFlags.Ephemeral
        }).catch(() => {});
      }
    }

    return true;
  }


  /* Channel selector */

  if (
    interaction.isChannelSelectMenu() &&
    interaction.customId ===
      'welcome_channel'
  ) {
    const config =
      getWelcomeConfig(
        interaction.guild.id
      );

    config.channelId =
      interaction.values[0];

    await interaction.update(
      createWelcomeDashboard(
        interaction
      )
    );

    return true;
  }


  /* Edit selector */

  if (
    interaction.isStringSelectMenu() &&
    interaction.customId ===
      'welcome_edit'
  ) {
    const config =
      getWelcomeConfig(
        interaction.guild.id
      );

    const value =
      interaction.values[0];

    if (value === 'title') {
      await interaction.showModal(
        createWelcomeModal(
          'welcome_modal_title',
          'Edit Title',
          [
            {
              id: 'value',
              label: 'Title',
              value:
                config.title,
              maxLength: 256
            }
          ]
        )
      );

      return true;
    }

    if (
      value ===
      'description'
    ) {
      await interaction.showModal(
        createWelcomeModal(
          'welcome_modal_description',
          'Edit Description',
          [
            {
              id: 'value',
              label:
                'Description',
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

    if (value === 'color') {
      await interaction.showModal(
        createWelcomeModal(
          'welcome_modal_color',
          'Edit Color',
          [
            {
              id: 'value',
              label:
                'Hex Color',
              value:
                config.color,
              maxLength: 7
            }
          ]
        )
      );

      return true;
    }

    if (value === 'author') {
      await interaction.showModal(
        createWelcomeModal(
          'welcome_modal_author',
          'Edit Author',
          [
            {
              id: 'name',
              label:
                'Author Name',
              value:
                config.authorName,
              maxLength: 256
            },
            {
              id: 'icon',
              label:
                'Icon URL',
              value:
                config.authorIcon,
              maxLength: 1000
            }
          ]
        )
      );

      return true;
    }

    if (
      value ===
      'thumbnail'
    ) {
      await interaction.showModal(
        createWelcomeModal(
          'welcome_modal_thumbnail',
          'Edit Thumbnail',
          [
            {
              id: 'value',
              label:
                'Image URL',
              value:
                config.thumbnail,
              maxLength: 1000
            }
          ]
        )
      );

      return true;
    }

    if (value === 'image') {
      await interaction.showModal(
        createWelcomeModal(
          'welcome_modal_image',
          'Edit Image',
          [
            {
              id: 'value',
              label:
                'Image URL',
              value:
                config.image,
              maxLength: 1000
            }
          ]
        )
      );

      return true;
    }

    if (value === 'footer') {
      await interaction.showModal(
        createWelcomeModal(
          'welcome_modal_footer',
          'Edit Footer',
          [
            {
              id: 'text',
              label:
                'Footer Text',
              value:
                config.footerText,
              maxLength: 2048
            },
            {
              id: 'icon',
              label:
                'Icon URL',
              value:
                config.footerIcon,
              maxLength: 1000
            }
          ]
        )
      );

      return true;
    }

    return true;
  }


  /* Welcome buttons */

  if (
    interaction.isButton() &&
    interaction.customId.startsWith(
      'welcome_'
    )
  ) {
    const config =
      getWelcomeConfig(
        interaction.guild.id
      );


    /* PREVIEW */

    if (
      interaction.customId ===
      'welcome_preview'
    ) {
      try {
        const previewEmbed =
          createWelcomeEmbed(
            interaction
          );

        await interaction.deferReply(
          {
            flags:
              MessageFlags.Ephemeral
          }
        );

        await interaction.editReply({
          content:
            '👀 **Welcome Embed Preview**',
          embeds: [previewEmbed]
        });
      } catch (error) {
        logger.error(
          '[WELCOME] Preview error:',
          {
            error:
              error.message,
            stack:
              error.stack
          }
        );

        const errorMessage =
          `❌ Preview failed: \`${error.message}\``;

        if (
          interaction.deferred ||
          interaction.replied
        ) {
          await interaction.editReply({
            content:
              errorMessage,
            embeds: []
          }).catch(() => {});
        } else {
          await interaction.reply({
            content:
              errorMessage,
            flags:
              MessageFlags.Ephemeral
          }).catch(() => {});
        }
      }

      return true;
    }


    /* TIMESTAMP */

    if (
      interaction.customId ===
      'welcome_timestamp'
    ) {
      config.timestamp =
        !config.timestamp;

      await interaction.update(
        createWelcomeDashboard(
          interaction
        )
      );

      return true;
    }


    /* AUTHOR */

    if (
      interaction.customId ===
      'welcome_author'
    ) {
      config.authorEnabled =
        !config.authorEnabled;

      await interaction.update(
        createWelcomeDashboard(
          interaction
        )
      );

      return true;
    }


    /* FOOTER */

    if (
      interaction.customId ===
      'welcome_footer'
    ) {
      config.footerEnabled =
        !config.footerEnabled;

      await interaction.update(
        createWelcomeDashboard(
          interaction
        )
      );

      return true;
    }


    /* ENABLE */

    if (
      interaction.customId ===
      'welcome_enable'
    ) {
      config.enabled =
        !config.enabled;

      await interaction.update(
        createWelcomeDashboard(
          interaction
        )
      );

      return true;
    }


    /* RESET */

    if (
      interaction.customId ===
      'welcome_reset'
    ) {
      welcomeConfigs.delete(
        interaction.guild.id
      );

      await interaction.update(
        createWelcomeDashboard(
          interaction
        )
      );

      return true;
    }

    return true;
  }


  /* Welcome modals */

  if (
    interaction.isModalSubmit() &&
    interaction.customId.startsWith(
      'welcome_modal_'
    )
  ) {
    const config =
      getWelcomeConfig(
        interaction.guild.id
      );


    if (
      interaction.customId ===
      'welcome_modal_title'
    ) {
      config.title =
        interaction.fields.getTextInputValue(
          'value'
        );

      await interaction.reply({
        content:
          '✅ Title updated.',
        flags:
          MessageFlags.Ephemeral
      });

      return true;
    }


    if (
      interaction.customId ===
      'welcome_modal_description'
    ) {
      config.description =
        interaction.fields.getTextInputValue(
          'value'
        );

      await interaction.reply({
        content:
          '✅ Description updated.',
        flags:
          MessageFlags.Ephemeral
      });

      return true;
    }


    if (
      interaction.customId ===
      'welcome_modal_color'
    ) {
      const color =
        interaction.fields
          .getTextInputValue(
            'value'
          )
          .trim();

      if (
        !/^#[0-9A-Fa-f]{6}$/.test(
          color
        )
      ) {
        await interaction.reply({
          content:
            '❌ Invalid color. Use a 6-digit hex color, for example `#191717`.',
          flags:
            MessageFlags.Ephemeral
        });

        return true;
      }

      config.color = color;

      await interaction.reply({
        content:
          `✅ Color changed to \`${color}\`.`,
        flags:
          MessageFlags.Ephemeral
      });

      return true;
    }


    if (
      interaction.customId ===
      'welcome_modal_author'
    ) {
      config.authorName =
        interaction.fields.getTextInputValue(
          'name'
        );

      config.authorIcon =
        interaction.fields.getTextInputValue(
          'icon'
        );

      await interaction.reply({
        content:
          '✅ Author updated.',
        flags:
          MessageFlags.Ephemeral
      });

      return true;
    }


    if (
      interaction.customId ===
      'welcome_modal_thumbnail'
    ) {
      config.thumbnail =
        interaction.fields.getTextInputValue(
          'value'
        );

      await interaction.reply({
        content:
          '✅ Thumbnail updated.',
        flags:
          MessageFlags.Ephemeral
      });

      return true;
    }


    if (
      interaction.customId ===
      'welcome_modal_image'
    ) {
      config.image =
        interaction.fields.getTextInputValue(
          'value'
        );

      await interaction.reply({
        content:
          '✅ Image updated.',
        flags:
          MessageFlags.Ephemeral
      });

      return true;
    }


    if (
      interaction.customId ===
      'welcome_modal_footer'
    ) {
      config.footerText =
        interaction.fields.getTextInputValue(
          'text'
        );

      config.footerIcon =
        interaction.fields.getTextInputValue(
          'icon'
        );

      await interaction.reply({
        content:
          '✅ Footer updated.',
        flags:
          MessageFlags.Ephemeral
      });

      return true;
    }

    return true;
  }

  return false;
}


/* =========================================================
   MAIN INTERACTION HANDLER
========================================================= */

export default {
  name: Events.InteractionCreate,

  async execute(
    interaction,
    client
  ) {
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


          /* =========================================
             WELCOME BUILDER
          ========================================= */

          const welcomeHandled =
            await handleWelcomeInteraction(
              interaction
            );

          if (welcomeHandled) {
            return;
          }


          /* =========================================
             SLASH COMMANDS
          ========================================= */

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
                withTraceContext(
                  {
                    type:
                      'command_input_validation',
                    commandName:
                      interaction.commandName
                  },
                  interactionTraceContext
                )
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
                  withTraceContext(
                    {
                      commandName:
                        interaction.commandName
                    },
                    interactionTraceContext
                  )
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
                  withTraceContext(
                    {
                      commandName:
                        interaction.commandName
                    },
                    interactionTraceContext
                  )
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
                  withTraceContext(
                    {
                      commandName:
                        interaction.commandName,
                      category:
                        command.category
                    },
                    interactionTraceContext
                  )
                );
              }

              const defaultCooldownSec =
                Number(
                  botConfig.commands
                    ?.defaultCooldown
                ) || 0;

              if (
                defaultCooldownSec >
                  0 &&
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
                      (expiresAt -
                        Date.now()) /
                        1000
                    );

                  throw createError(
                    `Default command cooldown active for ${interaction.commandName}`,
                    ErrorTypes.RATE_LIMIT,
                    getBotMessage(
                      'cooldownActive',
                      {
                        time: `${remainingSec}s`
                      }
                    ),
                    withTraceContext(
                      {
                        commandName:
                          interaction.commandName,
                        remainingSec
                      },
                      interactionTraceContext
                    )
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
                  withTraceContext(
                    {
                      commandName:
                        interaction.commandName,
                      subtype:
                        'command_cooldown',
                      expected:
                        true,
                      cooldownMs:
                        abuseProtection.remainingMs,
                      cooldownWindowMs:
                        abuseProtection
                          .policy
                          ?.windowMs,
                      cooldownMaxAttempts:
                        abuseProtection
                          .policy
                          ?.maxAttempts
                    },
                    interactionTraceContext
                  )
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
                    withTraceContext(
                      {
                        commandName:
                          accessKey,
                        guildId:
                          interaction.guild.id
                      },
                      interactionTraceContext
                    )
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
                withTraceContext(
                  {
                    type:
                      'command',
                    commandName:
                      interaction.commandName,
                    subtype:
                      COMMAND_ERROR_SUBTYPES[
                        interaction.commandName
                      ] ||
                      error?.context
                        ?.subtype
                  },
                  interactionTraceContext
                )
              );
            }
          }


          /* =========================================
             AUTOCOMPLETE
          ========================================= */

          else if (
            interaction.isAutocomplete()
          ) {
            const autocompleteCommand =
              client.commands.get(
                interaction.commandName
              );

            if (
              autocompleteCommand
                ?.autocomplete
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
                } = await import(
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
                          `${role.name}${
                            role.enabled ===
                            false
                              ? ' (disabled)'
                              : ''
                          }`,
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

            } else if (
              interaction.commandName ===
                'app-admin' &&
              focusedOption.name ===
                'application'
            ) {
              try {
                const {
                  getApplicationRoles
                } = await import(
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
                          `${role.name}${
                            role.enabled ===
                            false
                              ? ' (disabled)'
                              : ''
                          }`,
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

            } else if (
              interaction.commandName ===
                'reactroles' &&
              focusedOption.name ===
                'panel'
            ) {
              try {
                const {
                  getAllReactionRoleMessages,
                  deleteReactionRoleMessage
                } = await import(
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
                  panels.length ===
                    0
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

                if (
                  validPanels.length ===
                  0
                ) {
                  await interaction.respond(
                    []
                  );

                  return;
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

                            if (
                              !channel
                            ) {
                              return null;
                            }

                            const msg =
                              await channel.messages
                                .fetch(
                                  panel.messageId
                                )
                                .catch(
                                  () =>
                                    null
                                );

                            if (!msg) {
                              return null;
                            }

                            const title =
                              msg
                                ?.embeds?.[0]
                                ?.title ??
                              'Untitled Panel';

                            const channelName =
                              channel?.name ??
                              'unknown';

                            return {
                              name:
                                `${title} (${channelName})`.substring(
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

                const validChoices =
                  choices.filter(
                    choice =>
                      choice !==
                      null
                  );

                await interaction.respond(
                  validChoices
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


          /* =========================================
             BUTTONS
          ========================================= */

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
                    withTraceContext(
                      {
                        type:
                          'button',
                        customId:
                          interaction.customId,
                        handler:
                          'todo'
                      },
                      interactionTraceContext
                    )
                  );
                }
              } else {
                throw createError(
                  `No button handler found for ${buttonType}`,
                  ErrorTypes.CONFIGURATION,
                  'This button is not available.',
                  withTraceContext(
                    {
                      buttonType
                    },
                    interactionTraceContext
                  )
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
                withTraceContext(
                  {
                    customId
                  },
                  interactionTraceContext
                )
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
                withTraceContext(
                  {
                    type:
                      'button',
                    customId:
                      interaction.customId,
                    handler:
                      'general'
                  },
                  interactionTraceContext
                )
              );
            }
          }


          /* =========================================
             SELECT MENUS
          ========================================= */

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
                withTraceContext(
                  {
                    customId
                  },
                  interactionTraceContext
                )
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
                withTraceContext(
                  {
                    type:
                      'select_menu',
                    customId:
                      interaction.customId
                  },
                  interactionTraceContext
                )
              );
            }
          }


          /* =========================================
             MODALS
          ========================================= */

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
                  withTraceContext(
                    {
                      type:
                        'modal',
                      customId:
                        interaction.customId,
                      handler:
                        'application'
                    },
                    interactionTraceContext
                  )
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
                withTraceContext(
                  {
                    customId
                  },
                  interactionTraceContext
                )
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
                withTraceContext(
                  {
                    type:
                      'modal',
                    customId:
                      interaction.customId,
                    handler:
                      'general'
                  },
                  interactionTraceContext
                )
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
              withTraceContext(
                {
                  type:
                    'interaction',
                  commandName:
                    interaction.commandName,
                  customId:
                    interaction.customId,
                  source:
                    'interactionCreate.unhandled'
                },
                interactionTraceContext
              )
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
