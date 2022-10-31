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

bot.command('d', async (ctx) => {
    try {
        var oc = ["_icontmp", "_usdttmp", "_icon", "_usdt", "time_in"];
        const _icontmp =  Number(process.env.Webhookud_) == 0 ? '⚪' : Number(process.env.Webhookud_) > 0 ? '✅' : '❌';
        const _icon =  Number(process.env.Webhookud) == 0 ? '⚪' : Number(process.env.Webhookud) > 0 ? '✅' : '❌';
        var nc = [_icontmp, process.env.Webhookud_, _icon, process.env.Webhookud, GetMoment()];
        var temp = ReplaceTextByTemplate(oc, nc, "./telegram/contents/whd_template.txt");
        ctx.reply(temp);
    } catch (error) {
        ctx.reply(error);
    }
});

bot.command('p', async (ctx) => {
    if (!IsMyTelegramAccount(ctx)) return;
    const content = GetTelegramMessage(ctx, 'p');
    try {
        if (content == "") {
            var symbol = 'BTCUSDT';
            var result = (await binance.FuturesPositionRisk(symbol))[0];
            var iconLongShort = result.positionAmt == 0 ? "⚪" : (result.positionAmt > 0 ? "🟢" : "🔴");
            var oc = ["symbol_in", "longshort_in", "positionAmt_in", "entryPrice_in", "markPrice_in", "unRealizedProfit_in", "liquidationPrice_in", "leverage_in", "time_in"];
            var nc = [symbol, iconLongShort, result.positionAmt, result.entryPrice, result.markPrice, result.unRealizedProfit, result.liquidationPrice, result.leverage, GetMoment()];
            var temp = ReplaceTextByTemplate(oc, nc, "./telegram/contents/p_template.txt");
        } else {
            var symbol = `${content.toUpperCase()}USDT`;
            var result = (await binance.FuturesPositionRisk(symbol))[0];
            var oc = ["symbol_in", "positionAmt_in", "entryPrice_in", "markPrice_in", "unRealizedProfit_in", "liquidationPrice_in", "leverage_in", "maxNotionalValue_in", "marginType_in", "isolatedMargin_in", "isAutoAddMargin_in", "positionSide_in", "notional_in", "isolatedWallet_in", "time_in"];
            var nc = [symbol, result.positionAmt, result.entryPrice, result.markPrice, result.unRealizedProfit, result.liquidationPrice, result.leverage, result.maxNotionalValue, result.marginType, result.isolatedMargin, result.isAutoAddMargin, result.positionSide, result.notional, result.isolatedWallet, GetMoment()];
            var temp = ReplaceTextByTemplate(oc, nc, "./telegram/contents/pc_template.txt");
        }
        ctx.reply(temp);
    } catch (error) {
        ctx.reply(error);
    }
});

bot.on('sticker', (ctx) => {
    const stickers = [
        '👍', 'Adou~! 😉', 'Cmn 👇', 'Thả gì mà lắm sticker thế! 🙃', 'Tuổi x3 =)))', 'Hảo ✅',
        'Thả tim nè ❤️', 'Con cò lông này... 😁', 'Nasica đó hả!!! 🤪',
        'Ái chà, khét đấy 😬', 'Buồn x3 😔', 'Cũng ra gì đấy, nhề 🙏', 'Thật là tuyệt vời 😝',
        'Khó thế cũng nghĩ ra được 😍', 'Không sợ kẻ địch mạnh, chỉ sợ đồng đội cháy tài khoản 😏',
        'Ok bạn eiiii 😁', 'Hộ hộ bố mài cái, ok =)))', 'Cho bố mài xanh chín 😂', 'Cụ ra đi chân lạnh toát 😭',
        'Đu đỉnh cả lũ rồi, mọe 🚑', 'Sticker đẹp đấy 😝', 'Nhìn sticker này chỉ muốn đấm thằng gửi 😤',
        'Gợi đòn vkl 😤', 'Chưa chắc đã về bờ đâu 🚑'
    ];
    const random = Math.floor(Math.random() * stickers.length);
    ctx.reply(stickers[random]);
});
bot.launch().then(r => {});

//Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

async function log(message) {
    var oc = ["content_in", "time_in"];
    var nc = [message, GetMoment()];
    var temp = ReplaceTextByTemplate(oc, nc, "./telegram/contents/template.txt");
    await sendMessage(`${temp}`);
}

async function logAlert(oc, nc) {
    var temp = ReplaceTextByTemplate(oc, nc, "./telegram/contents/alert_template.txt");
    await sendMessage(`${temp}`);
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

module.exports = {sendTeleMessage, log, logAlert}