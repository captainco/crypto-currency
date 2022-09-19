require('dotenv').config({ path: '../env/live.env' });
const telegram                                 = require("../telegram/telegram");
const WebSocket                                = require("ws");
const binance                                  = require('./binance');
const common                                   = require('../common');
const sleep                                    = require('thread-sleep');
const _                                        = require("lodash");
process.env.envBinanceFunctionLiquidOpenTrade  = `wss://fstream.binance.com/ws/${process.env.envBinanceFunctionSymbol.toLocaleLowerCase()}@forceOrder`;
process.env.envBinanceFunctionLiquidCloseTrade = `wss://fstream.binance.com/ws/${process.env.envBinanceFunctionSymbol.toLocaleLowerCase()}@markPrice@1s`;
var liquidTPSLVol                              = 10;

async function Main() {
    /*wss://fstream.binance.com/ws/!forceOrder@arr*/
    const AlertTrading = new WebSocket(process.env.envBinanceFunctionLiquidOpenTrade);
    AlertTrading.on('message', async (event) => {
        try {
            /*Socket*/
            let result = JSON.parse(event);
            let totalValue = result.o.q * result.o.ap;
            let symbol = result.o.s;

            /*Thông báo thanh lý*/
            if (process.env.envBinanceFunctionLiquidAlert == "1") {
                if (symbol == process.env.envBinanceFunctionSymbol && totalValue > Number(process.env.envBinanceFunctionLiquidVolAlert)) {
                    const iconLongShort = (result.o.S == "BUY") ? "🟢" : "🔴";
                    await telegram.log(`🤖 ${symbol} thanh lý ${iconLongShort}: ${common.FormatNumberToString(totalValue)}`);
                }
            }
        } catch (e) {
            await telegram.log(`⚠ ${e}`);
        }
    });

    const OpenTrading = new WebSocket(process.env.envBinanceFunctionLiquidOpenTrade);
    OpenTrading.on('message', async (event) => {
        try {
            /*Socket*/
            let result = JSON.parse(event);
            let totalValue = result.o.q * result.o.ap;
            let symbol = result.o.s;
            let side = result.o.S == 'BUY' ? 'SELL' : 'BUY';

            /*Nằm trong giá thanh lý setup thì vào lệnh*/
            if (totalValue > Number(process.env.envBinanceFunctionLiquidAmount) && symbol == process.env.envBinanceFunctionSymbol) {

                /*Kiểm tra bot xem có cho vào lệnh ko?*/
                if (process.env.envTelegramBotStatus == "1") {

                    /*Kiểm tra xem có vị thế ko? Nếu ko có thì vào*/
                    const Ps = await binance.FuturesCheckPositionRisk(symbol);
                    if (_.isEmpty(Ps)) {
                        await binance.FuturesMarketBuySell(symbol, Number(process.env.envBinanceFunctionPrice), side);

                        /*Alert*/
                        const PsAlert = await binance.FuturesCheckPositionRisk(symbol);
                        const iconLongShort = PsAlert.positionAmt > 0 ? "🟢" : "🔴";
                        await telegram.log(`${iconLongShort} ${symbol} ${process.env.envBinanceFunctionLeverage}x|${PsAlert.positionAmt} -> E: ${PsAlert.entryPrice}; LQ: ${common.FormatNumberToString(totalValue)}`);
                    }
                }
            }
        } catch (e) {
            await telegram.log(`⚠ ${e}`);
        }
    });

    const CloseTrading = new WebSocket(process.env.envBinanceFunctionLiquidCloseTrade);
    CloseTrading.on('message', async (event) => {
        try {
            /*Kiểm tra xem có lệnh không? Nếu có thì sẽ cắt lãi hoặc lỗ*/
            const symbol = process.env.envBinanceFunctionSymbol;
            const Ps = await binance.FuturesCheckPositionRisk(symbol);

            if (!_.isEmpty(Ps)) {

                const iconTPSL = Ps.unRealizedProfit > 0 ? "✅" : "❌";

                /*Kèo long*/
                if (Ps.positionAmt > 0) {

                    let priceDiff = Ps.markPrice - Ps.entryPrice;
                    if (priceDiff >= liquidTPSLVol || priceDiff < liquidTPSLVol * -2) {
                        await binance.FuturesMarketBuySell(symbol, Ps.positionAmt, "SELL");
                        await telegram.log(`${iconTPSL}🟢 ${symbol} ${process.env.envBinanceFunctionLeverage}x|${Ps.positionAmt} -> E: ${Ps.entryPrice}; M: ${Ps.markPrice}; PD: ${priceDiff}; ${Ps.unRealizedProfit}USDT`);
                    }
                }
                /*Kèo short*/
                else {

                    let priceDiff = Ps.entryPrice - Ps.markPrice;
                    if (priceDiff >= liquidTPSLVol || priceDiff < liquidTPSLVol * -2) {
                        await binance.FuturesMarketBuySell(symbol, Ps.positionAmt, "BUY");
                        await telegram.log(`${iconTPSL}🔴 ${symbol} ${process.env.envBinanceFunctionLeverage}x|${Ps.positionAmt} -> E: ${Ps.entryPrice}; M: ${Ps.markPrice}; PD: ${priceDiff}; ${Ps.unRealizedProfit}USDT`);
                    }
                }
            }

            sleep(200);
        } catch (e) {
            await telegram.log(`⚠ ${e}`);
        }
    });
}

module.exports = { Main }