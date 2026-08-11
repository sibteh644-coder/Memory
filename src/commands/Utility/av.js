import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
data: new SlashCommandBuilder()
.setName('av')
.setDescription("Show a user's avatar")
.addUserOption(option =>
option
.setName('user')
.setDescription('The user whose avatar you want to see')
.setRequired(false)
),

```
async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;

    const avatar = user.displayAvatarURL({
        size: 4096,
        dynamic: true
    });

    const embed = new EmbedBuilder()
        .setTitle(`${user.username}'s Avatar`)
        .setImage(avatar)
        .setURL(avatar)
        .setFooter({ text: `Requested by ${interaction.user.username}` });

    await interaction.reply({ embeds: [embed] });
},

async prefixExecute(message) {
    const user = message.mentions.users.first() || message.author;

    const avatar = user.displayAvatarURL({
        size: 4096,
        dynamic: true
    });

    const embed = new EmbedBuilder()
        .setTitle(`${user.username}'s Avatar`)
        .setImage(avatar)
        .setURL(avatar)
        .setFooter({ text: `Requested by ${message.author.username}` });

    await message.reply({ embeds: [embed] });
}
```

};
