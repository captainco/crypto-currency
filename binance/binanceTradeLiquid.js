require('dotenv').config({ path: '../env/live.env' });
const telegram                                 = require("../telegram/telegram");
const WebSocket                                = require("ws");
const binance                                  = require('./binance');
const common                                   = require('../common');
const sleep                                    = require('thread-sleep');
process.env.envBinanceFunctionLiquidOpenTrade  = `wss://fstream.binance.com/ws/${process.env.envBinanceFunctionSymbol.toLocaleLowerCase()}@forceOrder`;
process.env.envBinanceFunctionLiquidCloseTrade = `wss://fstream.binance.com/ws/${process.env.envBinanceFunctionSymbol.toLocaleLowerCase()}@markPrice@1s`;
process.env.CloseTrading                       = "0";

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
                if (symbol == process.env.envBinanceFunctionSymbol) {
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
            let sideMy = result.o.S == 'BUY' ? 'SELL' : 'BUY';

            /*Nằm trong giá thanh lý setup thì vào lệnh*/
            if (totalValue > Number(process.env.envBinanceFunctionLiquidAmount) && symbol == process.env.envBinanceFunctionSymbol) {

                /*Kiểm tra bot xem có cho vào lệnh ko?*/
                if (process.env.envTelegramBotStatus == "1") {

                    /*Kiểm tra xem có vị thế ko? Nếu ko có thì vào*/
                    const checkPs = (await binance.FuturesPositionRisk(symbol))[0];
                    if (checkPs.positionAmt == 0) {
                        
                        const quantity = Number(process.env.envBinanceFunctionPrice);
                        await binance.FuturesMarketBuySell(symbol, quantity, sideMy);
                        process.env.envBinanceFunctionLiquidTPSLVol = (totalValue / 1000).toFixed(0);
                        
                        /*Fix cứng vượt quá 10 giá thì mặc định 10 giá*/
                        process.env.envBinanceFunctionLiquidTPSLVol = process.env.envBinanceFunctionLiquidTPSLVol > 10 ? 10 : process.env.envBinanceFunctionLiquidTPSLVol;

                        /*Gửi thông báo*/
                        const alertPs = (await binance.FuturesPositionRisk(symbol))[0];
                        const iconLongShort = (sideMy == "BUY") ? "🟢" : "🔴";
                        await telegram.log(`${iconLongShort} ${symbol} ${process.env.envBinanceFunctionLeverage}x|${alertPs.positionAmt}: ${alertPs.entryPrice}`);

                        process.env.CloseTrading = "0";

                        sleep(1000);
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
            /*Nếu lệnh đang đóng thì return*/
            if (process.env.CloseTrading == "1") {
                return;
            }

            process.env.CloseTrading = "1";

            /*Kiểm tra xem có lệnh không? Nếu có thì sẽ cắt lãi hoặc lỗ*/
            const symbol = process.env.envBinanceFunctionSymbol;
            const checkPs = (await binance.FuturesPositionRisk(symbol))[0];

            /*Nếu là kèo long*/
            if (checkPs.positionAmt > 0) {
                
                /*Nếu lãi*/
                if (checkPs.entryPrice + Number(process.env.envBinanceFunctionLiquidTPSLVol) < checkPs.markPrice) {
                    
                    /*Đóng lệnh*/
                    await binance.FuturesMarketBuySell(symbol, checkPs.positionAmt, "SELL");

                    /*Gửi thông báo*/
                    await telegram.log(`✅🟢 ${symbol} ${process.env.envBinanceFunctionLeverage}x|${checkPs.positionAmt}: ${checkPs.unRealizedProfit}USDT`);
                }
                /*Nếu lỗ*/
                else if (checkPs.entryPrice - (Number(process.env.envBinanceFunctionLiquidTPSLVol)*2) > checkPs.markPrice) {
                    
                    /*Đóng lệnh*/
                    await binance.FuturesMarketBuySell(symbol, checkPs.positionAmt, "SELL");

                    /*Gửi thông báo*/
                    await telegram.log(`❌🟢 ${symbol} ${process.env.envBinanceFunctionLeverage}x|${checkPs.positionAmt}: ${checkPs.unRealizedProfit}USDT`);
                }
            }
            /*Nếu là kèo short*/
            else if (checkPs.positionAmt < 0) {
                
                /*Nếu lãi*/
                if (checkPs.entryPrice - Number(process.env.envBinanceFunctionLiquidTPSLVol) > checkPs.markPrice) {
                    
                    /*Đóng lệnh*/
                    await binance.FuturesMarketBuySell(symbol, checkPs.positionAmt, "BUY");

                    /*Gửi thông báo*/
                    await telegram.log(`✅🔴 ${symbol} ${process.env.envBinanceFunctionLeverage}x|${checkPs.positionAmt}: ${checkPs.unRealizedProfit}USDT`);
                }
                /*Nếu lỗ*/
                else if (checkPs.entryPrice + (Number(process.env.envBinanceFunctionLiquidTPSLVol)*2) < checkPs.markPrice) {
                    
                    /*Đóng lệnh*/
                    await binance.FuturesMarketBuySell(symbol, checkPs.positionAmt, "BUY");

                    /*Gửi thông báo*/
                    await telegram.log(`❌🔴 ${symbol} ${process.env.envBinanceFunctionLeverage}x|${checkPs.positionAmt}: ${checkPs.unRealizedProfit}USDT`);
                }
            }

            process.env.CloseTrading = "0";

            sleep(1000);
        } catch (e) {
            process.env.CloseTrading = "0";
            await telegram.log(`⚠ ${e}`);
        }
    });
}

module.exports = { Main }