```js
export default {
    name: 'invite',
    description: 'Check your invite count',

    async execute(message, args, client) {
        const invites = await message.guild.invites.fetch();

        let total = 0;

        invites.forEach(invite => {
            if (invite.inviter?.id === message.author.id) {
                total += invite.uses;
            }
        });

        await message.reply(
            `${message.author} has ${total} invites.`
        );
    }
};
```
