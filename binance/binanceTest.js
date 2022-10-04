require('dotenv').config({ path: '../env/live.env' });
const telegram                                 = require("../telegram/telegram");
const WebSocket                                = require("ws");
const binance                                  = require('./binance');
const common                                   = require('../common');
const sleep                                    = require('thread-sleep');
const _                                        = require("lodash");

async function Main() {
    const AlertTrading = new WebSocket('wss://fstream.binance.com/ws/!forceOrder@arr');
    AlertTrading.on('message', async (event) => {
        try {
            const result = JSON.parse(event);
            if (result.o.s != 'BTCUSDT') {
                return;
            }
            const totalValue = result.o.q * result.o.ap;
            const iconLongShort = result.o.S == 'BUY' ? '🔴': '🟢';
            const rsi = await binance.RSI('BTCUSDT', '1m');
            const price = await binance.SpotPositionRisk();
            const priceSpot = Number(price.BTCUSDT);
            const Ps = (await binance.FuturesPositionRisk('BTCUSDT'))[0];
            const markPrice = Number(Ps.markPrice);
            const spFt = (priceSpot - markPrice).toFixed(2);
            common.WriteConsoleLog(common.FormatNumberToString(totalValue));
            if ((rsi < 30 || rsi > 70) && totalValue > 200000) {
                await telegram.logAlert('BTCUSDT', rsi, iconLongShort, common.FormatNumberToString(totalValue), priceSpot.toFixed(2), markPrice.toFixed(2), spFt);
            }
        } catch (e) {
            await telegram.log(`⚠ ${e}`);
        }
    });

    const AlertTradingAndRSI = new WebSocket('wss://fstream.binance.com/ws/!forceOrder@arr');
    AlertTradingAndRSI.on('message', async (event) => {
        try {
            const result = JSON.parse(event);
            if (result.o.s != 'BTCUSDT') {
                return;
            }
            const totalValue = result.o.q * result.o.ap;
            const iconLongShort = result.o.S == 'BUY' ? '✅🔴': '✅🟢';
            const rsi = await binance.RSI('BTCUSDT', '1m');
            const price = await binance.SpotPositionRisk();
            const priceSpot = Number(price.BTCUSDT);
            const Ps = (await binance.FuturesPositionRisk('BTCUSDT'))[0];
            const markPrice = Number(Ps.markPrice);
            const spFt = (priceSpot - markPrice).toFixed(2);
            if (totalValue > 200000) {
                await telegram.logAlert('BTCUSDT', rsi, iconLongShort, common.FormatNumberToString(totalValue), priceSpot.toFixed(2), markPrice.toFixed(2), spFt);
            }
        } catch (e) {
            await telegram.log(`⚠ ${e}`);
        }
    });

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