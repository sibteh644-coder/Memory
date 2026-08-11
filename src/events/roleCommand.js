export default {
    name: 'messageCreate',

    async execute(message, client) {
        if (message.author.bot) return;
        if (!message.guild) return;

        const args = message.content.trim().split(/\s+/);

        if (args[0].toLowerCase() !== '?role') return;

        if (!message.member.permissions.has('ManageRoles')) {
            return message.reply('❌ You need the **Manage Roles** permission.');
        }

        const target = message.mentions.members.first();

        if (!target) {
            return message.reply('❌ Usage: `?role @user Role Name`');
        }

        // Remove the mention from the arguments
        args.shift();
        const roleName = args
            .slice(1)
            .join(' ')
            .trim();

        if (!roleName) {
            return message.reply('❌ Please provide a role name.');
        }

        const role = message.guild.roles.cache.find(
            role => role.name.toLowerCase() === roleName.toLowerCase()
        );

        if (!role) {
            return message.reply(`❌ I couldn't find the role **${roleName}**.`);
        }

        if (role.managed) {
            return message.reply('❌ That role cannot be manually assigned.');
        }

        const botMember = message.guild.members.me;

        if (!botMember) {
            return message.reply('❌ I could not find my bot member.');
        }

        if (role.position >= botMember.roles.highest.position) {
            return message.reply(
                '❌ I cannot give that role because it is higher than or equal to my highest role.'
            );
        }

        if (target.roles.cache.has(role.id)) {
            return message.reply(
                `❌ **${target.user.username}** already has the **${role.name}** role.`
            );
        }

        try {
            await target.roles.add(role);

            return message.reply(
                `✅ Added **${role.name}** to **${target.user.username}**.`
            );
        } catch (error) {
            console.error('Role command error:', error);
            return message.reply('❌ I could not give that role.');
        }
    }
};
