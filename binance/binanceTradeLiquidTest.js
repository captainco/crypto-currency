require('dotenv').config({ path: '../env/live.env' });
const telegram                                 = require("../telegram/telegram");
const WebSocket                                = require("ws");
const binance                                  = require('./binance');
const common                                   = require('../common');
const sleep                                    = require('thread-sleep');
const _                                        = require("lodash");
process.env.envBinanceFunctionLiquidOpenTrade  = `wss://fstream.binance.com/ws/${process.env.envBinanceFunctionSymbol.toLocaleLowerCase()}@forceOrder`;
process.env.envBinanceFunctionLiquidCloseTrade = `wss://fstream.binance.com/ws/${process.env.envBinanceFunctionSymbol.toLocaleLowerCase()}@markPrice@1s`;
var liquidTPSLVol                              = 5;
var fakeTotal                                  = 0;
var isPs                                       = 0;
var _entryPrice                                = 0;

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
                    if (isPs == 0) {
                        
                        /*Fake vào lệnh*/
                        //await binance.FuturesMarketBuySell(symbol, Number(process.env.envBinanceFunctionPrice), side);
                        if (process.env.envBinanceFunctionLiquidTrade == "0") {
                            isPs = side == "BUY" ? 1 : -1;    
                        }
                        else {
                            isPs = side == "BUY" ? -1 : 1;
                        }
                        
                        sleep(100);

                        /*Alert*/
                        const PsAlert = (await binance.FuturesPositionRisk(symbol))[0];
                        //const iconLongShort = PsAlert.positionAmt > 0 ? "🟢" : "🔴";
                        const iconLongShort = isPs > 0 ? "🟢" : "🔴";
                        _entryPrice = PsAlert.markPrice;
                        await telegram.log(`${iconLongShort} ${symbol} ${process.env.envBinanceFunctionLeverage}x|${process.env.envBinanceFunctionPrice} -> E: ${_entryPrice}; LQ: ${common.FormatNumberToString(totalValue)}`);
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
            const Ps = (await binance.FuturesPositionRisk(symbol))[0];

            //if (!_.isEmpty(Ps)) {
            if (isPs != 0 && _entryPrice != 0) {

                /*Kèo long*/
                if (isPs > 0) {

                    const unRealizedProfit = ((((Ps.markPrice * 100 / _entryPrice) - 100) / 100) * Number(process.env.envBinanceFunctionPrice) * Number(process.env.envBinanceFunctionLeverage)).toFixed(2);
                    const iconTPSL = unRealizedProfit > 0 ? "✅" : "❌";

                    let priceDiff = Ps.markPrice - _entryPrice;
                    if (priceDiff >= liquidTPSLVol || priceDiff < liquidTPSLVol * -2) {
                        //await binance.FuturesMarketBuySell(symbol, Ps.positionAmt, "SELL");
                        isPs = 0;
                        sleep(100);
                        fakeTotal = (Number(fakeTotal) + Number(unRealizedProfit)).toFixed(2);
                        await telegram.log(`${iconTPSL}🟢 ${symbol} ${process.env.envBinanceFunctionLeverage}x|${process.env.envBinanceFunctionPrice} -> E: ${_entryPrice}; M: ${Ps.markPrice}; PD: ${priceDiff.toFixed(2)}; U: ${unRealizedProfit} USDT; TOTAL: ${fakeTotal} USDT`);
                        _entryPrice = 0;
                    }
                }
                /*Kèo short*/
                else {
                    
                    const unRealizedProfit = (((100 - (Ps.markPrice * 100 / _entryPrice)) / 100) * Number(process.env.envBinanceFunctionPrice) * Number(process.env.envBinanceFunctionLeverage)).toFixed(2);
                    const iconTPSL = unRealizedProfit > 0 ? "✅" : "❌";

                    let priceDiff = _entryPrice - Ps.markPrice;
                    if (priceDiff >= liquidTPSLVol || priceDiff < liquidTPSLVol * -2) {
                        //await binance.FuturesMarketBuySell(symbol, Ps.positionAmt, "BUY");
                        isPs = 0;
                        sleep(100);
                        fakeTotal = (Number(fakeTotal) + Number(unRealizedProfit)).toFixed(2);
                        await telegram.log(`${iconTPSL}🔴 ${symbol} ${process.env.envBinanceFunctionLeverage}x|${process.env.envBinanceFunctionPrice} -> E: ${_entryPrice}; M: ${Ps.markPrice}; PD: ${priceDiff.toFixed(2)}; U: ${unRealizedProfit} USDT; TOTAL: ${fakeTotal} USDT`);
                        _entryPrice = 0;
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