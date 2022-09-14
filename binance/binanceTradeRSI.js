require('dotenv').config({ path: '../env/live.env' });
const {log}                           = require("../telegram/telegram");
						              
const binance                         = require('./binance');
const sleep                           = require('thread-sleep');
const common                          = require('../common');
						              
var symbol                            = process.env.envBinanceFunctionRSISymbol;
var interval                          = process.env.envBinanceFunctionRSIInterval;
var leverage                          = Number(process.env.envBinanceFunctionRSILeverage);
var price                             = Number(process.env.envBinanceFunctionRSIPrice);
var rsi                               = 0;
var rsiTemp                           = 0;
var rsiMin                            = 31;
var rsiMax                            = 69;

async function Main() {
    while (true) {
        return new Promise(async (resolve) => {
            if (process.env.envBinanceFunctionRSIBOT == "1") {
                await log(`Khởi tạo bot thành công`);

                /*Kiểm tra xem đã đến giờ trade chưa?*/
                if (common.GetMomentSecond() == 59) {

                    /*Kiểm tra RSI*/
                    rsi = await binance.RSI(symbol, interval);

                    /*Trade nếu nằm trong vùng min và max*/
                    if (rsi > rsiMin && rsi < rsiMax) {
                        rsiTemp = 0;
                        sleep(1000);
                        resolve(false);
                    }

                    /*Điều chỉnh đòn bẩy nếu khác*/
                    const checkLeverage = (await binance.FuturesPositionRisk(symbol))[0];
                    if (checkLeverage.leverage != leverage) {
                        await binance.FuturesLeverage(symbol, leverage);
                        await log(`Đã điều chỉnh đòn bẩy ${symbol} ${leverage}}x`);
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
                                if (rsi > rsiMax) {
                                    const tpsl = (((checkPs.markPrice * 100 / checkPs.entryPrice) - 100) * leverage).toFixed(2);

                                    /*Nếu chắc chắn đã lãi thì sẽ chốt*/
                                    if (checkPs.entryPrice < checkPs.markPrice) {
                                        await binance.FuturesMarketBuySell(symbol, priceTP, "SELL");
                                        await log(`Đã đóng vị thế LONG ${symbol} ${leverage}x|${priceTP}: R: ${rsi}; E: ${checkPs.entryPrice}; M: ${checkPs.markPrice}; TP: ${tpsl}%`);
                                    }
                                    /*Nếu không lãi thì sẽ thông báo tiếp tục DCA*/
                                    else {
                                        await log(`Chưa đủ điều kiện đóng vị thế LONG ${symbol} ${leverage}x|${priceTP}: R: ${rsi}; E: ${checkPs.entryPrice}; M: ${checkPs.markPrice}; TP: ${tpsl}%`);
                                    }
                                }
                            }
                            /*Nếu là kèo short*/
                            else {

                                /*Cắt lãi nếu quá bán*/
                                if (rsi < rsiMin) {
                                    const tpsl = ((100 - (checkPs.markPrice * 100 / checkPs.entryPrice)) * leverage).toFixed(2);

                                    /*Nếu chắc chắn đã lãi thì sẽ chốt*/
                                    if (checkPs.entryPrice > checkPs.markPrice) {
                                        await binance.FuturesMarketBuySell(symbol, priceTP, "BUY");
                                        await log(`Đã đóng vị thế SHORT ${symbol} ${leverage}x|${priceTP}: R: ${rsi}; E: ${checkPs.entryPrice}; M: ${checkPs.markPrice}; TP: ${tpsl}%`);
                                    }
                                    /*Nếu không lãi thì sẽ thông báo tiếp tục DCA*/
                                    else {
                                        await log(`Chưa đủ điều kiện đóng vị thế SHORT ${symbol} ${leverage}x|${priceTP}: R: ${rsi}; E: ${checkPs.entryPrice}; M: ${checkPs.markPrice}; TP: ${tpsl}%`);
                                    }
                                }
                            }
                        }
                    }
                    else {

                        /*Nếu RSI < rsiMin => Đang nằm trong vùng quá bán*/
                        if (rsi < rsiMin) {

                            /*Kiểm tra xem đã có lệnh chưa?*/
                            /*Nếu chưa có lệnh thì vào 1 lệnh mới*/
                            const checkPs = (await binance.FuturesPositionRisk(symbol))[0];
                            if (checkPs.positionAmt == 0) {
                                await binance.FuturesMarketBuySell(symbol, price, "BUY");
                                const checkPsOpen = (await binance.FuturesPositionRisk(symbol))[0];
                                await log(`Đã mở vị thế LONG ${symbol} ${leverage}x|${price}: R: ${rsi}; E: ${checkPsOpen.entryPrice}; M: ${checkPsOpen.markPrice}`);
                            }
                            else {

                                /*Trường hợp rsi down thảm nữa thì DCA*/
                                if (rsi < rsiTemp) {
                                    await binance.FuturesMarketBuySell(symbol, price, "BUY");
                                    const checkPsDCA = (await binance.FuturesPositionRisk(symbol))[0];
                                    await log(`Đã DCA vị thế LONG ${symbol} ${leverage}x|${checkPsDCA.positionAmt}: R: ${rsi}; E: ${checkPs.entryPrice}; M: ${checkPs.markPrice}`);
                                }
                            }
                        }
                        /*Nếu RSI > rsiMax => Đang nằm trong vùng quá mua*/
                        else {

                            /*Kiểm tra xem đã có lệnh chưa?*/
                            /*Nếu chưa có lệnh thì vào 1 lệnh mới*/
                            const checkPs = (await binance.FuturesPositionRisk(symbol))[0];
                            if (checkPs.positionAmt == 0) {
                                await binance.FuturesMarketBuySell(symbol, price, "SELL");
                                const checkPsOpen = (await binance.FuturesPositionRisk(symbol))[0];
                                await log(`Đã mở vị thế SHORT ${symbol} ${leverage}x|${price}: R: ${rsi}; E: ${checkPsOpen.entryPrice}; M: ${checkPsOpen.markPrice}`);
                            }
                            else {

                                /*Trường hợp rsi down thảm nữa thì DCA*/
                                if (rsi > rsiTemp) {
                                    await binance.FuturesMarketBuySell(symbol, price, "SELL");
                                    const checkPsDCA = (await binance.FuturesPositionRisk(symbol))[0];
                                    await log(`Đã DCA vị thế SHORT ${symbol} ${leverage}x|${checkPsDCA.positionAmt}: R: ${rsi}; E: ${checkPs.entryPrice}; M: ${checkPs.markPrice}`);
                                }
                            }
                        }
                    }

                    rsiTemp = rsi;
                    sleep(1000);
                }

                console.log(common.GetMoment());
            }

            sleep(200);
        });
    }
}

module.exports = { Main }