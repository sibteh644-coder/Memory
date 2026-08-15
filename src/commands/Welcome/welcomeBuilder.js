import {
    SlashCommandBuilder,
    PermissionFlagsBits
} from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('welcome')
        .setDescription('Open the welcome embed builder')
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageGuild
        ),

    async execute(interaction) {
        // The command is handled directly in interactionCreate.js.
        // This is only here so the command is registered correctly.
        await interaction.reply({
            content: 'Please wait...',
            flags: 64
        });
    }
};
