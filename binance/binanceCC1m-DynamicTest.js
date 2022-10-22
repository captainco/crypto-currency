require('dotenv').config({ path: '../env/live.env' });
const telegram            = require("../telegram/telegram");
const WebSocket           = require("ws");
const binance             = require('./binance');
const common              = require('../common');

var isTrade               = 0;
var isTradeTmp            = 0;
var markPricePre          = 0;
var markPricePreTmp       = 0;
var totalUSDT             = 0;
var longShortCond         = '';
var checkTrend            = '';

var isChangeDCA           = '';
var isDCAPrice            = 0;
var DCAPrice              = 0;
var bestMarkPrice         = 0;

var DCALong               = [];
var DCALongStringPrice    = '';
var DCALongTotalPrice     = 0;

var DCAShort              = [];

async function Main() {
    const updateBestMarkPrice = new WebSocket('wss://fstream.binance.com/ws/btcusdt@markPrice@1s');
    updateBestMarkPrice.on('message', async (event) => {
        try {
            if (process.env.Webhook1m == '' || isTrade == 0) {
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
                if (
                    (((bestMarkPrice == 0) || (bestMarkPrice != 0 && bestMarkPrice < markPrice)) && isTrade == 1)
                    || (((bestMarkPrice == 0) || (bestMarkPrice != 0 && bestMarkPrice > markPrice)) && isTrade == -1)
                ){
                    bestMarkPrice = markPrice;
                    DCAPrice = Number(Number(bestMarkPrice) - Number(markPricePre)).toFixed(2);
                }
            } else {
                if (DCAPrice > 10 || DCAPrice < -10) {
                    const NumberDCAPrice = Number(DCAPrice);
                    //Push to array
                    if (NumberDCAPrice > 0) {
                        DCALong.push(NumberDCAPrice);
                    } else {
                        DCAShort.push(NumberDCAPrice);
                    }
                }
                isChangeDCA = process.env.Webhook1m;
            }
        } catch (e) {
            console.log(e);
        }
    });

    const reportDCALongPrice = new WebSocket('wss://fstream.binance.com/ws/btcusdt@markPrice@1s');
    reportDCALongPrice.on('message', async (event) => {
        try {
            if (common.GetMomentSecond() == "59") {
                await telegram.log(`✨DCALong.length -> ${DCALong.length}`);
                await telegram.log(`✨DCALongStringPrice -> ${DCALongStringPrice}`);
                await telegram.log(`✨DCALongTotalPrice -> ${DCALongTotalPrice}`);
            }
        } catch (e) {
            console.log(e);
        }
    });

    const UpdateDCALong = new WebSocket('wss://fstream.binance.com/ws/btcusdt@markPrice@1s');
    UpdateDCALong.on('message', async (event) => {
        try {
            if (DCALong.length > 9) {
                const DCALongLMax = DCALong.length;
                const DCALongLMin = DCALongLMax - 10;
                DCALongStringPrice = '';
                for (let index = DCALongLMax; index >= DCALongLMin; index--) {
                    DCALongStringPrice = `${DCALong[index]};`;
                    DCALongTotalPrice = Number(DCALongTotalPrice + (DCALong[index]/10)).toFixed(2);
                }
            }
            DCALongTotalPrice = DCALongTotalPrice < 10 ? 10 : DCALongTotalPrice;
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
            if (process.env.Webhook1m == '' || process.env.Webhook1m == checkTrend) {
                return;
            }
            checkTrend = process.env.Webhook1m;
            longShortCond = process.env.Webhook1m == 'buy' ? 'LONG' : 'SHORT';
            const Ps = (await binance.FuturesPositionRisk('BTCUSDT'))[0];
            if (longShortCond == 'LONG') {
                if (isTrade == 0) {
                    isTrade = 1;
                    //await telegram.log(`🟢BTCUSDT 1m. E: ${Number(Ps.markPrice).toFixed(2)}; T: ${Number(totalUSDT).toFixed(2)} USDT`);
                    markPricePre = Number(Ps.markPrice);
                } else {
                    if (isTrade == -1) {
                        isTrade = 1;
                        const tpslUSDT = ((100 - (Number(Ps.markPrice) * 100 / markPricePre)) / 100 * 1000).toFixed(2);
                        const iconLongShortAlert = tpslUSDT > 0 ? '✅' : '❌';
                        totalUSDT = Number(totalUSDT) + Number(tpslUSDT);
                        //await telegram.log(`${iconLongShortAlert}🔴BTCUSDT 1m. E: ${Number(markPricePre).toFixed(2)}; M: ${Number(Ps.markPrice).toFixed(2)}; TPSL: ${tpslUSDT} USDT; T: ${Number(totalUSDT).toFixed(2)} USDT`);
                        //await telegram.log(`🟢BTCUSDT 1m. E: ${Number(Ps.markPrice).toFixed(2)}; T: ${Number(totalUSDT).toFixed(2)} USDT`);
                        markPricePre = Number(Ps.markPrice);
                    }
                }
            } else {
                if (isTrade == 0) {
                    isTrade = -1;
                    //await telegram.log(`🔴BTCUSDT 1m. E: ${Number(Ps.markPrice).toFixed(2)}; T: ${Number(totalUSDT).toFixed(2)} USDT`);
                    markPricePre = Number(Ps.markPrice);
                } else {
                    if (isTrade == 1) {
                        isTrade = -1;
                        const tpslUSDT = (((Number(Ps.markPrice) * 100 / markPricePre) - 100) / 100 * 1000).toFixed(2);
                        const iconLongShortAlert = tpslUSDT > 0 ? '✅' : '❌';
                        totalUSDT = Number(totalUSDT) + Number(tpslUSDT);
                        //await telegram.log(`${iconLongShortAlert}🟢BTCUSDT 1m. E: ${Number(markPricePre).toFixed(2)}; M: ${Number(Ps.markPrice).toFixed(2)}; TPSL: ${tpslUSDT} USDT; T: ${Number(totalUSDT).toFixed(2)} USDT`);
                        //await telegram.log(`🔴BTCUSDT 1m. E: ${Number(Ps.markPrice).toFixed(2)}; T: ${Number(totalUSDT).toFixed(2)} USDT`);
                        markPricePre = Number(Ps.markPrice);
                    }
                }
            }
        } catch (e) {
            await telegram.log(`⚠ ${e}`);
        }
    });

    // const TradingSoon = new WebSocket('wss://fstream.binance.com/ws/btcusdt@markPrice@1s');
    // TradingSoon.on('message', async (event) => {
    //     try {
    //         if (isTrade == 0 || totalDCAPrice == 0) {
    //             return;
    //         }

    //         const Ps = (await binance.FuturesPositionRisk('BTCUSDT'))[0];
    //         if (isTrade = 1) {
    //             if (Number(markPricePre) + totalDCAPrice < Number(Ps.markPrice)) {
    //                 isTrade = 0;
    //                 const tpslUSDT = (((Number(Ps.markPrice) * 100 / markPricePre) - 100) / 100 * 1000).toFixed(2);
    //                 const iconLongShortAlert = tpslUSDT > 0 ? '✅' : '❌';
    //                 totalUSDT = Number(totalUSDT) + Number(tpslUSDT);
    //                 await telegram.log(`${iconLongShortAlert}🟢BTCUSDT 1m Đóng lệnh sớm. DCAPrice: ${totalDCAPrice}. E: ${Number(markPricePre).toFixed(2)}; M: ${Number(Ps.markPrice).toFixed(2)}; TPSL: ${tpslUSDT} USDT; T: ${Number(totalUSDT).toFixed(2)} USDT`);
    //                 markPricePre = 0;
    //             }
    //         } else {
    //             if (Number(markPricePre) - totalDCAPrice > Number(Ps.markPrice)) {
    //                 isTrade = 0;
    //                 const tpslUSDT = ((100 - (Number(Ps.markPrice) * 100 / markPricePre)) / 100 * 1000).toFixed(2);
    //                 const iconLongShortAlert = tpslUSDT > 0 ? '✅' : '❌';
    //                 totalUSDT = Number(totalUSDT) + Number(tpslUSDT);
    //                 await telegram.log(`${iconLongShortAlert}🔴BTCUSDT 1m Đóng lệnh sớm. DCAPrice: ${totalDCAPrice}. E: ${Number(markPricePre).toFixed(2)}; M: ${Number(Ps.markPrice).toFixed(2)}; TPSL: ${tpslUSDT} USDT; T: ${Number(totalUSDT).toFixed(2)} USDT`);
    //                 markPricePre = 0;
    //             }
    //         }
    //     } catch (e) {
    //         await telegram.log(`⚠ ${e}`);
    //     }
    // });
}

module.exports = { Main }