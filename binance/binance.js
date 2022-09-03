require('dotenv').config({ path: '../env/live.env' });

const Binance              = require('node-binance-api');
const _                    = require("lodash");

const envBinanceAPIKEY     = process.env.envBinanceAPIKEY;
const envBinanceAPISECRET  = process.env.envBinanceAPISECRET;
const envBinanceEnviroment = process.env.envBinanceEnviroment.toUpperCase();

var binance;
if (envBinanceEnviroment == "TEST") {
    binance = new Binance().options({
        APIKEY: envBinanceAPIKEY,
        APISECRET: envBinanceAPISECRET,
        test: true
    });
}
else {
    binance = new Binance().options({
        APIKEY: envBinanceAPIKEY,
        APISECRET: envBinanceAPISECRET
    });
}

async function FetchPositions() {
    const risk = await binance.futuresPositionRisk();
    return _.filter(risk, (p) => {
        return p.positionAmt != 0
    });
}

async function FuturesPrices(symbol) {
    if (symbol) {
        return await binance.futuresPrices({ symbol: symbol });
    }
    return await binance.futuresPrices({ symbol: symbol });
}

async function FuturesAccount(symbol) {
    if (symbol) {
        return await binance.futuresAccount({ symbol: symbol });
    }
    return await binance.futuresAccount();
}

async function FuturesBalance() {
    return await binance.futuresBalance();
}

async function FuturesPositionRisk(symbol) {
    return await binance.futuresPositionRisk({ symbol: symbol });
}

async function FuturesMarketBuySell(symbolMain, quantityMain, buySell) {
    if (buySell.toUpperCase() == "BUY") {
        return await binance.futuresMarketBuy(symbolMain, quantityMain);
    }

    return await binance.futuresMarketSell(symbolMain, quantityMain);
}

module.exports = {
    FetchPositions,
    FuturesPrices,
    FuturesAccount,
    FuturesBalance,
    FuturesPositionRisk,
    FuturesMarketBuySell
}