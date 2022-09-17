require('dotenv').config({ path: '../env/live.env' });
const telegram                                 = require("../telegram/telegram");
const WebSocket                                = require("ws");
const binance                                  = require('./binance');
const common                                   = require('../common');
process.env.envBinanceFunctionLiquidOpenTrade  = 'wss://fstream.binance.com/ws/btcusdt@forceOrder';
process.env.envBinanceFunctionLiquidCloseTrade = 'wss://fstream.binance.com/ws/btcusdt@markPrice@1s';

async function Main() {

    const CreateLinkTrade = new WebSocket('wss://fstream.binance.com/ws/btcusdt@markPrice@1s');
    CreateLinkTrade.on('message', async (event) => {
        process.env.envBinanceFunctionLiquidOpenTrade  = `wss://fstream.binance.com/ws/${process.env.envBinanceFunctionSymbol.toLocaleLowerCase()}@forceOrder`;
        process.env.envBinanceFunctionLiquidCloseTrade = `wss://fstream.binance.com/ws/${process.env.envBinanceFunctionSymbol.toLocaleLowerCase()}@markPrice@1s`;
    });

    const AlertTrading = new WebSocket(process.env.envBinanceFunctionLiquidOpenTrade);
    AlertTrading.on('message', async (event) => {
        try {
            /*Socket*/
            let result = JSON.parse(event);
            let totalValue = result.o.q * result.o.ap;
            let symbol = result.o.s;

            /*Thông báo thanh lý*/
            if (process.env.envBinanceFunctionLiquidAlert == "1") {
                if (symbol == process.env.envBinanceFunctionSymbol) {
                    const iconLongShort = (result.o.S == "BUY") ? "🟢" : "🔴";
                    await telegram.log(`🤖 ${symbol} thanh lý ${iconLongShort}: ${totalValue}`);
                }
            }
        } catch (e) {
            console.log(e);
        }
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

                        const fraction = common.NumDigitsAfterDecimal(process.env.envBinanceFunctionPrice);
                        const price = (totalValue * Number(process.env.envBinanceFunctionPrice) / Number(process.env.envBinanceFunctionLiquidAmount)).toFixed(fraction);
                        await binance.FuturesMarketBuySell(symbol, price, sideMy);
                        process.env.envBinanceFunctionLiquidTPSLVol = (totalValue / 10000).toFixed(0);

                        /*Gửi thông báo*/
                        const alertPs = (await binance.FuturesPositionRisk(symbol))[0];
                        const iconLongShort = (sideMy == "BUY") ? "🟢" : "🔴";
                        await telegram.log(`${iconLongShort} ${symbol} ${process.env.envBinanceFunctionLeverage}x|${alertPs.positionAmt}: ${alertPs.entryPrice}`);
                    }
                }
            }
        } catch (e) {
            console.log(e);
        }
    });

    const CloseTrading = new WebSocket(process.env.envBinanceFunctionLiquidCloseTrade);
    CloseTrading.on('message', async (event) => {
        try {
            /*Kiểm tra xem có lệnh không? Nếu có thì sẽ cắt lãi hoặc lỗ*/
            const symbol = process.env.envBinanceFunctionSymbol;
            const checkPs = (await binance.FuturesPositionRisk(symbol))[0];

            /*Nếu là kèo long*/
            if (checkPs.positionAmt > 0) {
                
                /*Nếu lãi*/
                if (checkPs.entryPrice + Number(process.env.envBinanceFunctionLiquidTPSLVol) < checkPs.markPrice) {
                    
                    /*Đóng lệnh*/
                    const ClosePs = (await binance.FuturesPositionRisk(symbol))[0];
                    await binance.FuturesMarketBuySell(symbol, ClosePs.positionAmt, "SELL");

                    /*Gửi thông báo*/
                    await telegram.log(`✅🟢 ${symbol} ${process.env.envBinanceFunctionLeverage}x|${ClosePs.positionAmt}: ${ClosePs.unRealizedProfit}USDT`);
                    return;
                }

                /*Nếu lỗ*/
                if (checkPs.entryPrice - (Number(process.env.envBinanceFunctionLiquidTPSLVol)*2) > checkPs.markPrice) {
                    
                    /*Đóng lệnh*/
                    const ClosePs = (await binance.FuturesPositionRisk(symbol))[0];
                    await binance.FuturesMarketBuySell(symbol, ClosePs.positionAmt, "SELL");

                    /*Gửi thông báo*/
                    await telegram.log(`❌🟢 ${symbol} ${process.env.envBinanceFunctionLeverage}x|${ClosePs.positionAmt}: ${ClosePs.unRealizedProfit}USDT`);
                    return;
                }

                return;
            }

            /*Nếu là kèo short*/
            if (checkPs.positionAmt < 0) {
                
                /*Nếu lãi*/
                if (checkPs.entryPrice - Number(process.env.envBinanceFunctionLiquidTPSLVol) > checkPs.markPrice) {
                    
                    /*Đóng lệnh*/
                    const ClosePs = (await binance.FuturesPositionRisk(symbol))[0];
                    await binance.FuturesMarketBuySell(symbol, ClosePs.positionAmt, "BUY");

                    /*Gửi thông báo*/
                    await telegram.log(`✅🔴 ${symbol} ${process.env.envBinanceFunctionLeverage}x|${ClosePs.positionAmt}: ${ClosePs.unRealizedProfit}USDT`);
                    return;
                }

                /*Nếu lỗ*/
                if (checkPs.entryPrice + (Number(process.env.envBinanceFunctionLiquidTPSLVol)*2) < checkPs.markPrice) {
                    
                    /*Đóng lệnh*/
                    const ClosePs = (await binance.FuturesPositionRisk(symbol))[0];
                    await binance.FuturesMarketBuySell(symbol, ClosePs.positionAmt, "BUY");

                    /*Gửi thông báo*/
                    await telegram.log(`❌🔴 ${symbol} ${process.env.envBinanceFunctionLeverage}x|${ClosePs.positionAmt}: ${ClosePs.unRealizedProfit}USDT`);
                    return;
                }

                return;
            }
        } catch (e) {
            console.log(e);
        }
    });
}

module.exports = { Main }