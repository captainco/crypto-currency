require('dotenv').config({ path: '../env/live.env' });

var indicators             = require('technicalindicators');
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

async function FuturesLeverage(symbol, leverage) {
    return await binance.futuresLeverage(symbol, leverage);
}

async function FuturesMarketBuySell(symbol, quantity, buySell) {
    if (buySell.toUpperCase() == "BUY") {
        return await binance.futuresMarketBuy(symbol, quantity);
    }

    return await binance.futuresMarketSell(symbol, quantity);
}

async function FuturesCandles(symbol, interval, limit) {
    return await binance.futuresCandles(symbol, interval, { limit: limit });
}

async function RSI(symbol, interval) {
    const latestCandles = await binance.futuresCandles(symbol, interval, { limit: 1500 });
    let values = _.reduce(latestCandles, (result, value) => {
        result.push(_.toNumber(_.nth(value, 4))); return result;
    }, [])
    let rsiInput = {
        values: values,
        period: 14,
    }
    const rs = indicators.RSI.calculate(rsiInput)
    return _.nth(rs, rs.length - 1);
}

module.exports = {
    FetchPositions,
    FuturesPrices,
    FuturesAccount,
    FuturesBalance,
    FuturesPositionRisk,
    FuturesLeverage,
    FuturesMarketBuySell,
    FuturesCandles,
    RSI
}