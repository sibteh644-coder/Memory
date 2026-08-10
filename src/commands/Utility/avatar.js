const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'av',
    description: 'Shows a user\'s avatar.',

    async execute(message, args) {
        const user = message.mentions.users.first() || message.author;

        const avatar = user.displayAvatarURL({
            dynamic: true,
            size: 1024
        });

        const embed = new EmbedBuilder()
            .setTitle(`${user.username}'s Avatar`)
            .setImage(avatar)
            .setColor('Blurple');

        await message.reply({ embeds: [embed] });
    }
};
