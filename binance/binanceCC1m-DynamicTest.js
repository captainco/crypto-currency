require('dotenv').config({ path: '../env/live.env' });
const telegram          = require("../telegram/telegram");
const WebSocket         = require("ws");
const binance           = require('./binance');
const common            = require('../common');

var countTP             = 0;
var countSL             = 0;
var winrate             = 0;

var isTrade             = 0;
var markPricePre        = 0;
var totalUSDT           = 0;
var longShortCond       = '';
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
                        DCALongTotalPrice = Number((Number(DCALong[DCALong.length - 1]) + Number(DCALong[DCALong.length - 2]) + Number(DCALong[DCALong.length - 3]) + Number(DCALong[DCALong.length - 4]) + Number(DCALong[DCALong.length - 5])) / 5).toFixed(0);
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
                        DCAShortTotalPrice = Number((Number(DCAShort[DCAShort.length - 1]) + Number(DCAShort[DCAShort.length - 2]) + Number(DCAShort[DCAShort.length - 3]) + Number(DCAShort[DCAShort.length - 4]) + Number(DCAShort[DCAShort.length - 5])) / 5).toFixed(0);
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
            if (common.GetMomentSecond() == "59") {
                winrate = (countTP + countSL) == 0 ? 0 : Number(countTP / (countTP + countSL) * 100).toFixed(0);
                var wirateString = `${winrate} %`;
                const Ps = (await binance.FuturesPositionRisk('BTCUSDT'))[0];
                const markPrice = Number(Ps.markPrice).toFixed(2);
                var oc = ["_markPrice", "_tp", "_sl", "_winrate", "_isTrade", "_markPricePre", "_totalUSDT", "_longShortCond", "_checkTrend", "_isChangeDCA", "_isDCAPrice", "_DCAPrice", "_bestMarkPrice", "_DCALong", "_DCALongLength", "_DCALongStringPrice", "_DCALongTotalPrice_", "_DCALongTotalPrice", "_DCAShort", "_DCAShortLength", "_DCAShortStringPrice", "_DCAShortTotalPrice_", "_DCAShortTotalPrice", "time_in"];
                var nc = [
                    markPrice,
                    countTP,
                    countSL,
                    wirateString,
                    isTrade,
                    Number(markPricePre).toFixed(2),
                    Number(totalUSDT).toFixed(2),
                    longShortCond,
                    checkTrend,
                    isChangeDCA,
                    isDCAPrice,
                    DCAPrice,
                    bestMarkPrice,
                    DCALong.toString(),
                    DCALong.length,
                    DCALongStringPrice,
                    Number(DCALongTotalPrice_),
                    Number(DCALongTotalPrice),
                    DCAShort.toString(),
                    DCAShort.length,
                    DCAShortStringPrice,
                    Number(DCAShortTotalPrice_),
                    Number(DCAShortTotalPrice),
                    common.GetMoment()
                ];
                await telegram.logAlert(oc, nc);
            }
            process.env.Webhook1mud = Number(totalUSDT).toFixed(2);
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
                if (isTrade != 0) {
                    const Ps = (await binance.FuturesPositionRisk('BTCUSDT'))[0];
                    if (isTrade == 1) {
                        if (Number(markPricePre) + Number(DCALongTotalPrice) < Number(Ps.markPrice)) {
                            isTrade = 0;
                            const tpslUSDT = (((Number(Ps.markPrice) * 100 / markPricePre) - 100) / 100 * 1000).toFixed(2);
                            const iconLongShortAlert = '';
                            if (tpslUSDT > 0) {
                                iconLongShortAlert = '✅';
                                countTP = countTP + 1;
                            } else {
                                iconLongShortAlert = '❌';
                                countSL = countSL + 1;
                            }
                            totalUSDT = Number(totalUSDT) + Number(tpslUSDT);
                            await telegram.log(`${iconLongShortAlert}🟢BTCUSDT 1m Đóng lệnh sớm. DCALongTotalPrice: ${DCALongTotalPrice}. E: ${Number(markPricePre).toFixed(2)}; M: ${Number(Ps.markPrice).toFixed(2)}; TPSL: ${tpslUSDT} USDT; T: ${Number(totalUSDT).toFixed(2)} USDT`);
                            markPricePre = 0;
                        }
                    } else {
                        if (Number(markPricePre) + Number(DCAShortTotalPrice) > Number(Ps.markPrice)) {
                            isTrade = 0;
                            const tpslUSDT = ((100 - (Number(Ps.markPrice) * 100 / markPricePre)) / 100 * 1000).toFixed(2);
                            const iconLongShortAlert = '';
                            if (tpslUSDT > 0) {
                                iconLongShortAlert = '✅';
                                countTP = countTP + 1;
                            } else {
                                iconLongShortAlert = '❌';
                                countSL = countSL + 1;
                            }
                            totalUSDT = Number(totalUSDT) + Number(tpslUSDT);
                            await telegram.log(`${iconLongShortAlert}🔴BTCUSDT 1m Đóng lệnh sớm. DCAShortTotalPrice: ${DCAShortTotalPrice}. E: ${Number(markPricePre).toFixed(2)}; M: ${Number(Ps.markPrice).toFixed(2)}; TPSL: ${tpslUSDT} USDT; T: ${Number(totalUSDT).toFixed(2)} USDT`);
                            markPricePre = 0;
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
                } else {
                    if (isTrade == -1) {
                        isTrade = 1;
                        const tpslUSDT = ((100 - (Number(Ps.markPrice) * 100 / markPricePre)) / 100 * 1000).toFixed(2);
                        const iconLongShortAlert = '';
                        if (tpslUSDT > 0) {
                            iconLongShortAlert = '✅';
                            countTP = countTP + 1;
                        } else {
                            iconLongShortAlert = '❌';
                            countSL = countSL + 1;
                        }
                        totalUSDT = Number(totalUSDT) + Number(tpslUSDT);
                        await telegram.log(`${iconLongShortAlert}🔴BTCUSDT 1m. E: ${Number(markPricePre).toFixed(2)}; M: ${Number(Ps.markPrice).toFixed(2)}; TPSL: ${tpslUSDT} USDT; T: ${Number(totalUSDT).toFixed(2)} USDT`);
                        await telegram.log(`🟢BTCUSDT 1m. E: ${Number(Ps.markPrice).toFixed(2)}; T: ${Number(totalUSDT).toFixed(2)} USDT`);
                        markPricePre = Number(Ps.markPrice);
                    }
                }
            } else {
                if (isTrade == 0) {
                    isTrade = -1;
                    await telegram.log(`🔴BTCUSDT 1m. E: ${Number(Ps.markPrice).toFixed(2)}; T: ${Number(totalUSDT).toFixed(2)} USDT`);
                    markPricePre = Number(Ps.markPrice);
                } else {
                    if (isTrade == 1) {
                        isTrade = -1;
                        const tpslUSDT = (((Number(Ps.markPrice) * 100 / markPricePre) - 100) / 100 * 1000).toFixed(2);
                        const iconLongShortAlert = '';
                        if (tpslUSDT > 0) {
                            iconLongShortAlert = '✅';
                            countTP = countTP + 1;
                        } else {
                            iconLongShortAlert = '❌';
                            countSL = countSL + 1;
                        }
                        totalUSDT = Number(totalUSDT) + Number(tpslUSDT);
                        await telegram.log(`${iconLongShortAlert}🟢BTCUSDT 1m. E: ${Number(markPricePre).toFixed(2)}; M: ${Number(Ps.markPrice).toFixed(2)}; TPSL: ${tpslUSDT} USDT; T: ${Number(totalUSDT).toFixed(2)} USDT`);
                        await telegram.log(`🔴BTCUSDT 1m. E: ${Number(Ps.markPrice).toFixed(2)}; T: ${Number(totalUSDT).toFixed(2)} USDT`);
                        markPricePre = Number(Ps.markPrice);
                    }
                }
            }
        } catch (e) {
            await telegram.log(`⚠ ${e}`);
        }
    });
}

module.exports = { Main }
