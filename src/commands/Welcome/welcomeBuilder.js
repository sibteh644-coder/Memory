import {
    SlashCommandBuilder,
    PermissionFlagsBits
} from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('welcome')
        .setDescription('Open the welcome builder')
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageGuild
        ),

    async execute(interaction) {
        try {
            await interaction.reply({
                content: '✅ `/welcome` is working!',
                ephemeral: true
            });
        } catch (error) {
            console.error('Welcome command error:', error);
        }
    }
};
