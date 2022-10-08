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
            ctx.reply(`🤖 Trạng thái bot: ${process.env.envTelegramBotStatus == "0" ? "Đã dừng" : "Hoạt động"}`);
        }
        else {
            if (content == "0") {
                process.env.envTelegramBotStatus = "0";
                ctx.reply(`✅ Thiết lập trạng thái bot: Đã dừng`);
            } else {
                process.env.envTelegramBotStatus = "1";
                ctx.reply(`✅ Thiết lập trạng thái bot: Hoạt động`);
            }
        }
    } catch (error) {
        ctx.reply(error);
    }
});

bot.command('c', async (ctx) => {
    if (!IsMyTelegramAccount(ctx)) return;
    const content = GetTelegramMessage(ctx, 'c');
    const contents = content.split(' ');
    try {
        var oc = ["coin_in", "value_in", "leverage_in", "time_in"];
        if (content == "") {
            var nc = [process.env.envBinanceFunctionSymbol, process.env.envBinanceFunctionPrice, process.env.envBinanceFunctionLeverage, GetMoment()];
            var temp = ReplaceTextByTemplate(oc, nc, "./telegram/contents/c_template.txt");
        } else {
            const coinName = `${contents[0].toUpperCase()}USDT`;
            const value = Number(contents[1]);
            const valueLeverage = Number(contents[2]);
            process.env.envBinanceFunctionSymbol = coinName;
            process.env.envBinanceFunctionPrice = value;
            process.env.envBinanceFunctionLeverage = valueLeverage;
            await binance.FuturesLeverage(process.env.envBinanceFunctionSymbol, Number(process.env.envBinanceFunctionLeverage));
            var nc = [process.env.envBinanceFunctionSymbol, process.env.envBinanceFunctionPrice, process.env.envBinanceFunctionLeverage, GetMoment()];
            var temp = ReplaceTextByTemplate(oc, nc, "./telegram/contents/cs_template.txt");
        }
        ctx.reply(temp);
    } catch (error) {
        ctx.reply(error);
    }
});

bot.command('wh', async (ctx) => {
    if (!IsMyTelegramAccount(ctx)) return;
    try {
        var oc = ["1m_icon", "5m_icon", "15m_icon", "30m_icon", "1h_icon", "1m_u", "5m_u", "15m_u", "30m_u", "1h_u", "time_in"];
        const _1m_icon =  Number(process.env.Webhook1u) == 0 ? '⚪' : Number(process.env.Webhook1u) > 0 ? '✅' : '❌';
        const _5m_icon =  Number(process.env.Webhook5u) == 0 ? '⚪' : Number(process.env.Webhook5u) > 0 ? '✅' : '❌';
        const _15m_icon = Number(process.env.Webhook15u) == 0 ? '⚪' : Number(process.env.Webhook15u) > 0 ? '✅' : '❌';
        const _30m_icon = Number(process.env.Webhook30u) == 0 ? '⚪' : Number(process.env.Webhook30u) > 0 ? '✅' : '❌';
        const _1h_icon =  Number(process.env.Webhook1hu) == 0 ? '⚪' : Number(process.env.Webhook1hu) > 0 ? '✅' : '❌';
        var nc = [_1m_icon, _5m_icon, _15m_icon, _30m_icon, _1h_icon, process.env.Webhook1u, process.env.Webhook5u, process.env.Webhook15u, process.env.Webhook30u, process.env.Webhook1hu, GetMoment()];
        var temp = ReplaceTextByTemplate(oc, nc, "./telegram/contents/wh_template.txt");
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
            var symbol = process.env.envBinanceFunctionSymbol;
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

bot.command('r', async (ctx) => {
    if (!IsMyTelegramAccount(ctx)) return;
    try {
        const content = GetTelegramMessage(ctx, 'r').split(' ');
        const symbol = `${content[0].toUpperCase()}USDT`;
        const interval = content[1].toLowerCase();
        const rsi = await binance.RSI(symbol, interval);
        ctx.reply(`🤖 RSI ${symbol}|${interval}: ${rsi}`);
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

async function logAlert(coin, rsi, icon, liquid, spot, ft, spFt) {
    var oc = ["coin_in", "rsi_in", "icon_in", "liquid_in", "spot_in", "ft_in", "sp_ft_in", "time_in"];
    var nc = [coin, rsi, icon, liquid, spot, ft, spFt, GetMoment()];
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