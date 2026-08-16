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
  isMaintenanceMode,
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
  greroll: 'giveaway_failed',
};


function withTraceContext(context = {}, traceContext = {}) {
  return {
    traceId: traceContext.traceId,
    guildId: context.guildId || traceContext.guildId,
    userId: context.userId || traceContext.userId,
    command: context.commandName || traceContext.command,
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
    });
  }

  return welcomeConfigs.get(guildId);
}


function replaceWelcomeVariables(text, interaction) {
  if (!text) {
    return '';
  }

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


function validUrl(value) {
  if (!value) {
    return false;
  }

  try {
    const url = new URL(value);

    return (
      url.protocol === 'http:' ||
      url.protocol === 'https:'
    );
  } catch {
    return false;
  }
}


function getWelcomeColor(value) {
  if (
    typeof value === 'string' &&
    /^#[0-9A-Fa-f]{6}$/.test(
      value.trim()
    )
  ) {
    return parseInt(
      value.trim().slice(1),
      16
    );
  }

  return 0x191717;
}


function createWelcomeEmbed(interaction) {
  const config =
    getWelcomeConfig(
      interaction.guildId
    );

  const embed =
    new EmbedBuilder();

  /*
   * IMPORTANT:
   * Discord.js requires a number for EmbedBuilder#setColor.
   * This prevents the "Invalid number value" error.
   */

  embed.setColor(
    getWelcomeColor(
      config.color
    )
  );


  if (
    config.title &&
    config.title.trim()
  ) {
    embed.setTitle(
      replaceWelcomeVariables(
        config.title,
        interaction
      ).slice(0, 256)
    );
  }


  if (
    config.description &&
    config.description.trim()
  ) {
    embed.setDescription(
      replaceWelcomeVariables(
        config.description,
        interaction
      ).slice(0, 4096)
    );
  }


  if (
    config.authorEnabled &&
    config.authorName &&
    config.authorName.trim()
  ) {
    const author = {
      name:
        replaceWelcomeVariables(
          config.authorName,
          interaction
        ).slice(0, 256)
    };

    if (
      validUrl(
        config.authorIcon
      )
    ) {
      author.iconURL =
        config.authorIcon.trim();
    }

    embed.setAuthor(
      author
    );
  }


  if (
    validUrl(
      config.thumbnail
    )
  ) {
    embed.setThumbnail(
      config.thumbnail.trim()
    );
  }


  if (
    validUrl(
      config.image
    )
  ) {
    embed.setImage(
      config.image.trim()
    );
  }


  if (
    config.footerEnabled &&
    config.footerText &&
    config.footerText.trim()
  ) {
    const footer = {
      text:
        replaceWelcomeVariables(
          config.footerText,
          interaction
        ).slice(0, 2048)
    };

    if (
      validUrl(
        config.footerIcon
      )
    ) {
      footer.iconURL =
        config.footerIcon.trim();
    }

    embed.setFooter(
      footer
    );
  }


  if (
    config.timestamp
  ) {
    embed.setTimestamp();
  }


  return embed;
}


function createWelcomeDashboard(interaction) {
  const config =
    getWelcomeConfig(
      interaction.guildId
    );

  const embed =
    new EmbedBuilder()
      .setColor(
        getWelcomeColor(
          config.color
        )
      )
      .setTitle(
        '🛠️ Welcome Embed Builder'
      )
      .setDescription(
        'Build your welcome message using the options below.'
      )
      .addFields(
        {
          name: '📝 Title',
          value:
            config.title ||
            'Not set',
          inline: false
        },
        {
          name: '📄 Description',
          value:
            config.description ||
            'Not set',
          inline: false
        },
        {
          name: '🎨 Color',
          value:
            `\`${config.color}\``,
          inline: true
        },
        {
          name: '📢 Channel',
          value:
            config.channelId
              ? `<#${config.channelId}>`
              : 'Not selected',
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
        '✏️ Choose what you want to edit'
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
            'Set the embed image',
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
      );


  const menuRow =
    new ActionRowBuilder()
      .addComponents(
        channelMenu
      );


  const editRow =
    new ActionRowBuilder()
      .addComponents(
        editMenu
      );


  const buttons =
    new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(
            'welcome_preview'
          )
          .setLabel(
            'Preview'
          )
          .setEmoji(
            '👀'
          )
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
          .setEmoji(
            '💾'
          )
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
          .setEmoji(
            '🔄'
          )
          .setStyle(
            ButtonStyle.Danger
          )
      );


  return {
    embeds: [
      embed
    ],
    components: [
      menuRow,
      editRow,
      buttons
    ]
  };
}


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
      .setCustomId(
        'value'
      )
      .setLabel(
        label
      )
      .setStyle(
        style
      )
      .setRequired(
        false
      )
      .setMaxLength(
        maxLength
      );

  if (
    value !== undefined &&
    value !== null
  ) {
    input.setValue(
      String(value).slice(
        0,
        maxLength
      )
    );
  }

  return new ModalBuilder()
    .setCustomId(
      customId
    )
    .setTitle(
      title
    )
    .addComponents(
      new ActionRowBuilder()
        .addComponents(
          input
        )
    );
}


async function handleWelcomeInteraction(
  interaction
) {
  if (
    !interaction.guildId
  ) {
    return false;
  }


  /* =========================
     /welcome
  ========================= */

  if (
    interaction.isChatInputCommand() &&
    interaction.commandName ===
      'welcome'
  ) {
    await interaction.reply({
      ...createWelcomeDashboard(
        interaction
      ),
      flags:
        MessageFlags.Ephemeral
    });

    return true;
  }


  /* =========================
     CHANNEL SELECT
  ========================= */

  if (
    interaction.isChannelSelectMenu() &&
    interaction.customId ===
      'welcome_channel'
  ) {
    const config =
      getWelcomeConfig(
        interaction.guildId
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


  /* =========================
     EDIT MENU
  ========================= */

  if (
    interaction.isStringSelectMenu() &&
    interaction.customId ===
      'welcome_edit'
  ) {
    const config =
      getWelcomeConfig(
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
          config.title,
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
          config.description,
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
          config.color,
          'Hex Color',
          TextInputStyle.Short,
          7
        )
      );

      return true;
    }


    if (
      selected === 'author'
    ) {
      await interaction.showModal(
        createWelcomeModal(
          'welcome_modal_author',
          'Edit Author',
          config.authorName,
          'Author Name',
          TextInputStyle.Short,
          256
        )
      );

      return true;
    }


    if (
      selected === 'thumbnail'
    ) {
      await interaction.showModal(
        createWelcomeModal(
          'welcome_modal_thumbnail',
          'Edit Thumbnail',
          config.thumbnail,
          'Image URL',
          TextInputStyle.Short,
          1000
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
          'Edit Image',
          config.image,
          'Image URL',
          TextInputStyle.Short,
          1000
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
          'Edit Footer',
          config.footerText,
          'Footer Text',
          TextInputStyle.Short,
          2048
        )
      );

      return true;
    }
  }


  /* =========================
     BUTTONS
  ========================= */

  if (
    interaction.isButton() &&
    interaction.customId.startsWith(
      'welcome_'
    )
  ) {
    const config =
      getWelcomeConfig(
        interaction.guildId
      );


    if (
      interaction.customId ===
        'welcome_preview'
    ) {
      await interaction.reply({
        content:
          '👀 **Welcome Message Preview**',
        embeds: [
          createWelcomeEmbed(
            interaction
          )
        ],
        flags:
          MessageFlags.Ephemeral
      });

      return true;
    }


    if (
      interaction.customId ===
        'welcome_save'
    ) {
      await interaction.reply({
        content:
          '💾 **Welcome embed saved!**',
        flags:
          MessageFlags.Ephemeral
      });

      return true;
    }


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


    if (
      interaction.customId ===
        'welcome_reset'
    ) {
      welcomeConfigs.delete(
        interaction.guildId
      );

      await interaction.update(
        createWelcomeDashboard(
          interaction
        )
      );

      return true;
    }
  }


  /* =========================
     MODALS
  ========================= */

  if (
    interaction.isModalSubmit() &&
    interaction.customId.startsWith(
      'welcome_modal_'
    )
  ) {
    const config =
      getWelcomeConfig(
        interaction.guildId
      );

    let value;

    try {
      value =
        interaction.fields.getTextInputValue(
          'value'
        );
    } catch {
      value = '';
    }


    if (
      interaction.customId ===
        'welcome_modal_title'
    ) {
      config.title =
        value.trim();
    }


    else if (
      interaction.customId ===
        'welcome_modal_description'
    ) {
      config.description =
        value;
    }


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
            '❌ Invalid color. Use a format like `#191717`.',
          flags:
            MessageFlags.Ephemeral
        });

        return true;
      }

      config.color =
        color;
    }


    else if (
      interaction.customId ===
        'welcome_modal_author'
    ) {
      config.authorName =
        value.trim();

      config.authorEnabled =
        Boolean(
          config.authorName
        );
    }


    else if (
      interaction.customId ===
        'welcome_modal_thumbnail'
    ) {
      if (
        value.trim() &&
        !validUrl(
          value.trim()
        )
      ) {
        await interaction.reply({
          content:
            '❌ Invalid image URL.',
          flags:
            MessageFlags.Ephemeral
        });

        return true;
      }

      config.thumbnail =
        value.trim();
    }


    else if (
      interaction.customId ===
        'welcome_modal_image'
    ) {
      if (
        value.trim() &&
        !validUrl(
          value.trim()
        )
      ) {
        await interaction.reply({
          content:
            '❌ Invalid image URL.',
          flags:
            MessageFlags.Ephemeral
        });

        return true;
      }

      config.image =
        value.trim();
    }


    else if (
      interaction.customId ===
        'welcome_modal_footer'
    ) {
      config.footerText =
        value.trim();

      config.footerEnabled =
        Boolean(
          config.footerText
        );
    }


    await interaction.reply({
      content:
        '✅ Updated successfully.',
      flags:
        MessageFlags.Ephemeral
    });

    return true;
  }


  return false;
}


/* =========================================================
   MAIN INTERACTION CREATE
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


          /* =================================================
             WELCOME BUILDER
          ================================================= */

          if (
            await handleWelcomeInteraction(
              interaction
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
                        abuseProtection.policy
                          ?.windowMs,
                      cooldownMaxAttempts:
                        abuseProtection.policy
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


                let panels =
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
                    c => c !== null
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
