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
        console.log('[WELCOME] execute() reached');

        try {
            await interaction.reply({
                content: '✅ Welcome command is working!',
                flags: 64
            });

            console.log('[WELCOME] reply sent');
        } catch (error) {
            console.error(
                '[WELCOME] EXECUTE ERROR:',
                error
            );
        }
    }
};
