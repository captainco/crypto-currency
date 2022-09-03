require('dotenv').config({ path: '../env/live.env' });

const binance = require('./binance');
const sleep = require('thread-sleep');
const common = require('../common');

const percent = process.env.envBinanceFunctionAutoTakeProfitByPercent;

async function Main() {
    while (true) {
        /*Cho nghỉ 0.5s*/
        sleep(500);

        /*Lấy ra danh sách vị thế*/
        const listSymbol = await binance.FetchPositions();

        /*Kiểm tra nếu không có vị thế thì không làm gì cả*/
        if (listSymbol.length == 0) {
            continue;
        }

        /*Xử lý từng vị thế một*/
        listSymbol.forEach(coin => {
            // const entryMargin = ((coin.markPrice - coin.entryPrice) * directionOfOrder * coin.positionAmt) / (coin.positionAmt * 1 * coin.markPrice * (1 / coin.leverage));
            // const ROE = PNL / entryMargin;
            if (coin.symbol == "CHZUSDT") {
                const directionOfOrder = coin.positionAmt > 0 ? 1 : -1;
                const size = Math.abs(coin.positionAmt * coin.markPrice).toFixed(5);
                const entryPrice = Math.abs(coin.entryPrice).toFixed(5);
                const markPrice = Math.abs(coin.markPrice).toFixed(5);
                const PNL = size * 1 * (markPrice - entryPrice);

                common.WriteConsoleLog(`${coin.symbol}: ${size}`);
            }
            

            // /*Xác định xu hướng nếu là long*/
            // if (coin.positionAmt > 0) {

            //     common.WriteConsoleLog(`${coin.symbol}: E: ${coin.entryPrice}; M: ${coin.markPrice}; L: ${coin.leverage}; ROE ${binance.GetROE(coin.entryPrice, coin.markPrice, coin.leverage)} %`);
            // }
            // /*Xác định xu hướng nếu là short*/
            // else {
            //     common.WriteConsoleLog(`${coin.symbol}: E: ${coin.entryPrice}; M: ${coin.markPrice}; L: ${coin.leverage}; ROE ${binance.GetROE(coin.markPrice, coin.entryPrice, coin.leverage)} %`);
            // }
        });
    }
}

module.exports = { Main }