require('dotenv').config({ path: '../env/live.env' });
const {sendMessage, log} = require("../telegram/telegram");

const binance            = require('./binance');
const sleep              = require('thread-sleep');
const common             = require('../common');

var symbol               = "BTCUSDT";
var interval             = "1m";
var leverage             = 10;
var price                = 0.001;
var rsi                  = 0;
var rsiTemp              = 0;

async function Main() {
    while (true) {
        /*Trade theo khung 1 phút*/
        /*Kiểm tra xem đã đến giờ trade chưa?*/
        if (common.GetMomentSecond() == 59) {

            /*Kiểm tra RSI*/
            rsi = await binance.RSI(symbol, interval);

            /*Trade nếu nằm vùng dưới 30, trên 70*/
            if (rsi > 30 && rsi < 70) {
                rsiTemp = 0;
                sleep(1000);
                continue;
            }

            /*Điều chỉnh đòn bẩy nếu khác*/
            const checkLeverage = (await binance.FuturesPositionRisk(symbol))[0];
            if (checkLeverage.leverage != leverage) {
                await binance.FuturesLeverage(symbol, leverage);
                await log(`Đã điều chỉnh đòn bẩy x${leverage}}`);
            }
            
            /*Bắt đầu trade*/
            if (rsiTemp == 0) {
                /*Kiểm tra xem có vị thế không? Nếu có thì cắt lãi nếu dương*/
                const checkPs = (await binance.FuturesPositionRisk(symbol))[0];
                if (checkPs.positionAmt != 0) {

                    /*Nếu là kèo long*/
                    if (checkPs.positionAmt > 0) {

                        /*Cắt lãi*/
                        if (checkPs.entryPrice < checkPs.markPrice) {
                            await binance.FuturesMarketBuySell(symbol, common.ConvertToPositiveNumber(checkPs.positionAmt), "SELL");
                            await log(`Đã đóng vị thế LONG`);
                        }
                    }
                    /*Nếu là kèo short*/
                    else {

                        /*Cắt lãi*/
                        if (checkPs.entryPrice > checkPs.markPrice) {
                            await binance.FuturesMarketBuySell(symbol, common.ConvertToPositiveNumber(checkPs.positionAmt), "BUY");
                            await log(`Đã đóng vị thế SHORT`);
                        }
                    }
                }
                rsiTemp = rsi;
            }
            else {
                if ((rsi < 30 && rsi < rsiTemp) || (rsi > 70 && rsi > rsiTemp)) {
                    rsiTemp = rsi;
                }
            }

            sleep(1000);
        }

        sleep(100);
    }
}

module.exports = { Main }