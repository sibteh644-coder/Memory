export default {
    name: 'messageCreate',

    async execute(message) {
        if (message.author.bot || !message.guild) return;

        const content = message.content.trim();

        if (!content.toLowerCase().startsWith('?role ')) return;

        const parts = content.split(/\s+/);

        const target = message.mentions.members.first();

        if (!target) {
            return message.reply('Usage: `?role @user Role Name`');
        }

        if (!message.member.permissions.has('ManageRoles')) {
            return message.reply('You need the **Manage Roles** permission.');
        }

        // Everything after the mention
        const mentionIndex = parts.findIndex(part =>
            part.includes(target.id)
        );

        const roleName = parts
            .slice(mentionIndex + 1)
            .join(' ')
            .trim();

        if (!roleName) {
            return message.reply('Please provide a role name.');
        }

        // Removes spaces, -, _, etc.
        const clean = (name) =>
            name
                .toLowerCase()
                .replace(/[^a-z0-9]/g, '');

        const input = clean(roleName);

        const role = message.guild.roles.cache.find(
            r => clean(r.name) === input
        );

        if (!role) {
            return message.reply(`I couldn't find the role **${roleName}**.`);
        }

        const botMember = message.guild.members.me;

        if (!botMember) {
            return message.reply('I could not find my bot member.');
        }

        if (role.managed) {
            return message.reply('That role cannot be assigned.');
        }

        if (role.position >= botMember.roles.highest.position) {
            return message.reply(
                'I cannot give that role because it is above my highest role.'
            );
        }

        if (target.roles.cache.has(role.id)) {
            return message.reply(
                `**${target.user.username}** already has **${role.name}**.`
            );
        }

        try {
            await target.roles.add(role);

            return message.reply(
                `Added **${role.name}** to **${target.user.username}**.`
            );
        } catch (error) {
            console.error(error);
            return message.reply('I could not give that role.');
        }
    }
};
