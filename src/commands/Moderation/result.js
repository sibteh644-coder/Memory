import { SlashCommandBuilder } from 'discord.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

const STAGE_ROLES = [
  'Stage 1 - High',
  'Stage 1 - Mid',
  'Stage 1 - Low',
  'Stage 2 - High',
  'Stage 2 - Mid',
  'Stage 2 - Low'
];

const TIER_ROLES = [
  'Weak',
  'Stable',
  'Strong'
];

export default {
  data: new SlashCommandBuilder()
    .setName('result')
    .setDescription('Rank a user with a stage and tier')
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('The user to rank')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('stage')
        .setDescription('The stage role')
        .setRequired(true)
        .addChoices(
          { name: 'Stage 1 - High', value: 'Stage 1 - High' },
          { name: 'Stage 1 - Mid', value: 'Stage 1 - Mid' },
          { name: 'Stage 1 - Low', value: 'Stage 1 - Low' },
          { name: 'Stage 2 - High', value: 'Stage 2 - High' },
          { name: 'Stage 2 - Mid', value: 'Stage 2 - Mid' },
          { name: 'Stage 2 - Low', value: 'Stage 2 - Low' }
        )
    )
    .addStringOption((option) =>
      option
        .setName('tier')
        .setDescription('The tier role')
        .setRequired(true)
        .addChoices(
          { name: 'Weak', value: 'Weak' },
          { name: 'Stable', value: 'Stable' },
          { name: 'Strong', value: 'Strong' }
        )
    )
    .setDMPermission(false),

  category: 'Core',

  async execute(interaction, config, client) {
    await InteractionHelper.safeDefer(interaction);

    const targetUser = interaction.options.getUser('user');
    const stageName = interaction.options.getString('stage');
    const tierName = interaction.options.getString('tier');

    const member = await interaction.guild.members
      .fetch(targetUser.id)
      .catch(() => null);

    if (!member) {
      await InteractionHelper.safeEditReply(interaction, {
        content: 'User could not be found in this server.'
      });
      return;
    }

    const stageRole = interaction.guild.roles.cache.find(
      role => role.name.toLowerCase() === stageName.toLowerCase()
    );

    const tierRole = interaction.guild.roles.cache.find(
      role => role.name.toLowerCase() === tierName.toLowerCase()
    );

    if (!stageRole) {
      await InteractionHelper.safeEditReply(interaction, {
        content: `The role **${stageName}** does not exist.`
      });
      return;
    }

    if (!tierRole) {
      await InteractionHelper.safeEditReply(interaction, {
        content: `The role **${tierName}** does not exist.`
      });
      return;
    }

    try {
      // Remove any existing Stage role
      for (const roleName of STAGE_ROLES) {
        const oldRole = interaction.guild.roles.cache.find(
          role => role.name.toLowerCase() === roleName.toLowerCase()
        );

        if (oldRole && member.roles.cache.has(oldRole.id)) {
          await member.roles.remove(oldRole);
        }
      }

      // Remove any existing Tier role
      for (const roleName of TIER_ROLES) {
        const oldRole = interaction.guild.roles.cache.find(
          role => role.name.toLowerCase() === roleName.toLowerCase()
        );

        if (oldRole && member.roles.cache.has(oldRole.id)) {
          await member.roles.remove(oldRole);
        }
      }

      // Give the selected Stage + Tier
      await member.roles.add(stageRole);
      await member.roles.add(tierRole);

      // Result message
      await InteractionHelper.safeEditReply(interaction, {
        content: `${member} has been ranked to **${stageRole.name} ${tierRole.name}**.`
      });

      logger.info(
        `Result command: ${targetUser.id} was given ${stageRole.name} ${tierRole.name} by ${interaction.user.id}`
      );

    } catch (error) {
      logger.error('Result command failed', error);

      await InteractionHelper.safeEditReply(interaction, {
        content: 'I could not give those roles to the user.'
      });
    }
  }
};
