require('dotenv').config({ path: '../env/live.env' });
const telegram                                 = require("../telegram/telegram");
const WebSocket                                = require("ws");
const binance                                  = require('./binance');
const sleep                                    = require('thread-sleep');
const common                                   = require('../common');
process.env.envBinanceFunctionLiquidBOT        = process.env.envTelegramBotStatus;
process.env.envBinanceFunctionLiquidOpenTrade  = 'wss://fstream.binance.com/ws/btcusdt@forceOrder';
process.env.envBinanceFunctionLiquidCloseTrade = 'wss://fstream.binance.com/ws/btcusdt@markPrice@1s';
process.env.envBinanceFunctionLiquidAmount     = 50000;

async function Main() {

    const CreateLinkTrade = new WebSocket('wss://fstream.binance.com/ws/btcusdt@markPrice@1s');
    CreateLinkTrade.on('message', async (event) => {
        process.env.envBinanceFunctionLiquidOpenTrade  = `wss://fstream.binance.com/ws/${process.env.envBinanceFunctionSymbol.toLocaleLowerCase()}@forceOrder`;
        process.env.envBinanceFunctionLiquidCloseTrade = `wss://fstream.binance.com/ws/${process.env.envBinanceFunctionSymbol.toLocaleLowerCase()}@markPrice@1s`;
    });

    const OpenTrading = new WebSocket(process.env.envBinanceFunctionLiquidOpenTrade);
    OpenTrading.on('message', async (event) => {
        try {
            /*Socket*/
            let result = JSON.parse(event);
            let totalValue = result.o.q * result.o.ap;
            let symbol = result.o.s;
            let sideMy = result.o.S == 'BUY' ? 'SELL' : 'BUY';

            /*Nằm trong giá thanh lý setup thì vào lệnh*/
            if (totalValue > Number(process.env.envBinanceFunctionLiquidAmount) && symbol == process.env.envBinanceFunctionSymbol) {

                /*Kiểm tra bot xem có cho vào lệnh ko?*/
                if (process.env.envTelegramBotStatus == "1") {

                    /*Kiểm tra xem có vị thế ko? Nếu ko có thì vào*/
                    const checkPs = (await binance.FuturesPositionRisk(symbol))[0];
                    if (checkPs.positionAmt == 0) {
                        
                    }
                }

                // if (ctx.liquidTrade) {
                //     const myPosition = await lib.fetchPositionBySymbol('ETHUSDT');
                //     if (_.isEmpty(myPosition)) {
                //         let obj = { symbol, entryPrice: 'Liquid Price', amount: `Liquid: ${lib.kFormatter(totalValue)}` };
                //         let quantity = 0.5;
                //         if (totalValue > 100000 && totalValue < 200000) {
                //             quantity = 0.8;
                //         } else if (totalValue > 200000 && totalValue < 600000) {
                //             quantity = 1;
                //         } else if (totalValue > 700000) {
                //             quantity = 1.3;
                //         }
                //         await lib.openPositionByType(side, obj, quantity, 100);
                //     }
                // } else {
                //     let liquidTradeMsg = `${side} #${symbol} at ${averagePrice}`;
                //     await lib.sendMessage(liquidTradeMsg)
                // }
            }
        } catch (e) {
            console.log(e);
        }
    });

    const CloseTrading = new WebSocket(process.env.envBinanceFunctionLiquidCloseTrade);
    CloseTrading.on('message', async (event) => {
        try {
            if (ctx.autoTP) {
                let positions = await lib.fetchPositions();
                ctx.myPositions = positions;
                if (!_.isEmpty(positions)) {
                    const position = _.find(positions, { symbol: 'ETHUSDT' });
                    if (_.isEmpty(position)) {
                        return // tìm k có vị thế BTC thì bỏ
                    }
                    const amt = Math.abs(position.positionAmt);
                    if (position.positionAmt > 0) {
                        // đang long
                        if ((position.markPrice - position.entryPrice) >= ctx.minTP) {
                            await lib.closePositionByType('LONG', {
                                symbol: position.symbol,
                                unRealizedProfit: position.unRealizedProfit
                            }, amt, true)
                        }
                    } else {
                        // đang short
                        if ((position.entryPrice - position.markPrice) >= ctx.minTP) {
                            await lib.closePositionByType('SHORT', {
                                symbol: position.symbol,
                                unRealizedProfit: position.unRealizedProfit
                            }, amt, true)
                        }
                    }
                }
            }
        } catch (e) {
            console.log(e);
        }
    });
}

module.exports = { Main }