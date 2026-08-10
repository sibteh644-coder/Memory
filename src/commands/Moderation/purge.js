if (message.content.startsWith("?purge")) {
    const args = message.content.split(" ");
    const amount = parseInt(args[1]);

    if (!amount || amount < 1 || amount > 100) {
        return message.reply("Please enter a number between 1 and 100.");
    }

    await message.channel.bulkDelete(amount, true);

    const confirmation = await message.channel.send(
        `Purged ${amount} message${amount === 1 ? "" : "s"}.`
    );

    setTimeout(() => {
        confirmation.delete().catch(() => {});
    }, 3000);
}
