const {Telegraf} = require("telegraf");
const bot = new Telegraf(process.env.envTelegramBotToken);
const groupId = process.env.envTelegramGroupId;
const fs = require('fs');

bot.start((ctx) => ctx.reply('Welcome'));
bot.help((ctx) => {
    const logTelegram = fs.readFileSync('./logTelegram.txt', 'utf8');
    ctx.reply(logTelegram);
});
bot.hears('/h', (ctx) => {
    const logTelegram = fs.readFileSync('./logTelegram.txt', 'utf8');
    ctx.reply(logTelegram);
});
bot.on('sticker', (ctx) => ctx.reply('👍'));
bot.launch().then(r => {});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

async function sendTeleMessage(message) {
    await bot.telegram.sendMessage(groupId, message);
}

module.exports = {sendTeleMessage, bot}