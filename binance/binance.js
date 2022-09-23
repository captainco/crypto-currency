require('dotenv').config({ path: '../env/live.env' });

var indicators             = require('technicalindicators');
const Binance              = require('node-binance-api');
const _                    = require("lodash");
const common               = require("../common");
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

async function FuturesGetMinQuantity(symbol_) {
    const exchangeInfo = await binance.futuresExchangeInfo();
    const symbols = _.get(exchangeInfo, 'symbols');
    let newSymbol = {};
    _.map(symbols, (symbol) => {
        if (symbol.symbol == symbol_.toUpperCase()) {
            newSymbol.symbol = symbol.symbol;
            _.filter(_.get(symbol, 'filters'), (filter) => {
                if (filter.filterType == 'LOT_SIZE') {
                    newSymbol.lotSize = filter.stepSize;
                } else if (filter.filterType == 'MIN_NOTIONAL') {
                    newSymbol.notional = filter.notional
                }
            });
        }
    });
    return Number(newSymbol.lotSize);
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
    const balances = await binance.futuresBalance();
    return (_.filter(balances, (p) => {return p.asset == "USDT"}))[0].balance;
}

async function SpotPositionRisk() {
    return await binance.prices();
}

async function FuturesPositionRisk(symbol) {
    return await binance.futuresPositionRisk({ symbol: symbol });
}

async function FuturesCheckPositionRisk(symbol) {
    const risk = await binance.futuresPositionRisk({symbol});
    return _.nth(_.filter(risk, (p) => { return p.positionAmt != 0}), 0);
}

async function FuturesLeverage(symbol, leverage) {
    return await binance.futuresLeverage(symbol, leverage);
}

async function FuturesMarketBuySell(symbol, quantity, buySell) {
    quantity = common.ConvertToPositiveNumber(quantity);
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
    FuturesGetMinQuantity,
    FetchPositions,
    FuturesPrices,
    FuturesAccount,
    FuturesBalance,
    FuturesPositionRisk,
    SpotPositionRisk,
    FuturesCheckPositionRisk,
    FuturesLeverage,
    FuturesMarketBuySell,
    FuturesCandles,
    RSI
}