require('dotenv').config({ path: '../env/live.env' });
const telegram         = require("../telegram/telegram");
const WebSocket        = require("ws");
const binance          = require('./binance');
const common           = require('../common');
const sleep            = require('thread-sleep');
const _                = require("lodash");
var closeSeries        = 0;
var openSeries         = 0;
var isTrade            = 0;
var markPricePre       = 0;
var totalUSDT          = 0;
var longShortCond      = '';

async function Main() {
    const openSeriesUpdate = new WebSocket('wss://fstream.binance.com/ws/btcusdt@markPrice@1s');
    openSeriesUpdate.on('message', async (event) => {
        try {
            openSeries = await binance.EMAOpen('BTCUSDT', '1m', 60);
        } catch (e) {
            await telegram.log(`⚠ ${e}`);
        }
    });

    const closeSeriesUpdate = new WebSocket('wss://fstream.binance.com/ws/btcusdt@markPrice@1s');
    closeSeriesUpdate.on('message', async (event) => {
        try {
            closeSeries = await binance.EMAClose('BTCUSDT', '1m', 60);
        } catch (e) {
            await telegram.log(`⚠ ${e}`);
        }
    });

    const UpdateEMA = new WebSocket('wss://fstream.binance.com/ws/btcusdt@markPrice@1s');
    UpdateEMA.on('message', async (event) => {
        try {
            if (common.GetMomentSecond() != '59') {
                return;
            }
            longShortCond = closeSeries == openSeries ? '' : closeSeries > openSeries ? 'LONG' : 'SHORT';
            common.WriteConsoleLog(`openSeries: ${openSeries}; closeSeries: ${closeSeries} --> ${longShortCond}`);
        } catch (e) {
            await telegram.log(`⚠ ${e}`);
        }
    });

    const Trading = new WebSocket('wss://fstream.binance.com/ws/btcusdt@markPrice@1s');
    Trading.on('message', async (event) => {
        try {

            if (common.GetMomentSecond() != '59') {
                return;
            }

            if (longShortCond == '') {
                return;
            }

            const Ps = (await binance.FuturesPositionRisk('BTCUSDT'))[0];
            if (longShortCond == 'LONG') {
                if (isTrade == 0) {
                    isTrade = 1;
                    await telegram.log(`🟢BTCUSDT. E: ${Number(Ps.markPrice).toFixed(2)}; T: ${Number(totalUSDT).toFixed(2)} USDT`);
                    markPricePre = Number(Ps.markPrice);
                } else {
                    if (isTrade == -1) {
                        isTrade = 1;
                        const tpslUSDT = ((100 - (Number(Ps.markPrice) * 100 / markPricePre)) / 100 * 1000).toFixed(2);
                        const iconLongShortAlert = tpslUSDT > 0 ? '✅' : '❌';
                        totalUSDT = Number(totalUSDT) + Number(tpslUSDT);
                        await telegram.log(`${iconLongShortAlert}🔴BTCUSDT. E: ${Number(markPricePre).toFixed(2)}; M: ${Number(Ps.markPrice).toFixed(2)}; TPSL: ${tpslUSDT} USDT; T: ${Number(totalUSDT).toFixed(2)} USDT`);
                        await telegram.log(`🟢BTCUSDT. E: ${Number(Ps.markPrice).toFixed(2)}; T: ${Number(totalUSDT).toFixed(2)} USDT`);
                        markPricePre = Number(Ps.markPrice);
                    }
                }
            } else {
                if (isTrade == 0) {
                    isTrade = -1;
                    await telegram.log(`🔴BTCUSDT. E: ${Number(Ps.markPrice).toFixed(2)}; T: ${Number(totalUSDT).toFixed(2)} USDT`);
                    markPricePre = Number(Ps.markPrice);
                } else {
                    if (isTrade == 1) {
                        isTrade = -1;
                        const tpslUSDT = (((Number(Ps.markPrice) * 100 / markPricePre) - 100) / 100 * 1000).toFixed(2);
                        const iconLongShortAlert = tpslUSDT > 0 ? '✅' : '❌';
                        totalUSDT = Number(totalUSDT) + Number(tpslUSDT);
                        await telegram.log(`${iconLongShortAlert}🟢BTCUSDT. E: ${Number(markPricePre).toFixed(2)}; M: ${Number(Ps.markPrice).toFixed(2)}; TPSL: ${tpslUSDT} USDT; T: ${Number(totalUSDT).toFixed(2)} USDT`);
                        await telegram.log(`🔴BTCUSDT. E: ${Number(Ps.markPrice).toFixed(2)}; T: ${Number(totalUSDT).toFixed(2)} USDT`);
                        markPricePre = Number(Ps.markPrice);
                    }
                }
            }
        } catch (e) {
            await telegram.log(`⚠ ${e}`);
        }
    });

    













    // const AlertTrading = new WebSocket('wss://fstream.binance.com/ws/btcusdt@markPrice@1s');
    // AlertTrading.on('message', async (event) => {
    //     try {
    //         const result = JSON.parse(event);
    //         if (result.o.s != 'BTCUSDT') {
    //             return;
    //         }
    //         const totalValue = result.o.q * result.o.ap;
    //         const iconLongShort = result.o.S == 'BUY' ? '🔴': '🟢';
    //         const rsi = await binance.RSI('BTCUSDT', '1m');
    //         const price = await binance.SpotPositionRisk();
    //         const priceSpot = Number(price.BTCUSDT);
    //         const Ps = (await binance.FuturesPositionRisk('BTCUSDT'))[0];
    //         const markPrice = Number(Ps.markPrice);
    //         const spFt = (priceSpot - markPrice).toFixed(2);
    //         common.WriteConsoleLog(common.FormatNumberToString(totalValue));
    //         if ((rsi < 30 || rsi > 70) && totalValue > 200000) {
    //             await telegram.logAlert('BTCUSDT', rsi, iconLongShort, common.FormatNumberToString(totalValue), priceSpot.toFixed(2), markPrice.toFixed(2), spFt);
    //         }
    //     } catch (e) {
    //         await telegram.log(`⚠ ${e}`);
    //     }
    // });

    // const AlertTradingAndRSI = new WebSocket('wss://fstream.binance.com/ws/!forceOrder@arr');
    // AlertTradingAndRSI.on('message', async (event) => {
    //     try {
    //         const result = JSON.parse(event);
    //         if (result.o.s != 'BTCUSDT') {
    //             return;
    //         }
    //         const totalValue = result.o.q * result.o.ap;
    //         const iconLongShort = result.o.S == 'BUY' ? '✅🔴': '✅🟢';
    //         const rsi = await binance.RSI('BTCUSDT', '1m');
    //         const price = await binance.SpotPositionRisk();
    //         const priceSpot = Number(price.BTCUSDT);
    //         const Ps = (await binance.FuturesPositionRisk('BTCUSDT'))[0];
    //         const markPrice = Number(Ps.markPrice);
    //         const spFt = (priceSpot - markPrice).toFixed(2);
    //         if (totalValue > 200000) {
    //             await telegram.logAlert('BTCUSDT', rsi, iconLongShort, common.FormatNumberToString(totalValue), priceSpot.toFixed(2), markPrice.toFixed(2), spFt);
    //         }
    //     } catch (e) {
    //         await telegram.log(`⚠ ${e}`);
    //     }
    // });

    // const btcusdt = new WebSocket('wss://fstream.binance.com/ws/btcusdt@markPrice@1s');
    // btcusdt.on('message', async (event) => {
    //     try {
    //         if (common.GetMomentSecond() == 59) {
    //             const rsi = await binance.RSI('BTCUSDT', '1m');
    //             const price = await binance.SpotPositionRisk();
    //             const priceSpot = Number(price.BTCUSDT);
    //             const Ps = (await binance.FuturesPositionRisk('BTCUSDT'))[0];
    //             const markPrice = Number(Ps.markPrice);
    //             const spFt = (priceSpot - markPrice).toFixed(2);
    //             if (rsi < 30 || rsi > 70) {
    //                 await telegram.logAlert('BTCUSDT', rsi, '⚪', 'Không xác định', priceSpot.toFixed(2), markPrice.toFixed(2), spFt);
    //             }
    //         }
    //     } catch (e) {
    //         await telegram.log(`⚠ ${e}`);
    //     }
    // });

    // const TradeVol = new WebSocket('wss://fstream.binance.com/ws/btcusdt@markPrice@1s');
    // TradeVol.on('message', async (event) => {
    //     try {
    //         const price = await binance.SpotPositionRisk();
    //         const priceSpot = Number(price.BTCUSDT);
    //         const Ps = (await binance.FuturesPositionRisk('BTCUSDT'))[0];
    //         const markPrice = Number(Ps.markPrice);
    //         const spFt = (priceSpot - markPrice).toFixed(2);
    //         if (spFt < -5 || spFt > 20) {
    //             await telegram.logAlert('BTCUSDT', 'TradeVol', '✅', 'Không xác định', priceSpot.toFixed(2), markPrice.toFixed(2), spFt);
    //         }
    //     } catch (e) {
    //         await telegram.log(`⚠ ${e}`);
    //     }
    // });
}

module.exports = { Main }