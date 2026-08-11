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

        // Find where the user mention is
        const mentionIndex = parts.findIndex(part =>
            part.includes(target.id)
        );

        let roleName = parts
            .slice(mentionIndex + 1)
            .join(' ')
            .trim();

        if (!roleName) {
            return message.reply('Please provide a role name.');
        }

        // Normalize role names:
        // "Stage 2 - High" -> "stage2high"
        // "stage_2_high"  -> "stage2high"
        const normalize = (name) =>
            name.toLowerCase().replace(/[^a-z0-9]/g, '');

        const search = normalize(roleName);

        // First try an exact match
        let role = message.guild.roles.cache.find(
            r => normalize(r.name) === search
        );

        // If no exact match, try a partial match
        if (!role) {
            role = message.guild.roles.cache.find(
                r => normalize(r.name).startsWith(search)
            );
        }

        if (!role) {
            return message.reply(
                `I couldn't find the role **${roleName}**.`
            );
        }

        const botMember = message.guild.members.me;

        if (!botMember) {
            return message.reply('I could not find my bot member.');
        }

        // Check if the role can be managed
        if (role.managed) {
            return message.reply(
                'That role cannot be manually assigned.'
            );
        }

        // Check role hierarchy
        if (role.position >= botMember.roles.highest.position) {
            return message.reply(
                'I cannot manage that role because it is above my highest role.'
            );
        }

        try {
            // Already has role -> remove it
            if (target.roles.cache.has(role.id)) {
                await target.roles.remove(role);

                return message.reply(
                    `Removed **${role.name}** from **${target.user.username}**.`
                );
            }

            // Doesn't have role -> add it
            await target.roles.add(role);

            return message.reply(
                `Added **${role.name}** to **${target.user.username}**.`
            );

        } catch (error) {
            console.error('Role command error:', error);

            return message.reply(
                'I could not modify that role.'
            );
        }
    }
};
