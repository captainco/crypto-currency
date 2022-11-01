require('dotenv').config({ path: '../env/live.env' });
const telegram             = require("../telegram/telegram");
const WebSocket            = require("ws");
const binance              = require('./binance');
const common               = require('../common');

var binanceChart           = '30m';
var binanceSymbol          = 'BTCUSDT';
var binanceLeverage        = 125;
var binanceQuantity        = 0.002;
var binanceIsLock          = 0;
var binanceIsLockAlert     = 0;
var DCALongTotalPriceMin   = 20;
var DCAShortTotalPriceMin  = -20;
						   
var totalUSDTBefore        = 0;
var totalUSDT              = 0;

var checkTrend             = '';
var isChangeDCA            = '';
var isChangeEntry          = '';
var isDCAPrice             = 0;
var entryPricePre          = 0;
var DCAPrice               = 0;
var bestMarkPrice          = 1;
						   
var DCALong                = [];
var DCALongStringPrice     = '';
var DCALongTotalPrice_     = DCALongTotalPriceMin;
var DCALongTotalPrice      = DCALongTotalPriceMin;
						   
var DCAShort               = [];
var DCAShortStringPrice    = '';
var DCAShortTotalPrice_    = DCAShortTotalPriceMin;
var DCAShortTotalPrice     = DCAShortTotalPriceMin;

async function Main() {
    return;
    const updateBestMarkPrice = new WebSocket('wss://fstream.binance.com/ws/btcusdt@markPrice@1s');
    updateBestMarkPrice.on('message', async (event) => {
        try {
            if (binanceIsLockAlert != 0) {
                return;
            }
            binanceIsLockAlert = 1;

            await binance.FuturesClearPositions(binanceSymbol);

            if (process.env.Webhook == "") {
                binanceIsLockAlert = 0;
                return;
            }

            if (isDCAPrice == 0) {
                isDCAPrice = 1;
                isChangeDCA = process.env.Webhook;
                await binance.FuturesLeverage(binanceSymbol, binanceLeverage);
                await telegram.log(`✅${binanceSymbol} đã điều chỉnh đòn bẩy ${binanceLeverage}x`);
                const priceBeforeTrade = await binance.FuturesBalance();
                totalUSDTBefore = Number(priceBeforeTrade);
                binanceIsLockAlert = 0;
                return;
            }

            const Ps = (await binance.FuturesPositionRisk(binanceSymbol))[0];

            if (process.env.Webhook == isChangeDCA) {
                if (process.env.Webhook != isChangeEntry) {
                    isChangeEntry = process.env.Webhook;
                    entryPricePre = Number(Ps.positionAmt) == 0 ? Number(Ps.markPrice) : Number(Ps.entryPrice);
                }

                if ((bestMarkPrice < Number(Ps.markPrice) && process.env.Webhook == 'buy') || (bestMarkPrice > Number(Ps.markPrice) && process.env.Webhook == 'sell')) {
                    bestMarkPrice = Number(Ps.markPrice);
                    DCAPrice = Number(Number(bestMarkPrice) - Number(entryPricePre)).toFixed(2);
                    const iconLongShortAlert = process.env.Webhook == 'buy' ? '🟢' : '🔴';
                    await telegram.log(`${iconLongShortAlert} => DCAPrice new: ${DCAPrice}`);
                }
            } else {
                isChangeDCA = process.env.Webhook;
                const NumberDCAPrice = Number(DCAPrice).toFixed(2);

                //Push to array
                if (NumberDCAPrice > 0) {
                    DCALong.push(NumberDCAPrice);
                    await telegram.log(`🟢 => DCAPrice push: ${NumberDCAPrice}`);
                    await telegram.log(`🟢 => DCALong: ${DCALong.toString()}`);

                    if (DCALong.length < 6) {
                        DCALongTotalPrice = DCALongTotalPriceMin;
                    } else {
                        DCALongStringPrice = `${Number(DCALong[DCALong.length - 1])};${Number(DCALong[DCALong.length - 2])};${Number(DCALong[DCALong.length - 3])};${Number(DCALong[DCALong.length - 4])};${Number(DCALong[DCALong.length - 5])}`;
                        DCALongTotalPrice = Number((Number(DCALong[DCALong.length - 1]) + Number(DCALong[DCALong.length - 2]) + Number(DCALong[DCALong.length - 3]) + Number(DCALong[DCALong.length - 4]) + Number(DCALong[DCALong.length - 5])) / 5).toFixed(2);
                        DCALongTotalPrice_ = DCALongTotalPrice;
                        DCALongTotalPrice = Number(DCALongTotalPrice) < DCALongTotalPriceMin ? DCALongTotalPriceMin : Number(DCALongTotalPrice);
                        DCALongTotalPrice = Number(DCALongTotalPrice) > 100 ? 100 : Number(DCALongTotalPrice);
                    }
                } else {
                    DCAShort.push(NumberDCAPrice);
                    await telegram.log(`🔴 => DCAPrice push: ${NumberDCAPrice}`);
                    await telegram.log(`🔴 => DCAShort: ${DCAShort.toString()}`);

                    if (DCAShort.length < 6) {
                        DCAShortTotalPrice = DCAShortTotalPriceMin;
                    } else {
                        DCAShortStringPrice = `${Number(DCAShort[DCAShort.length - 1])};${Number(DCAShort[DCAShort.length - 2])};${Number(DCAShort[DCAShort.length - 3])};${Number(DCAShort[DCAShort.length - 4])};${Number(DCAShort[DCAShort.length - 5])}`;
                        DCAShortTotalPrice = Number((Number(DCAShort[DCAShort.length - 1]) + Number(DCAShort[DCAShort.length - 2]) + Number(DCAShort[DCAShort.length - 3]) + Number(DCAShort[DCAShort.length - 4]) + Number(DCAShort[DCAShort.length - 5])) / 5).toFixed(2);
                        DCAShortTotalPrice_ = DCAShortTotalPrice;
                        DCAShortTotalPrice = Number(DCAShortTotalPrice) > DCAShortTotalPriceMin ? DCAShortTotalPriceMin : Number(DCAShortTotalPrice);
                        DCAShortTotalPrice = Number(DCAShortTotalPrice) < -100 ? -100 : Number(DCAShortTotalPrice);
                    }
                }
            }
            binanceIsLockAlert = 0;
        } catch (e) {
            binanceIsLockAlert = 0;
            console.log(e);
        }
    });

    const reportDCALongShortPrice = new WebSocket('wss://fstream.binance.com/ws/btcusdt@markPrice@1s');
    reportDCALongShortPrice.on('message', async (event) => {
        try {
            const priceTrade = await binance.FuturesBalance();
            totalUSDT = Number(priceTrade) - Number(totalUSDTBefore);
            process.env.Webhookud = Number(totalUSDT).toFixed(2);

            const Ps = (await binance.FuturesPositionRisk(binanceSymbol))[0];
            process.env.Webhookud_ = Number(Ps.unRealizedProfit);
            

            if (common.GetMomentSecond() == "59") {
                const markPrice = Number(Ps.markPrice).toFixed(2);
                var oc = ["_markPrice", "_totalUSDTBefore", "_totalUSDTTrade", "_totalUSDT", "_tmpTotalUSDT", "_binanceIsLock", "_binanceIsLockAlert", "_checkTrend", "_isChangeDCA", "_isDCAPrice", "_DCAPrice", "_entryPricePre", "_bestMarkPrice", "_DCALongLength", "_DCALongStringPrice", "_DCALongTotalPrice_", "_DCALongTotalPrice", "_DCAShortLength", "_DCAShortStringPrice", "_DCAShortTotalPrice_", "_DCAShortTotalPrice", "time_in"];
                var nc = [
                    markPrice,
                    Number(totalUSDTBefore).toFixed(2),
                    Number(priceTrade).toFixed(2),
                    Number(totalUSDT).toFixed(2),
                    Ps.unRealizedProfit,
                    binanceIsLock,
                    binanceIsLockAlert,
                    checkTrend,
                    isChangeDCA,
                    isDCAPrice,
                    DCAPrice,
                    entryPricePre,
                    bestMarkPrice,
                    DCALong.length,
                    DCALongStringPrice,
                    Number(DCALongTotalPrice_),
                    Number(DCALongTotalPrice),
                    DCAShort.length,
                    DCAShortStringPrice,
                    Number(DCAShortTotalPrice_),
                    Number(DCAShortTotalPrice),
                    common.GetMoment()
                ];
                await telegram.logAlert(oc, nc);
            }
        } catch (e) {
            console.log(e);
        }
    });

    const Trading = new WebSocket('wss://fstream.binance.com/ws/btcusdt@markPrice@1s');
    Trading.on('message', async (event) => {
        try {
            if (binanceIsLock != 0) {
                return;
            }
            binanceIsLock = 1;

            if (process.env.Webhook == '') {
                binanceIsLock = 0;
                return;
            }

            if (process.env.Webhook == checkTrend) {
                binanceIsLock = 0;
                return;
            }
            checkTrend = process.env.Webhook;

            const Ps = (await binance.FuturesPositionRisk(binanceSymbol))[0];

            if (process.env.Webhook == 'buy') {
                if (Ps.positionAmt <= 0) {
                    const binanceOpen = await binance.FuturesOpenPositionsTPSL(binanceSymbol, binanceQuantity, DCALongTotalPrice, 5, 'BUY');
                    await telegram.log(`🟢${binanceSymbol} ${binanceChart}. E: ${Number(binanceOpen.entryPrice).toFixed(2)}`);
                }
            } else {
                if (Ps.positionAmt >= 0) {
                    const binanceOpen = await binance.FuturesOpenPositionsTPSL(binanceSymbol, binanceQuantity, DCAShortTotalPrice, 5, 'SELL');
                    await telegram.log(`🔴${binanceSymbol} ${binanceChart}. E: ${Number(binanceOpen.entryPrice).toFixed(2)}`);
                }
            }
            binanceIsLock = 0;
        } catch (e) {
            binanceIsLock = 0;
            await telegram.log(`⚠ ${e}`);
        }
    });
}

module.exports = { Main }
