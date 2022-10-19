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

var DCAPrice              = 0;
var DCAPriceTmp           = 0;
var totalDCAPrice         = 0;
var bestMarkPrice         = 0;

async function Main() {
    const updateBestMarkPrice = new WebSocket('wss://fstream.binance.com/ws/btcusdt@markPrice@1s');
    updateBestMarkPrice.on('message', async (event) => {
        try {
            if (isTrade == 0) {
                return;
            }
            
            const Ps = (await binance.FuturesPositionRisk('BTCUSDT'))[0];
            const markPrice = Number(Ps.markPrice);
            if
                (
                (((bestMarkPrice == 0) || (bestMarkPrice != 0 && bestMarkPrice < markPrice)) && isTrade == 1)
                || (((bestMarkPrice == 0) || (bestMarkPrice != 0 && bestMarkPrice > markPrice)) && isTrade == -1)
            ) {
                bestMarkPrice = markPrice;
                const iconLongShortAlert = isTrade == 1 ? '🟢' : '🔴';
                DCAPrice = Number(Number(bestMarkPrice) - Number(markPricePre)).toFixed(2);
                DCAPriceTmp = DCAPrice;
                await telegram.log(`✨${iconLongShortAlert}BTCUSDT 1m. DCAPrice hiện tại: ${DCAPrice}`);
            }
        } catch (e) {
            await telegram.log(`⚠ ${e}`);
        }
    });

    const DCAPriceSocket = new WebSocket('wss://fstream.binance.com/ws/btcusdt@markPrice@1s');
    DCAPriceSocket.on('message', async (event) => {
        try {
            if (DCAPriceTmp == 0) {
                return;
            }
            
            if (isTrade != isTradeTmp) {
                isTradeTmp = isTrade;
                const iconLongShortAlert = Number(DCAPriceTmp) > 0 ? '🟢' : '🔴';
                await telegram.log(`✨${iconLongShortAlert}✨BTCUSDT 1m. DCAPrice tốt nhất: ${DCAPriceTmp}`);
                DCAPriceTmp = 0;
            }
            // for (let index = 1; index <= 3; index++) {
            //     demo.push(index);
            // }
            // const _demo = demo;
            // demo = [];
            // const _demoMO = _demo.length > 5 ? _demo.length - 4 : 1;
            // var indexDemo = 0;
            // var dca = 0;
            // for (let index = _demo.length; index >= _demoMO; index--) {
            //     indexDemo++;
            //     demo.push(index);
            //     dca = dca + index;
            // }
            // dca = Number(dca/indexDemo).toFixed(0);
            // console.log(indexDemo);
            // console.log(demo);
            // console.log(dca);
        } catch (e) {
            await telegram.log(`⚠ ${e}`);
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