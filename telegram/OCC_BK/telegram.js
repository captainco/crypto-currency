const {Telegraf}            = require("telegraf");
const fs                    = require('fs');
const binance               = require('../../binance/binance');
const common                = require('../../common');
const _                     = require('lodash');
const bot                   = new Telegraf(process.env.envTelegramBotToken);
const groupId               = process.env.envTelegramGroupId;
const envTelegramMyTelegram = process.env.envTelegramMyTelegram;
const moment                = require('moment-timezone');
moment.tz.setDefault("Asia/Ho_Chi_Minh");

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

bot.command('a', async (ctx) => {
    try {
        ctx.reply(process.env.binanceAlertDetail);
    } catch (error) {
        ctx.reply(`⚠ Sai cú pháp`);
    }
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
        ctx.reply(`⚠ Sai cú pháp`);
    }
});

bot.command('p', async (ctx) => {
    if (!IsMyTelegramAccount(ctx)) return;
    const content = GetTelegramMessage(ctx, 'p');
    try {
        var symbol = content == "" ? process.env.binanceSymbol : `${content.toUpperCase()}USDT`;

        var result = (await binance.FuturesPositionRisk(symbol))[0];
        var iconLongShort = result.positionAmt == 0 ? "⚪" : (result.positionAmt > 0 ? "🟢" : "🔴");

        var tp_longshort_in = "⚪";
        var tp_positionAmt_in = 0;
        var tp_entryPrice_in = 0;
        var tp_markPrice_in = 0;
        var tp_priceDifference_in = 0;
        const _Od = await binance.FuturesOpenOrders(symbol);
        if (_Od.length > 0) {
            const Od = _Od[0];
            tp_longshort_in = Od.side == "BUY" ? "🟢" : "🔴";
            tp_positionAmt_in = Math.abs(Number(Od.origQty));
            tp_entryPrice_in = Number(result.entryPrice).toFixed(2);
            tp_markPrice_in = Number(Od.stopPrice).toFixed(2);
            tp_priceDifference_in = Math.abs(Number(tp_markPrice_in - tp_entryPrice_in).toFixed(2));
        }

        var oc = [
                "symbol_in",
                "longshort_in",
                "positionAmt_in",
                "entryPrice_in",
                "markPrice_in",
                "unRealizedProfit_in",
                "liquidationPrice_in",
                "leverage_in",
                "tp_longshort_in",
                "tp_positionAmt_in",
                "tp_entryPrice_in",
                "tp_markPrice_in",
                "tp_priceDifference_in",
                "time_in"
            ];
        var nc = [
                symbol,
                iconLongShort,
                Math.abs(Number(result.positionAmt)),
                Number(result.entryPrice).toFixed(2),
                Number(result.markPrice).toFixed(2),
                result.unRealizedProfit,
                Number(result.liquidationPrice).toFixed(2),
                result.leverage,
                tp_longshort_in,
                tp_positionAmt_in,
                tp_entryPrice_in,
                tp_markPrice_in,
                tp_priceDifference_in,
                GetMoment()
            ];
        var temp = ReplaceTextByTemplate(oc, nc, "./telegram/contents/p_template.txt");
        ctx.reply(temp);
    } catch (error) {
        ctx.reply(`⚠ Sai cú pháp`);
    }
});

bot.command('q', async (ctx) => {
    if (!IsMyTelegramAccount(ctx)) return;
    try {
        ctx.reply(`🤖 Quantity hiện tại: ${process.env.binanceQuantity}`);
    } catch (error) {
        ctx.reply(`⚠ Sai cú pháp`);
    }
});

bot.command('qu', async (ctx) => {
    if (!IsMyTelegramAccount(ctx)) return;
    const content = GetTelegramMessage(ctx, 'qu');
    try {
        process.env.binanceQuantity = content;
        ctx.reply(`✅ Quantity mới: ${process.env.binanceQuantity}`);
    } catch (error) {
        ctx.reply(`⚠ Sai cú pháp`);
    }
});


bot.command('op', async (ctx) => {
    if (!IsMyTelegramAccount(ctx)) return;
    const content = GetTelegramMessage(ctx, 'op');
    try {
        const contents = content.split(' ');
        const symbol = `${contents[0].toUpperCase().replace('USDT','')}USDT`;
        const leverage = Number(contents[1]);
        const quantity = Number(contents[2]);
        const longshort = contents[3].toLowerCase();

        var checkLongShort = ["buy", "sell"];
        if (checkLongShort.indexOf(longshort) < 0) {
            ctx.reply(`⚠ Sai cú pháp`);
            return;
        }

        const Ps = (await binance.FuturesPositionRisk(symbol))[0];
        if (Ps.positionAmt != 0) {
            ctx.reply(`✨Vị thế ${symbol} đã được khởi tạo. Bạn không tạo thêm vị thế!`);
            return;
        }

        await binance.FuturesLeverage(symbol, Number(leverage));
        ctx.reply(`✅${symbol} đã điều chỉnh đòn bẩy ${leverage}x`);

        if (longshort == "buy") {
            const binanceOpen = await binance.FuturesMarketBuySell(symbol, Number(quantity), 'BUY');
            ctx.reply(`🟢${symbol}. E: ${Number(binanceOpen.entryPrice).toFixed(2)} USDT`);
        }
        else {
            const binanceOpen = await binance.FuturesMarketBuySell(symbol, Number(quantity), 'SELL');
            ctx.reply(`🔴${symbol}. E: ${Number(binanceOpen.entryPrice).toFixed(2)} USDT`);
        }
    } catch (error) {
        ctx.reply(`⚠ Sai cú pháp`);
    }
});

bot.command('cp', async (ctx) => {
    if (!IsMyTelegramAccount(ctx)) return;
    const content = GetTelegramMessage(ctx, 'cp');
    try {
        const symbol = `${content.toUpperCase().replace('USDT','')}USDT`;
        const binanceClose = await binance.FuturesClosePositions(symbol);
        const icon = binanceClose.positionAmt == 0 ? "✅" : "❌";
        const alert = binanceClose.positionAmt == 0 ? "thành công" : "không thành công";
        ctx.reply(`${icon}Đóng vị thế ${symbol} ${alert}!`);
    } catch (error) {
        ctx.reply(`⚠ Sai cú pháp`);
    }
});

bot.command('otp', async (ctx) => {
    if (!IsMyTelegramAccount(ctx)) return;
    const content = GetTelegramMessage(ctx, 'otp');
    try {
        const contents = content.split(' ');
        const symbol = `${contents[0].toUpperCase().replace('USDT','')}USDT`;
        const priceDifference = Number(contents[1]);
        const binanceOpenTakeProfit = await binance.FuturesOpenTP(symbol, priceDifference);
        if (binanceOpenTakeProfit == "") {
            ctx.reply(`❌Khởi tạo Take Profit ${symbol} không thành công!`);
        } else {
            ctx.reply(`✅Khởi tạo Take Profit ${symbol} thành công! LogJSON: ${binanceOpenTakeProfit}`);
        }
    } catch (error) {
        ctx.reply(`⚠ Sai cú pháp`);
    }
});

bot.command('ctp', async (ctx) => {
    if (!IsMyTelegramAccount(ctx)) return;
    const content = GetTelegramMessage(ctx, 'ctp');
    try {
        const symbol = `${content.toUpperCase().replace('USDT','')}USDT`;
        const binanceCancelTakeProfit = await binance.FuturesCancelTP(symbol);
        if (binanceCancelTakeProfit == "") {
            ctx.reply(`✨Không có Take Profit ${symbol} để hủy!`);
        } else {
            ctx.reply(`✅Hủy Take Profit ${symbol} thành công! LogJSON: ${binanceCancelTakeProfit}`);
        }
    } catch (error) {
        ctx.reply(`⚠ Sai cú pháp`);
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