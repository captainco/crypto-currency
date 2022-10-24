require('dotenv').config({ path: '../env/live.env' });
const telegram          = require("../telegram/telegram");
const WebSocket         = require("ws");
const binance           = require('./binance');
const common            = require('../common');

var isTrade             = 0;
var markPricePre        = 0;
var totalUSDT           = 0;
var longShortCond       = '';
var checkTrend          = '';

var isChangeDCA         = '';
var isDCAPrice          = 0;
var DCAPrice            = 0;
var DCATakeProfit       = 5;
var bestMarkPrice       = 0;

var DCALong             = [];
var DCALongStringPrice  = '';
var DCALongTotalPrice   = 0;

var DCAShort            = [];
var DCAShortStringPrice = '';
var DCAShortTotalPrice  = 0;

async function Main() {
    const updateBestMarkPrice = new WebSocket('wss://fstream.binance.com/ws/btcusdt@markPrice@1s');
    updateBestMarkPrice.on('message', async (event) => {
        try {
            if (process.env.Webhook1m == "") {
                return;
            }

            if (isDCAPrice == 0) {
                isDCAPrice = 1;
                isChangeDCA = process.env.Webhook1m;
                return;
            }

            if (process.env.Webhook1m == isChangeDCA) {
                const Ps = (await binance.FuturesPositionRisk('BTCUSDT'))[0];
                const markPrice = Number(Ps.markPrice);
                if ((bestMarkPrice < markPrice && isTrade == 1) || (bestMarkPrice > markPrice && isTrade == -1)) {
                    bestMarkPrice = markPrice;
                    DCAPrice = Number(Number(bestMarkPrice) - Number(markPricePre)).toFixed(2);
                    const iconLongShortAlert = isTrade > 0 ? '🟢' : '🔴';
                    await telegram.log(`${iconLongShortAlert} => DCAPrice new: ${DCAPrice}`);
                }
            } else {
                isChangeDCA = process.env.Webhook1m;
                const NumberDCAPrice = Number(DCAPrice).toFixed(0);
                //Push to array
                if (NumberDCAPrice >= 1 || NumberDCAPrice <= -1) {
                    if (NumberDCAPrice > 0) {
                        DCALong.push(NumberDCAPrice);
                        await telegram.log(`🟢 => DCAPrice push: ${NumberDCAPrice}`);
                        await telegram.log(`🟢 => DCALong: ${DCALong.toString()}`);

                        if (DCALong.length != 0) {
                            const DCALongLMax = DCALong.length;
                            const DCALongLMin = DCALongLMax < 5 ? 0 : DCALongLMax - 5;
                            DCALongStringPrice = '';
                            const countDCA = 0;
                            const total = 0;
                            for (let index = DCALongLMax - 1; index >= DCALongLMin; index--) {
                                const DCANumber = Number(DCALong[index]);
                                DCALongStringPrice = `${DCALongStringPrice}${DCANumber};`;
                                countDCA = countDCA + 1;
                                total = total + DCANumber;
                            }
                            DCALongTotalPrice = Number(total / countDCA).toFixed(0);
                        }
                        DCALongTotalPrice = Number(DCALongTotalPrice) < 5 ? 5 : Number(DCALongTotalPrice);
                    } else {
                        DCAShort.push(NumberDCAPrice);
                        await telegram.log(`🔴 => DCAPrice push: ${NumberDCAPrice}`);
                        await telegram.log(`🔴 => DCAShort: ${DCAShort.toString()}`);

                        if (DCAShort.length != 0) {
                            const DCAShortLMax = DCAShort.length;
                            const DCAShortLMin = DCAShortLMax < 5 ? 0 : DCAShortLMax - 5;
                            DCAShortStringPrice = '';
                            const countDCA = 0;
                            const total = 0;
                            for (let index = DCAShortLMax - 1; index >= DCAShortLMin; index--) {
                                const DCANumber = Number(DCAShort[index]);
                                DCAShortStringPrice = `${DCAShortStringPrice}${DCANumber};`;
                                countDCA = countDCA + 1;
                                total = total + DCANumber;
                            }
                            DCAShortTotalPrice = Number(total / countDCA).toFixed(0);
                        }
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
            if (common.GetMomentSecond() == "59") {
                const Ps = (await binance.FuturesPositionRisk('BTCUSDT'))[0];
                const markPrice = Number(Ps.markPrice);
                var oc = ["_markPrice", "_isTrade", "_markPricePre", "_totalUSDT", "_longShortCond", "_checkTrend", "_isChangeDCA", "_isDCAPrice", "_DCAPrice", "_DCATakeProfit", "_bestMarkPrice", "_DCALong", "_DCALongLength", "_DCALongStringPrice", "_DCALongTotalPrice", "_DCAShort", "_DCAShortLength", "_DCAShortStringPrice", "_DCAShortTotalPrice", "time_in"];
                var nc = [
                    markPrice,
                    isTrade,
                    Number(markPricePre).toFixed(2),
                    Number(totalUSDT).toFixed(2),
                    longShortCond,
                    checkTrend,
                    isChangeDCA,
                    isDCAPrice,
                    DCAPrice,
                    DCATakeProfit,
                    bestMarkPrice,
                    DCALong.toString(),
                    DCALong.length,
                    DCALongStringPrice,
                    Number(DCALongTotalPrice),
                    DCAShort.toString(),
                    DCAShort.length,
                    DCAShortStringPrice,
                    Number(DCAShortTotalPrice),
                    common.GetMoment()
                ];
                await telegram.logAlert(oc, nc);
            }
        } catch (e) {
            console.log(e);
        }
    });

    const UpdateUSDT = new WebSocket('wss://fstream.binance.com/ws/btcusdt@markPrice@1s');
    UpdateUSDT.on('message', async (event) => {
        try {
            process.env.Webhook1mud = Number(totalUSDT).toFixed(2);
        } catch (e) {
            await telegram.log(`⚠ ${e}`);
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
                if (isTrade != 0) {
                    const Ps = (await binance.FuturesPositionRisk('BTCUSDT'))[0];
                    if (isTrade == 1) {
                        if (Number(markPricePre) + Number(DCATakeProfit) < Number(Ps.markPrice)) {
                            isTrade = 0;
                            const tpslUSDT = (((Number(Ps.markPrice) * 100 / markPricePre) - 100) / 100 * 1000).toFixed(2);
                            const iconLongShortAlert = tpslUSDT > 0 ? '✅' : '❌';
                            totalUSDT = Number(totalUSDT) + Number(tpslUSDT);
                            await telegram.log(`${iconLongShortAlert}🟢BTCUSDT 1m Đóng lệnh sớm. DCAPrice: ${DCATakeProfit}. E: ${Number(markPricePre).toFixed(2)}; M: ${Number(Ps.markPrice).toFixed(2)}; TPSL: ${tpslUSDT} USDT; T: ${Number(totalUSDT).toFixed(2)} USDT`);
                            markPricePre = 0;
                            DCATakeProfit = Number(DCAShortTotalPrice).toFixed(0);
                        }
                    } else {
                        if (Number(markPricePre) + Number(DCATakeProfit) > Number(Ps.markPrice)) {
                            isTrade = 0;
                            const tpslUSDT = ((100 - (Number(Ps.markPrice) * 100 / markPricePre)) / 100 * 1000).toFixed(2);
                            const iconLongShortAlert = tpslUSDT > 0 ? '✅' : '❌';
                            totalUSDT = Number(totalUSDT) + Number(tpslUSDT);
                            await telegram.log(`${iconLongShortAlert}🔴BTCUSDT 1m Đóng lệnh sớm. DCAPrice: ${DCATakeProfit}. E: ${Number(markPricePre).toFixed(2)}; M: ${Number(Ps.markPrice).toFixed(2)}; TPSL: ${tpslUSDT} USDT; T: ${Number(totalUSDT).toFixed(2)} USDT`);
                            markPricePre = 0;
                            DCATakeProfit = Number(DCALongTotalPrice).toFixed(0);
                        }
                    }
                }
                return;
            }

            /*Trade chính*/
            checkTrend = process.env.Webhook1m;
            longShortCond = process.env.Webhook1m == 'buy' ? 'LONG' : 'SHORT';
            const Ps = (await binance.FuturesPositionRisk('BTCUSDT'))[0];
            if (longShortCond == 'LONG') {
                if (isTrade == 0) {
                    isTrade = 1;
                    await telegram.log(`🟢BTCUSDT 1m. E: ${Number(Ps.markPrice).toFixed(2)}; T: ${Number(totalUSDT).toFixed(2)} USDT`);
                    markPricePre = Number(Ps.markPrice);
                    DCATakeProfit = Number(DCALongTotalPrice).toFixed(0);
                } else {
                    if (isTrade == -1) {
                        isTrade = 1;
                        const tpslUSDT = ((100 - (Number(Ps.markPrice) * 100 / markPricePre)) / 100 * 1000).toFixed(2);
                        const iconLongShortAlert = tpslUSDT > 0 ? '✅' : '❌';
                        totalUSDT = Number(totalUSDT) + Number(tpslUSDT);
                        await telegram.log(`${iconLongShortAlert}🔴BTCUSDT 1m. E: ${Number(markPricePre).toFixed(2)}; M: ${Number(Ps.markPrice).toFixed(2)}; TPSL: ${tpslUSDT} USDT; T: ${Number(totalUSDT).toFixed(2)} USDT`);
                        await telegram.log(`🟢BTCUSDT 1m. E: ${Number(Ps.markPrice).toFixed(2)}; T: ${Number(totalUSDT).toFixed(2)} USDT`);
                        markPricePre = Number(Ps.markPrice);
                        DCATakeProfit = Number(DCALongTotalPrice).toFixed(0);
                    }
                }
            } else {
                if (isTrade == 0) {
                    isTrade = -1;
                    await telegram.log(`🔴BTCUSDT 1m. E: ${Number(Ps.markPrice).toFixed(2)}; T: ${Number(totalUSDT).toFixed(2)} USDT`);
                    markPricePre = Number(Ps.markPrice);
                    DCATakeProfit = Number(DCAShortTotalPrice).toFixed(0);
                } else {
                    if (isTrade == 1) {
                        isTrade = -1;
                        const tpslUSDT = (((Number(Ps.markPrice) * 100 / markPricePre) - 100) / 100 * 1000).toFixed(2);
                        const iconLongShortAlert = tpslUSDT > 0 ? '✅' : '❌';
                        totalUSDT = Number(totalUSDT) + Number(tpslUSDT);
                        await telegram.log(`${iconLongShortAlert}🟢BTCUSDT 1m. E: ${Number(markPricePre).toFixed(2)}; M: ${Number(Ps.markPrice).toFixed(2)}; TPSL: ${tpslUSDT} USDT; T: ${Number(totalUSDT).toFixed(2)} USDT`);
                        await telegram.log(`🔴BTCUSDT 1m. E: ${Number(Ps.markPrice).toFixed(2)}; T: ${Number(totalUSDT).toFixed(2)} USDT`);
                        markPricePre = Number(Ps.markPrice);
                        DCATakeProfit = Number(DCAShortTotalPrice).toFixed(0);
                    }
                }
            }
        } catch (e) {
            await telegram.log(`⚠ ${e}`);
        }
    });
}

module.exports = { Main }
