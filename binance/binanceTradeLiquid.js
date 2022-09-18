require('dotenv').config({ path: '../env/live.env' });
const telegram                                 = require("../telegram/telegram");
const WebSocket                                = require("ws");
const binance                                  = require('./binance');
const common                                   = require('../common');
const sleep                                    = require('thread-sleep');
process.env.envBinanceFunctionLiquidOpenTrade  = `wss://fstream.binance.com/ws/${process.env.envBinanceFunctionSymbol.toLocaleLowerCase()}@forceOrder`;
process.env.envBinanceFunctionLiquidCloseTrade = `wss://fstream.binance.com/ws/${process.env.envBinanceFunctionSymbol.toLocaleLowerCase()}@markPrice@1s`;
_CloseTrading                                  = "0";
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

                        await binance.FuturesMarketBuySell(symbol, Number(process.env.envBinanceFunctionPrice), sideMy);

                        /*Fix cứng giá*/
                        // liquidTPSLVol = (totalValue / 1000).toFixed(0);
                        // liquidTPSLVol = liquidTPSLVol > 10 ? 10 : liquidTPSLVol;

                        /*Gửi thông báo*/
                        const alertPs = (await binance.FuturesPositionRisk(symbol))[0];
                        const iconLongShort = (sideMy == "BUY") ? "🟢" : "🔴";
                        await telegram.log(`${iconLongShort} ${symbol} ${process.env.envBinanceFunctionLeverage}x|${alertPs.positionAmt}: ${alertPs.entryPrice}`);

                        _CloseTrading = "0";
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
            if (_CloseTrading == "1") {
                return;
            }
            _CloseTrading = "1";

            /*Kiểm tra xem có lệnh không? Nếu có thì sẽ cắt lãi hoặc lỗ*/
            const symbol = process.env.envBinanceFunctionSymbol;
            const checkPs = (await binance.FuturesPositionRisk(symbol))[0];

            /*Nếu là kèo long*/
            if (checkPs.positionAmt > 0) {

                /*Cắt lệnh*/
                if ((checkPs.entryPrice + liquidTPSLVol < checkPs.markPrice) || (checkPs.entryPrice - (liquidTPSLVol * 2) > checkPs.markPrice)) {

                    await binance.FuturesMarketBuySell(symbol, checkPs.positionAmt, "SELL");

                    /*Gửi thông báo*/
                    const iconTPSL = checkPs.unRealizedProfit > 0 ? "✅" : "❌";
                    await telegram.log(`${iconTPSL}🟢 ${symbol} ${process.env.envBinanceFunctionLeverage}x|${checkPs.positionAmt}: ${checkPs.unRealizedProfit}USDT`);
                }
            }
            /*Nếu là kèo short*/
            else if (checkPs.positionAmt < 0) {

                /*Cắt lệnh*/
                if ((checkPs.entryPrice - liquidTPSLVol > checkPs.markPrice) || (checkPs.entryPrice + (liquidTPSLVol * 2) < checkPs.markPrice)) {

                    await binance.FuturesMarketBuySell(symbol, checkPs.positionAmt, "BUY");

                    /*Gửi thông báo*/
                    const iconTPSL = checkPs.unRealizedProfit > 0 ? "✅" : "❌";
                    await telegram.log(`${iconTPSL}🔴 ${symbol} ${process.env.envBinanceFunctionLeverage}x|${checkPs.positionAmt}: ${checkPs.unRealizedProfit}USDT`);
                }
            }

            _CloseTrading = "0";
            sleep(1000);
        } catch (e) {
            _CloseTrading = "0";
            await telegram.log(`⚠ ${e}`);
        }
    });
}

module.exports = { Main }
