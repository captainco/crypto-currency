const {Telegraf}            = require("telegraf");
const fs                    = require('fs');
const binance               = require('../binance/binance');
const common                = require('../common');
const moment                = require('moment-timezone');
const _                     = require('lodash');

moment.tz.setDefault("Asia/Ho_Chi_Minh");
const bot                   = new Telegraf(process.env.envTelegramBotToken);
const groupId               = process.env.envTelegramGroupId;
const envTelegramMyTelegram = process.env.envTelegramMyTelegram;

function ReplaceTextByTemplate(oldChar, newChar, templatePath) {
    if (oldChar.length == 0) return "";

    var output = fs.readFileSync(templatePath, 'utf8');
    for (let index = 0; index < oldChar.length; index++) {
        const oc = oldChar[index];
        const nc = newChar[index];
        output = output.replace(oc, nc);
    }
    return output;
}

function GetMoment() {
    return moment(Date.now()).format("DD/MM/YYYY HH:mm:ss");
}

function IsMyTelegramAccount(telegramId) {
    return _.get(telegramId, 'update.message.from.id') == envTelegramMyTelegram;
}

function GetTelegramMessage(ctxTelegramMessage, command) {
    return _.replace(_.get(ctxTelegramMessage, 'update.message.text'), `/${command}`, '').trim();
}

bot.start((ctx) => ctx.reply('Welcome'));

bot.help((ctx) => {
    const logTelegram = fs.readFileSync('./telegram/contents/help.txt', 'utf8');
    ctx.reply(logTelegram);
});

bot.command('h', async (ctx) => {
    if (!IsMyTelegramAccount(ctx)) return;
    const logTelegram = fs.readFileSync('./telegram/contents/help.txt', 'utf8');
    ctx.reply(logTelegram);
});

bot.command('b', async (ctx) => {
    if (!IsMyTelegramAccount(ctx)) return;
    const content = GetTelegramMessage(ctx, 'b');
    try {
        if (content == "") {
            ctx.reply(`Trạng thái bot: ${process.env.envBinanceFunctionRSIBOT == "0" ? "Đã dừng" : "Hoạt động"}`);
        }
        else {
            if (content == "0") {
                process.env.envBinanceFunctionRSIBOT = "0";
                ctx.reply(`Thiết lập trạng thái bot: Đã dừng`);
            } else {
                process.env.envBinanceFunctionRSIBOT = "1";
                ctx.reply(`Thiết lập trạng thái bot: Hoạt động`);
            }
        }
    } catch (error) {
        ctx.reply(error);
    }
});

bot.command('p', async (ctx) => {
    if (!IsMyTelegramAccount(ctx)) return;
    const content = GetTelegramMessage(ctx, 'p');
    try {
        var symbol = content.toUpperCase();
        var r_ = await binance.FuturesPositionRisk(symbol);
        var result = r_[0];
        var oc = ["symbol_in", "positionAmt_in", "entryPrice_in", "markPrice_in", "unRealizedProfit_in", "liquidationPrice_in", "leverage_in", "maxNotionalValue_in", "marginType_in", "isolatedMargin_in", "isAutoAddMargin_in", "positionSide_in", "notional_in", "isolatedWallet_in", "time_in"];
        var nc = [symbol, result.positionAmt, result.entryPrice, result.markPrice, result.unRealizedProfit, result.liquidationPrice, result.leverage, result.maxNotionalValue, result.marginType, result.isolatedMargin, result.isAutoAddMargin, result.positionSide, result.notional, result.isolatedWallet, GetMoment()];
        var temp = ReplaceTextByTemplate(oc, nc, "./telegram/contents/p_template.txt");
        ctx.reply(temp);
    } catch (error) {
        ctx.reply(error);
    }
});

bot.command('r', async (ctx) => {
    if (!IsMyTelegramAccount(ctx)) return;
    try {
        const content = GetTelegramMessage(ctx, 'r').split(' ');
        const symbol = content[0].toUpperCase();
        const interval = content[1].toLowerCase();
        const rsi = await binance.RSI(symbol, interval);
        ctx.reply(`RSI ${symbol}|${interval}: ${rsi}`);
    } catch (error) {
        ctx.reply(error);
    }
});

bot.on('sticker', (ctx) => {
    
    const stickers = [
        '👍', 'Adou~! 😉', 'Cmn 👇', 'Thả gì mà lắm sticker thế! 🙃', 'Tuổi x3 =)))', 'Hảo ✔️',
        'Thả tim nè ❤️', 'Thức tỉnh đi ông cháu eiiii 😁', 'Nếu bạn có sai thì chúng ta cùng sửa sai 🤪',
        'Lạnh cả sống lưng rồi nè 😬', 'Buồn x3 😔'
    ];
    const random = Math.floor(Math.random() * stickers.length);
    ctx.reply(stickers[random]);
});
bot.launch().then(r => {});

//Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

async function log(message) {
    const dateTime = moment(Date.now()).format("DD/MM/YYYY HH:mm:ss");
    await sendMessage(`${dateTime} => ${message}`);
}

async function sendMessage(message) {
    try {
        await bot.telegram.sendMessage(groupId, message);
    } catch (error) {
        console.log('send message error');
        console.log(error);
    }
}

async function sendTeleMessage(message) {
    await bot.telegram.sendMessage(groupId, message);
}

module.exports = {sendTeleMessage, log}