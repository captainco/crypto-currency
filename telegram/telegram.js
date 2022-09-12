const {Telegraf} = require("telegraf");
const fs         = require('fs');
const binance    = require('../binance/binance');
const common     = require('../common');
const moment     = require('moment-timezone');
const _          = require('lodash');

moment.tz.setDefault("Asia/Ho_Chi_Minh");
const bot        = new Telegraf(process.env.envTelegramBotToken);
const groupId    = process.env.envTelegramGroupId;
const envTelegramMyTelegram = process.env.envTelegramMyTelegram;

function IsMyTelegramAccount(telegramId) {
    return _.get(telegramId, 'update.message.from.id') == envTelegramMyTelegram;
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

bot.command('f', async (ctx) => {
    if (!IsMyTelegramAccount(ctx)) return;
    ctx.reply("Chức năng chưa phát triển!");
});

bot.command('fs', async (ctx) => {
    if (!IsMyTelegramAccount(ctx)) return;
    ctx.reply("Chức năng chưa phát triển!");
});

bot.command('p', async (ctx) => {
    if (!IsMyTelegramAccount(ctx)) return;
    const content = common.GetTelegramMessage(ctx, 'p');
    const checkContent = common.CheckTelegramMessage(content);
    if (checkContent != "") {
        ctx.reply(checkContent);
        return;
    }
    try {
        if (content.includes("-m")) {
            var symbol = content.replace("-m", "").trim().toUpperCase();
            var r_ = await binance.FuturesPositionRisk(symbol);
            var result = r_[0];
            var oc = ["symbol_in", "positionAmt_in", "entryPrice_in", "markPrice_in", "unRealizedProfit_in", "liquidationPrice_in", "leverage_in", "maxNotionalValue_in", "marginType_in", "isolatedMargin_in", "isAutoAddMargin_in", "positionSide_in", "notional_in", "isolatedWallet_in", "time_in"];
            var nc = [symbol, result.positionAmt, result.entryPrice, result.markPrice, result.unRealizedProfit, result.liquidationPrice, result.leverage, result.maxNotionalValue, result.marginType, result.isolatedMargin, result.isAutoAddMargin, result.positionSide, result.notional, result.isolatedWallet, common.GetMoment()];
            var temp = common.ReplaceTextByTemplate(oc, nc, "./telegram/contents/sm_template.txt");
            ctx.reply(temp);
            return;
        }

        var symbol = content.trim().toUpperCase();
        var r_ = await binance.FuturesPositionRisk(symbol);
        var result = r_[0];
        var oc = ["symbol_in", "markPrice_in", "time_in"];
        var nc = [result.symbol, result.markPrice, common.GetMoment()];
        var temp = common.ReplaceTextByTemplate(oc, nc, "./telegram/contents/s_template.txt");
        ctx.reply(temp);
    } catch (error) {
        ctx.reply(error);
    }
});

bot.command('r', async (ctx) => {
    if (!IsMyTelegramAccount(ctx)) return;
    ctx.reply("Chức năng chưa phát triển!");
});

bot.command('s', async (ctx) => {
    if (!IsMyTelegramAccount(ctx)) return;
    const content = common.GetTelegramMessage(ctx, 's');
    const checkContent = common.CheckTelegramMessage(content);
    if (checkContent != "") {
        ctx.reply(checkContent);
        return;
    }
    try {
        if (content.includes("-m")) {
            var symbol = content.replace("-m", "").trim().toUpperCase();
            var r_ = await binance.FuturesPositionRisk(symbol);
            var result = r_[0];
            var oc = ["symbol_in", "positionAmt_in", "entryPrice_in", "markPrice_in", "unRealizedProfit_in", "liquidationPrice_in", "leverage_in", "maxNotionalValue_in", "marginType_in", "isolatedMargin_in", "isAutoAddMargin_in", "positionSide_in", "notional_in", "isolatedWallet_in", "time_in"];
            var nc = [symbol, result.positionAmt, result.entryPrice, result.markPrice, result.unRealizedProfit, result.liquidationPrice, result.leverage, result.maxNotionalValue, result.marginType, result.isolatedMargin, result.isAutoAddMargin, result.positionSide, result.notional, result.isolatedWallet, common.GetMoment()];
            var temp = common.ReplaceTextByTemplate(oc, nc, "./telegram/contents/sm_template.txt");
            ctx.reply(temp);
            return;
        }

        var symbol = content.trim().toUpperCase();
        var r_ = await binance.FuturesPositionRisk(symbol);
        var result = r_[0];
        var oc = ["symbol_in", "markPrice_in", "time_in"];
        var nc = [result.symbol, result.markPrice, common.GetMoment()];
        var temp = common.ReplaceTextByTemplate(oc, nc, "./telegram/contents/s_template.txt");
        ctx.reply(temp);
    } catch (error) {
        ctx.reply(error);
    }
});

bot.on('sticker', (ctx) => ctx.reply('👍'));
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