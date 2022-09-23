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
            const symbol = result.o.s;
            const iconLongShort = result.o.S == 'BUY' ? '🟢': '🔴';
            const rsi = await binance.RSI(symbol, '1m');
            if (rsi < 30 || rsi > 70) {
                const price = await binance.SpotPositionRisk();
                const Ps = (await binance.FuturesPositionRisk(symbol))[0];
                const priceSpot = price.BTCUSDT;
                const spFt = priceSpot - Ps.markPrice;
                await telegram.logAlert(symbol, rsi, iconLongShort, common.ConvertToPositiveNumber(totalValue), priceSpot, Ps.markPrice, spFt);
            }
        } catch (e) {
            await telegram.log(`⚠ ${e}`);
        }
    });

    const btcusdt = new WebSocket('wss://fstream.binance.com/ws/btcusdt@markPrice@1s');
    btcusdt.on('message', async (event) => {
        try {
            if (common.GetMomentSecond() == 59) {
                const rsi = await binance.RSI('BTCUSDT', '1m');
                if (rsi < 30 || rsi > 70) {
                    const price = await binance.SpotPositionRisk();
                    const Ps = (await binance.FuturesPositionRisk('BTCUSDT'))[0];
                    const priceSpot = price.BTCUSDT;
                    const spFt = priceSpot - Ps.markPrice;
                    await telegram.logAlert('BTCUSDT', rsi, '⚪', 'Chưa xác định', priceSpot, Ps.markPrice, spFt);
                }
            }
        } catch (e) {
            await telegram.log(`⚠ ${e}`);
        }
    });
}

module.exports = { Main }