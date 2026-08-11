export default {
    name: 'messageCreate',

    async execute(message) {
        if (message.author.bot || !message.guild) return;

        const parts = message.content.trim().split(/\s+/);

        if (parts[0].toLowerCase() !== '?role') return;

        const target = message.mentions.members.first();

        if (!target) {
            return message.reply('Usage: `?role @user Role Name`');
        }

        if (!message.member.permissions.has('ManageRoles')) {
            return message.reply('You need the **Manage Roles** permission.');
        }

        // Everything after the mentioned user
        const mentionIndex = parts.findIndex(part =>
            part.includes(target.id)
        );

        let roleName = parts.slice(mentionIndex + 1).join(' ').trim();

        // Allow "2 high" to find "stage 2 - high"
        if (/^\d+\s+(low|medium|high)$/i.test(roleName)) {
            roleName = `stage ${roleName}`;
        }

        const normalize = (name) =>
            name.toLowerCase().replace(/[^a-z0-9]/g, '');

        const role = message.guild.roles.cache.find(
            r => normalize(r.name) === normalize(roleName)
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
