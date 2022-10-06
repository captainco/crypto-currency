require('dotenv').config({ path: '../env/live.env' });
const telegram         = require("../telegram/telegram");
const WebSocket        = require("ws");
const binance          = require('./binance');
const common           = require('../common');
const sleep            = require('thread-sleep');
const _                = require("lodash");
var EmaSupportSeries   = 0;
var EmaTradeSeries     = 0;
var isTrade            = 0;
var isStart            = 0;
var markPricePre       = 0;
var totalUSDT          = 0;
var longShortCond      = '';
var checkTrend         = '';   

async function Main() {
    const EmaTrend = new WebSocket('wss://fstream.binance.com/ws/btcusdt@markPrice@1s');
    EmaTrend.on('message', async (event) => {
        try {
            EmaTradeSeries = await binance.EMAClose('BTCUSDT', '1h', 1);
        } catch (e) {
            await telegram.log(`⚠ ${e}`);
        }
    });

    const EmaSupport = new WebSocket('wss://fstream.binance.com/ws/btcusdt@markPrice@1s');
    EmaSupport.on('message', async (event) => {
        try {
            EmaSupportSeries = await binance.EMAClose('BTCUSDT', '1h', 2);
        } catch (e) {
            await telegram.log(`⚠ ${e}`);
        }
    });

    const UpdateEMA = new WebSocket('wss://fstream.binance.com/ws/btcusdt@markPrice@1s');
    UpdateEMA.on('message', async (event) => {
        try {
            longShortCond = EmaTradeSeries == EmaSupportSeries ? '' : EmaTradeSeries > EmaSupportSeries ? 'LONG' : 'SHORT';
            common.WriteConsoleLog(`EmaTradeSeries: ${EmaTradeSeries}; EmaSupportSeries: ${EmaSupportSeries} --> ${longShortCond}`);
        } catch (e) {
            await telegram.log(`⚠ ${e}`);
        }
    });

    const CheckTrade = new WebSocket('wss://fstream.binance.com/ws/btcusdt@markPrice@1s');
    CheckTrade.on('message', async (event) => {
        try {
            if (isStart == 1) {
                return;
            }
            if (checkTrend == '' && longShortCond != '') {
                checkTrend = longShortCond;
                isStart = 1;
            }
        } catch (e) {
            await telegram.log(`⚠ ${e}`);
        }
    });

    const Trading = new WebSocket('wss://fstream.binance.com/ws/btcusdt@markPrice@1s');
    Trading.on('message', async (event) => {
        try {
            if (isStart == 0) {
                return;   
            }
            if (longShortCond == checkTrend) {
                return;   
            }
            checkTrend = longShortCond;
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
}

module.exports = { Main }