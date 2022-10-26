require('dotenv').config({ path: '../env/live.env' });
const telegram          = require("../telegram/telegram");
const WebSocket         = require("ws");
const binance           = require('./binance');
const common            = require('../common');

var binanceSymbol       = 'BTCUSDT';
var binanceLeverage     = 125;
var binanceQuantity     = 0.001;

var countTP             = 0;
var countSL             = 0;
var winrate             = 0;

var totalUSDTBefore     = 0;
var totalUSDT           = 0;
var checkTrend          = '';

var isChangeDCA         = '';
var isDCAPrice          = 0;
var DCAPrice            = 0;
var bestMarkPrice       = 0;

var DCALong             = [];
var DCALongStringPrice  = '';
var DCALongTotalPrice_  = 5;
var DCALongTotalPrice   = 5;

var DCAShort            = [];
var DCAShortStringPrice = '';
var DCAShortTotalPrice_ = -5;
var DCAShortTotalPrice  = -5;

async function Main() {
    await binance.FuturesMarketBuySell('BTCUSDT', 0.001, 'SELL');
    return;
    const updateBestMarkPrice = new WebSocket('wss://fstream.binance.com/ws/btcusdt@markPrice@1s');
    updateBestMarkPrice.on('message', async (event) => {
        try {
            if (process.env.Webhook1m == "") {
                return;
            }

            if (isDCAPrice == 0) {
                isDCAPrice = 1;
                isChangeDCA = process.env.Webhook1m;
                await binance.FuturesLeverage(binanceSymbol, binanceLeverage);
                await telegram.log(`✅${binanceSymbol} đã điều chỉnh đòn bẩy ${binanceLeverage}x`);
                const priceBeforeTrade = await binance.FuturesBalance();
                totalUSDTBefore = Number(priceBeforeTrade);
                return;
            }

            if (process.env.Webhook1m == isChangeDCA) {
                const Ps = (await binance.FuturesPositionRisk(binanceSymbol))[0];
                const markPrice = Number(Ps.markPrice);
                if ((bestMarkPrice < markPrice && Ps.positionAmt > 0) || (bestMarkPrice > markPrice && Ps.positionAmt < 0)) {
                    bestMarkPrice = markPrice;
                    DCAPrice = Number(Number(bestMarkPrice) - Number(Ps.entryPrice)).toFixed(2);
                    const iconLongShortAlert = Ps.positionAmt > 0 ? '🟢' : '🔴';
                    await telegram.log(`${iconLongShortAlert} => DCAPrice new: ${DCAPrice}`);
                }
            } else {
                isChangeDCA = process.env.Webhook1m;
                const NumberDCAPrice = Number(DCAPrice).toFixed(2);
                //Push to array
                if (NumberDCAPrice > 0) {
                    DCALong.push(NumberDCAPrice);
                    await telegram.log(`🟢 => DCAPrice push: ${NumberDCAPrice}`);
                    await telegram.log(`🟢 => DCALong: ${DCALong.toString()}`);

                    if (DCALong.length < 6) {
                        DCALongTotalPrice = 5;
                    } else {
                        DCALongStringPrice = `${Number(DCALong[DCALong.length - 1])};${Number(DCALong[DCALong.length - 2])};${Number(DCALong[DCALong.length - 3])};${Number(DCALong[DCALong.length - 4])};${Number(DCALong[DCALong.length - 5])}`;
                        DCALongTotalPrice = Number((Number(DCALong[DCALong.length - 1]) + Number(DCALong[DCALong.length - 2]) + Number(DCALong[DCALong.length - 3]) + Number(DCALong[DCALong.length - 4]) + Number(DCALong[DCALong.length - 5])) / 5).toFixed(2);
                        DCALongTotalPrice_ = DCALongTotalPrice;
                        DCALongTotalPrice = Number(DCALongTotalPrice) < 5 ? 5 : Number(DCALongTotalPrice);
                    }
                } else {
                    DCAShort.push(NumberDCAPrice);
                    await telegram.log(`🔴 => DCAPrice push: ${NumberDCAPrice}`);
                    await telegram.log(`🔴 => DCAShort: ${DCAShort.toString()}`);

                    if (DCAShort.length < 6) {
                        DCAShortTotalPrice = -5;
                    } else {
                        DCAShortStringPrice = `${Number(DCAShort[DCAShort.length - 1])};${Number(DCAShort[DCAShort.length - 2])};${Number(DCAShort[DCAShort.length - 3])};${Number(DCAShort[DCAShort.length - 4])};${Number(DCAShort[DCAShort.length - 5])}`;
                        DCAShortTotalPrice = Number((Number(DCAShort[DCAShort.length - 1]) + Number(DCAShort[DCAShort.length - 2]) + Number(DCAShort[DCAShort.length - 3]) + Number(DCAShort[DCAShort.length - 4]) + Number(DCAShort[DCAShort.length - 5])) / 5).toFixed(2);
                        DCAShortTotalPrice_ = DCAShortTotalPrice;
                        DCAShortTotalPrice = Number(DCAShortTotalPrice) > -5 ? -5 : Number(DCAShortTotalPrice);
                    }
                }
            }
        } catch (e) {
            console.log(e);
        }
    });

    const reportDCALongShortPrice = new WebSocket('wss://fstream.binance.com/ws/btcusdt@markPrice@1s');
    reportDCALongShortPrice.on('message', async (event) => {
        try {
            const priceTrade = await binance.FuturesBalance();
            totalUSDT = Number(priceTrade) - Number(totalUSDTBefore);
            process.env.Webhook1mud = Number(totalUSDT).toFixed(2);
            if (common.GetMomentSecond() == "59") {
                winrate = (countTP + countSL) == 0 ? 0 : Number(countTP / (countTP + countSL) * 100).toFixed(0);
                var wirateString = `${winrate} %`;
                const Ps = (await binance.FuturesPositionRisk(binanceSymbol))[0];
                const markPrice = Number(Ps.markPrice).toFixed(2);
                var oc = ["_markPrice", "_tp", "_sl", "_winrate", "_totalUSDTBefore", "_totalUSDTTrade", "_totalUSDT", "_checkTrend", "_isChangeDCA", "_isDCAPrice", "_DCAPrice", "_bestMarkPrice", "_DCALongLength", "_DCALongStringPrice", "_DCALongTotalPrice_", "_DCALongTotalPrice", "_DCAShortLength", "_DCAShortStringPrice", "_DCAShortTotalPrice_", "_DCAShortTotalPrice", "time_in"];
                var nc = [
                    markPrice,
                    countTP,
                    countSL,
                    wirateString,
                    totalUSDTBefore,
                    priceTrade,
                    totalUSDT,
                    checkTrend,
                    isChangeDCA,
                    isDCAPrice,
                    DCAPrice,
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
            if (process.env.Webhook1m == '') {
                return;
            }

            /*Đóng lệnh sớm*/
            if (process.env.Webhook1m == checkTrend) {
                const Ps = (await binance.FuturesPositionRisk(binanceSymbol))[0];
                if (Ps.positionAmt != 0) {
                    /*Kèo long*/
                    if (Ps.positionAmt > 1) {
                        if (Number(Ps.entryPrice) + Number(DCALongTotalPrice) < Number(Ps.markPrice)) {
                            await binance.FuturesMarketBuySell(binanceSymbol, Math.abs(Ps.positionAmt), 'SELL');
                            var iconLongShortAlert = '';
                            if (Ps.unRealizedProfit > 0) {
                                iconLongShortAlert = '✅';
                                countTP = Number(countTP) + 1;
                            } else {
                                iconLongShortAlert = '❌';
                                countSL = Number(countSL) + 1;
                            }
                            await telegram.log(`${iconLongShortAlert}🟢${binanceSymbol} 1m Đóng lệnh sớm. DCALongTotalPrice: ${DCALongTotalPrice}. E: ${Number(Ps.entryPrice).toFixed(2)}; M: ${Number(Ps.markPrice).toFixed(2)}`);
                        }
                    }
                    /*Kèo short*/
                    else {
                        if (Number(Ps.entryPrice) + Number(DCAShortTotalPrice) > Number(Ps.markPrice)) {
                            await binance.FuturesMarketBuySell(binanceSymbol, Math.abs(Ps.positionAmt), 'BUY');
                            var iconLongShortAlert = '';
                            if (Ps.unRealizedProfit > 0) {
                                iconLongShortAlert = '✅';
                                countTP = Number(countTP) + 1;
                            } else {
                                iconLongShortAlert = '❌';
                                countSL = Number(countSL) + 1;
                            }
                            await telegram.log(`${iconLongShortAlert}🔴${binanceSymbol} 1m Đóng lệnh sớm. DCAShortTotalPrice: ${DCAShortTotalPrice}. E: ${Number(Ps.entryPrice).toFixed(2)}; M: ${Number(Ps.markPrice).toFixed(2)}`);
                        }
                    }
                }
                return;
            }

            /*Trade chính*/
            checkTrend = process.env.Webhook1m;
            const Ps = (await binance.FuturesPositionRisk(binanceSymbol))[0];
            if (process.env.Webhook1m == 'buy') {
                if (Ps.positionAmt == 0) {
                    await binance.FuturesMarketBuySell(binanceSymbol, binanceQuantity, 'BUY');
                    const PsAlert = (await binance.FuturesPositionRisk(binanceSymbol))[0];
                    await telegram.log(`🟢${binanceSymbol} 1m. E: ${Number(PsAlert.entryPrice).toFixed(2)}`);
                } else {
                    if (Ps.positionAmt < 0) {
                        await binance.FuturesMarketBuySell(binanceSymbol, Math.abs(Ps.positionAmt), 'BUY');
                        await binance.FuturesMarketBuySell(binanceSymbol, Math.abs(Ps.positionAmt), 'SELL');
                        const PsAlert = (await binance.FuturesPositionRisk(binanceSymbol))[0];
                        var iconLongShortAlert = '';
                        if (Ps.unRealizedProfit > 0) {
                            iconLongShortAlert = '✅';
                            countTP = Number(countTP) + 1;
                        } else {
                            iconLongShortAlert = '❌';
                            countSL = Number(countSL) + 1;
                        }
                        await telegram.log(`${iconLongShortAlert}🔴${binanceSymbol} 1m. E: ${Number(Ps.entryPrice).toFixed(2)}; M: ${Number(Ps.markPrice).toFixed(2)}`);
                        await telegram.log(`🟢${binanceSymbol} 1m. E: ${Number(PsAlert.entryPrice).toFixed(2)}`);
                    }
                }
            } else {
                if (Ps.positionAmt == 0) {
                    await binance.FuturesMarketBuySell(binanceSymbol, binanceQuantity, 'SELL');
                    const PsAlert = (await binance.FuturesPositionRisk(binanceSymbol))[0];
                    await telegram.log(`🔴${binanceSymbol} 1m. E: ${Number(PsAlert.entryPrice).toFixed(2)}`);
                } else {
                    if (Ps.positionAmt > 0) {
                        await binance.FuturesMarketBuySell(binanceSymbol, Math.abs(Ps.positionAmt), 'SELL');
                        await binance.FuturesMarketBuySell(binanceSymbol, Math.abs(Ps.positionAmt), 'BUY');
                        const PsAlert = (await binance.FuturesPositionRisk(binanceSymbol))[0];
                        var iconLongShortAlert = '';
                        if (Ps.unRealizedProfit > 0) {
                            iconLongShortAlert = '✅';
                            countTP = Number(countTP) + 1;
                        } else {
                            iconLongShortAlert = '❌';
                            countSL = Number(countSL) + 1;
                        }
                        await telegram.log(`${iconLongShortAlert}🟢${binanceSymbol} 1m. E: ${Number(Ps.entryPrice).toFixed(2)}; M: ${Number(Ps.markPrice).toFixed(2)}`);
                        await telegram.log(`🔴${binanceSymbol} 1m. E: ${Number(PsAlert.entryPrice).toFixed(2)}`);
                    }
                }
            }
        } catch (e) {
            await telegram.log(`⚠ ${e}`);
        }
    });
}

module.exports = { Main }
