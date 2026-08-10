client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    const prefix = '?';

    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/\s+/);
    const commandName = args.shift()?.toLowerCase();

    if (commandName !== 'role') return;

    if (!message.member.permissions.has('ManageRoles')) {
        return message.reply('❌ You need the **Manage Roles** permission.');
    }

    const target = message.mentions.members.first();

    if (!target) {
        return message.reply('❌ Usage: `?role @user RoleName`');
    }

    const roleName = args.slice(1).join(' ');

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
        return message.reply('❌ That role is managed by an integration and cannot be assigned.');
    }

    if (role.position >= message.guild.members.me.roles.highest.position) {
        return message.reply('❌ That role is higher than or equal to my highest role.');
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
