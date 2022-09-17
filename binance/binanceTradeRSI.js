require('dotenv').config({ path: '../env/live.env' });
const telegram                        = require("../telegram/telegram");
const WebSocket                       = require("ws");
const binance                         = require('./binance');
const sleep                           = require('thread-sleep');
const common                          = require('../common');
var interval                          = process.env.envBinanceFunctionRSIInterval;
var price                             = Number(process.env.envBinanceFunctionPrice);
var rsi                               = 0;
var rsiTemp                           = 0;
process.env.envBinanceFunctionRSIBOT  = process.env.envTelegramBotStatus;

async function Main() {
    const ws = new WebSocket('wss://fstream.binance.com/ws/btcusdt@markPrice@1s');
    ws.on('message', async (event) => {
        if (process.env.envTelegramBotStatus == "1") {

            var symbol   = process.env.envBinanceFunctionSymbol;
            var leverage = Number(process.env.envBinanceFunctionLeverage);

            /*Kiểm tra xem đã đến giờ trade chưa?*/
            if (common.GetMomentSecond() == 59) {

                /*Kiểm tra RSI*/
                rsi = await binance.RSI(symbol, interval);

                /*Trade nếu nằm trong vùng min và max*/
                if (rsi > Number(process.env.envBinanceFunctionRSIMin) && rsi < Number(process.env.envBinanceFunctionRSIMax)) {
                    rsiTemp = 0;
                    return;
                }

                /*Điều chỉnh đòn bẩy nếu khác*/
                const checkLeverage = (await binance.FuturesPositionRisk(symbol))[0];
                if (checkLeverage.leverage != leverage) {
                    await binance.FuturesLeverage(symbol, leverage);
                    await telegram.log(`Đã điều chỉnh đòn bẩy ${symbol} ${leverage}}x`);
                }

                /*Bắt đầu trade*/
                if (rsiTemp == 0) {
                    /*Kiểm tra xem có vị thế không? Nếu có thì cắt lãi nếu dương*/
                    const checkPs = (await binance.FuturesPositionRisk(symbol))[0];
                    const priceTP = common.ConvertToPositiveNumber(checkPs.positionAmt);
                    if (checkPs.positionAmt != 0) {

                        /*Nếu là kèo long*/
                        if (checkPs.positionAmt > 0) {

                            /*Cắt lãi nếu quá mua*/
                            if (rsi > Number(process.env.envBinanceFunctionRSIMax)) {
                                const tpsl = (((checkPs.markPrice * 100 / checkPs.entryPrice) - 100) * leverage).toFixed(2);

                                /*Nếu chắc chắn đã lãi thì sẽ chốt*/
                                if (checkPs.unRealizedProfit > 0) {
                                    await binance.FuturesMarketBuySell(symbol, priceTP, "SELL");
                                    await telegram.log(`Đã đóng vị thế 🟢 ${symbol} ${leverage}x|${priceTP}: R: ${rsi}; E: ${checkPs.entryPrice}; M: ${checkPs.markPrice}; TP: ${tpsl}%`);
                                }
                                /*Nếu không lãi thì sẽ thông báo tiếp tục DCA*/
                                else {
                                    await telegram.log(`Chưa đủ điều kiện đóng vị thế 🟢 ${symbol} ${leverage}x|${priceTP}: R: ${rsi}; E: ${checkPs.entryPrice}; M: ${checkPs.markPrice}; TP: ${tpsl}%`);
                                }
                            }
                        }
                        /*Nếu là kèo short*/
                        else {

                            /*Cắt lãi nếu quá bán*/
                            if (rsi < Number(process.env.envBinanceFunctionRSIMin)) {
                                const tpsl = ((100 - (checkPs.markPrice * 100 / checkPs.entryPrice)) * leverage).toFixed(2);

                                /*Nếu chắc chắn đã lãi thì sẽ chốt*/
                                if (checkPs.unRealizedProfit > 0) {
                                    await binance.FuturesMarketBuySell(symbol, priceTP, "BUY");
                                    await telegram.log(`Đã đóng vị thế 🔴 ${symbol} ${leverage}x|${priceTP}: R: ${rsi}; E: ${checkPs.entryPrice}; M: ${checkPs.markPrice}; TP: ${tpsl}%`);
                                }
                                /*Nếu không lãi thì sẽ thông báo tiếp tục DCA*/
                                else {
                                    await telegram.log(`Chưa đủ điều kiện đóng vị thế 🔴 ${symbol} ${leverage}x|${priceTP}: R: ${rsi}; E: ${checkPs.entryPrice}; M: ${checkPs.markPrice}; TP: ${tpsl}%`);
                                }
                            }
                        }
                    }
                }
                else {

                    /*Nếu RSI < Number(process.env.envBinanceFunctionRSIMin) => Đang nằm trong vùng quá bán*/
                    if (rsi < Number(process.env.envBinanceFunctionRSIMin)) {

                        /*Kiểm tra xem đã có lệnh chưa?*/
                        /*Nếu chưa có lệnh thì vào 1 lệnh mới*/
                        const checkPs = (await binance.FuturesPositionRisk(symbol))[0];
                        if (checkPs.positionAmt == 0) {
                            await binance.FuturesMarketBuySell(symbol, price, "BUY");
                            const checkPsOpen = (await binance.FuturesPositionRisk(symbol))[0];
                            await telegram.log(`Đã mở vị thế 🟢 ${symbol} ${leverage}x|${price}: R: ${rsi}; E: ${checkPsOpen.entryPrice}; M: ${checkPsOpen.markPrice}`);
                        }
                        else {

                            /*Trường hợp rsi down thảm nữa thì DCA*/
                            if (rsi < rsiTemp) {
                                await binance.FuturesMarketBuySell(symbol, price, "BUY");
                                const checkPsDCA = (await binance.FuturesPositionRisk(symbol))[0];
                                await telegram.log(`Đã DCA vị thế 🟢 ${symbol} ${leverage}x|${checkPsDCA.positionAmt}: R: ${rsi}; E: ${checkPs.entryPrice}; M: ${checkPs.markPrice}`);
                            }
                        }
                    }
                    /*Nếu RSI > Number(process.env.envBinanceFunctionRSIMax) => Đang nằm trong vùng quá mua*/
                    else {

                        /*Kiểm tra xem đã có lệnh chưa?*/
                        /*Nếu chưa có lệnh thì vào 1 lệnh mới*/
                        const checkPs = (await binance.FuturesPositionRisk(symbol))[0];
                        if (checkPs.positionAmt == 0) {
                            await binance.FuturesMarketBuySell(symbol, price, "SELL");
                            const checkPsOpen = (await binance.FuturesPositionRisk(symbol))[0];
                            await telegram.log(`Đã mở vị thế 🔴 ${symbol} ${leverage}x|${price}: R: ${rsi}; E: ${checkPsOpen.entryPrice}; M: ${checkPsOpen.markPrice}`);
                        }
                        else {

                            /*Trường hợp rsi down thảm nữa thì DCA*/
                            if (rsi > rsiTemp) {
                                await binance.FuturesMarketBuySell(symbol, price, "SELL");
                                const checkPsDCA = (await binance.FuturesPositionRisk(symbol))[0];
                                await telegram.log(`Đã DCA vị thế 🔴 ${symbol} ${leverage}x|${checkPsDCA.positionAmt}: R: ${rsi}; E: ${checkPs.entryPrice}; M: ${checkPs.markPrice}`);
                            }
                        }
                    }
                }

                rsiTemp = rsi;
            }

            if (process.env.envBinanceFunctionRSIBOT == "1") {
                await telegram.log(`Khởi tạo bot thành công`);
                process.env.envBinanceFunctionRSIBOT = "0";
            }
        }
    });
}

module.exports = { Main }