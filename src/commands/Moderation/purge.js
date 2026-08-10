client.on("messageCreate", async (message) => {
    if (message.author.bot) return;

    if (!message.content.startsWith("?purge")) return;

    const args = message.content.trim().split(/\s+/);
    const amount = parseInt(args[1]);

    if (!amount || amount < 1 || amount > 100) {
        return message.reply("Please enter a number between 1 and 100.");
    }

    try {
        await message.channel.bulkDelete(amount, true);

        const confirmation = await message.channel.send(
            `Purged ${amount} message${amount === 1 ? "" : "s"}.`
        );

        setTimeout(() => {
            confirmation.delete().catch(() => {});
        }, 3000);

    } catch (error) {
        console.error(error);
        message.reply("I don't have permission to delete messages.");
    }
});
