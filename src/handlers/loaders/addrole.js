import { SlashCommandBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('role')
        .setDescription('Assigns a role to a user.'),

    async execute(interaction) {
        await interaction.reply('Use `?role @user RoleName` for this command.');
    },

    init(client) {
        if (client.__roleListenerLoaded) return;
        client.__roleListenerLoaded = true;

        client.on('messageCreate', async (message) => {
            if (message.author.bot) return;
            if (!message.content.toLowerCase().startsWith('?role')) return;

            if (!message.member.permissions.has('ManageRoles')) {
                return message.reply('❌ You need the **Manage Roles** permission.');
            }

            const target = message.mentions.members.first();

            if (!target) {
                return message.reply('❌ Usage: `?role @user RoleName`');
            }

            const args = message.content.trim().split(/\s+/).slice(2);
            const roleName = args.join(' ');

            if (!roleName) {
                return message.reply('❌ Please provide a role name.');
            }

            const role = message.guild.roles.cache.find(
                r => r.name.toLowerCase() === roleName.toLowerCase()
            );

            if (!role) {
                return message.reply(`❌ I couldn't find the role **${roleName}**.`);
            }

            if (role.position >= message.guild.members.me.roles.highest.position) {
                return message.reply('❌ I cannot manage that role because it is higher than my highest role.');
            }

            try {
                await target.roles.add(role);

                await message.reply(
                    `✅ Added **${role.name}** to **${target.user.username}**.`
                );
            } catch (error) {
                console.error(error);
                await message.reply('❌ I couldn't add that role.');
            }
        });
    }
};
