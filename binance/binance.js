require('dotenv').config({ path: '../env/live.env' });

var indicators             = require('technicalindicators');
var EMA                    = require('technicalindicators').EMA;
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

async function FuturesMarketBuySell(symbol, quantity, buySell) {
    quantity = Math.abs(quantity);
    if (buySell.toUpperCase() == "BUY") {
        return await binance.futuresMarketBuy(symbol, quantity);
    }
    return await binance.futuresMarketSell(symbol, quantity);
}

async function FuturesMarketBuySellTakeProfit(symbol, quantity, stopPrice, buySell) {
    quantity = Math.abs(quantity);
    if (buySell.toUpperCase() == "BUY") {
        return await binance.futuresMarketBuy(symbol, quantity, { stopPrice: stopPrice, reduceOnly: true, type: 'TAKE_PROFIT_MARKET', timeInForce: 'GTC', workingType: 'MARK_PRICE' });
    }
    return await binance.futuresMarketSell(symbol, quantity, { stopPrice: stopPrice, reduceOnly: true, type: 'TAKE_PROFIT_MARKET', timeInForce: 'GTC', workingType: 'MARK_PRICE' });
}

async function FuturesMarketBuySellStopLoss(symbol, quantity, stopPrice, buySell) {
    quantity = Math.abs(quantity);
    if (buySell.toUpperCase() == "BUY") {
        return await binance.futuresMarketBuy(symbol, quantity, { stopPrice: stopPrice, reduceOnly: true, type: 'STOP_MARKET', timeInForce: 'GTC', workingType: 'MARK_PRICE' });
    }
    return await binance.futuresMarketSell(symbol, quantity, { stopPrice: stopPrice, reduceOnly: true, type: 'STOP_MARKET', timeInForce: 'GTC', workingType: 'MARK_PRICE' });
}

async function FuturesMarketBuySellTPSL(symbol, quantity, takeProfit, stopLoss, buySell) {
    if (buySell.toUpperCase() == "BUY") {
        await FuturesMarketBuySellTakeProfit(symbol, quantity, takeProfit, 'SELL');
        await FuturesMarketBuySellStopLoss(symbol, quantity, stopLoss, 'SELL');
    } else {
        await FuturesMarketBuySellTakeProfit(symbol, quantity, takeProfit, 'BUY');
        await FuturesMarketBuySellStopLoss(symbol, quantity, stopLoss, 'BUY');
    }
}

async function FuturesCheckPositions(symbol, priceDifferenceLong, priceDifferenceShort) {
    priceDifferenceLong = Math.abs(Number(priceDifferenceLong));
    priceDifferenceShort = Math.abs(Number(priceDifferenceShort));
    var stringCheckPos = "";
    const Ps = (await FuturesPositionRisk(symbol))[0];
    var quantity = Math.abs(Number(Ps.entryPrice));
    if (Ps.positionAmt != 0) {
        const Od = await FuturesOpenOrders(symbol);
        if (Od.length == 0) {
            stringCheckPos = "❗Chưa đặt lệnh TP. ";
            var priceDifference = 0;
            var takeProfit = 0;
            /*Long*/
            if (Ps.positionAmt > 0) {
                takeProfit = Number(Number(Ps.entryPrice) + Number(priceDifferenceLong)).toFixed(0);
                priceDifference = Number(priceDifferenceLong);
                await FuturesMarketBuySellTakeProfit(symbol, Number(quantity), Number(takeProfit), 'SELL');
            }
            /*Short*/
            else {
                takeProfit = Number(Number(Ps.entryPrice) - Number(priceDifferenceShort)).toFixed(0);
                priceDifference = Number(priceDifferenceShort);
                await FuturesMarketBuySellTakeProfit(symbol, Number(quantity), Number(takeProfit), 'BUY');
            }
            const OdAlert = await FuturesOpenOrders(symbol);
            stringCheckPos = stringCheckPos + (OdAlert.length > 0 ? "✅Khởi tạo TP thành công." : "❌Khởi tạo TP không thành công. ");
            stringCheckPos = stringCheckPos + `priceDifference: ${priceDifference}; TP: ${takeProfit} USDT; M: ${Ps.markPrice} USDT`;
        }
    }
    return stringCheckPos;
}

async function FuturesClearPositions(symbol) {
    const Ps = (await FuturesPositionRisk(symbol))[0];
    if (Ps.positionAmt == 0) {
        const Od = await FuturesOpenOrders(symbol);
        if (Od.length > 0) {
            await FuturesCancelAll(symbol);
        }
    }
}

async function FuturesOpenPositions(symbol, quantity, buySell) {
    quantity = Math.abs(quantity);

    /*Đóng vị thế trước*/
    const Ps = (await FuturesPositionRisk(symbol))[0];
    if (Ps.positionAmt != 0) {
        /*Long*/
        if (Ps.positionAmt > 0) {
            await FuturesMarketBuySell(symbol, quantity, 'SELL');
        }
        /*Short*/
        else {
            await FuturesMarketBuySell(symbol, quantity, 'BUY');
        }
    }
    const Od = await FuturesOpenOrders(symbol);
    if (Od.length > 0) {
        await FuturesCancelAll(symbol);
    }

    /*Tạo vị thế mới*/
    if (buySell.toUpperCase() == "BUY") {
        await FuturesMarketBuySell(symbol, quantity, 'BUY');
    } else {
        await FuturesMarketBuySell(symbol, quantity, 'SELL');
    }

    const PsAlert = (await FuturesPositionRisk(symbol))[0];
    return PsAlert;
}

async function FuturesOpenPositionsTP(symbol, quantity, priceDifference, buySell) {
    quantity = Math.abs(quantity);
    priceDifference = Math.abs(priceDifference);

    /*Đóng vị thế trước*/
    const Ps = (await FuturesPositionRisk(symbol))[0];
    if (Ps.positionAmt != 0) {
        /*Long*/
        if (Ps.positionAmt > 0) {
            await FuturesMarketBuySell(symbol, Number(Ps.positionAmt), 'SELL');
        }
        /*Short*/
        else {
            await FuturesMarketBuySell(symbol, Number(Ps.positionAmt), 'BUY');
        }
    }

    const Od = await FuturesOpenOrders(symbol);
    if (Od.length > 0) {
        await FuturesCancelAll(symbol);
    }

    /*Tạo vị thế mới và take profit*/
    if (buySell.toUpperCase() == "BUY") {
        await FuturesMarketBuySell(symbol, quantity, 'BUY');
        const PsCheck = (await FuturesPositionRisk(symbol))[0];
        const takeProfit = Number(PsCheck.entryPrice) + priceDifference;
        await FuturesMarketBuySellTakeProfit(symbol, quantity, takeProfit, 'SELL');
    } else {
        await FuturesMarketBuySell(symbol, quantity, 'SELL');
        const PsCheck = (await FuturesPositionRisk(symbol))[0];
        const takeProfit = Number(PsCheck.entryPrice) - priceDifference;
        await FuturesMarketBuySellTakeProfit(symbol, quantity, takeProfit, 'BUY');
    }

    const PsAlert = (await FuturesPositionRisk(symbol))[0];
    return PsAlert;
}

async function FuturesOpenPositionsTPSL(symbol, quantity, priceDifference, numberOfTimesStopLossPrice, buySell) {
    quantity = Math.abs(quantity);
    priceDifference = Math.abs(priceDifference);

    /*Đóng vị thế trước*/
    const Ps = (await FuturesPositionRisk(symbol))[0];
    if (Ps.positionAmt != 0) {
        /*Long*/
        if (Ps.positionAmt > 0) {
            await FuturesMarketBuySell(symbol, Number(Ps.positionAmt), 'SELL');
        }
        /*Short*/
        else {
            await FuturesMarketBuySell(symbol, Number(Ps.positionAmt), 'BUY');
        }
    }

    const Od = await FuturesOpenOrders(symbol);
    if (Od.length > 0) {
        await FuturesCancelAll(symbol);
    }

    /*Tạo vị thế mới và take profit*/
    if (buySell.toUpperCase() == "BUY") {
        await FuturesMarketBuySell(symbol, quantity, 'BUY');
        const PsCheck = (await FuturesPositionRisk(symbol))[0];
        const takeProfit = Number(PsCheck.entryPrice) + priceDifference;
        const stopLoss = Number(PsCheck.entryPrice) - (priceDifference * numberOfTimesStopLossPrice);
        await FuturesMarketBuySellTakeProfit(symbol, quantity, takeProfit, 'SELL');
        await FuturesMarketBuySellStopLoss(symbol, quantity, stopLoss, 'SELL');
    } else {
        await FuturesMarketBuySell(symbol, quantity, 'SELL');
        const PsCheck = (await FuturesPositionRisk(symbol))[0];
        const takeProfit = Number(PsCheck.entryPrice) - priceDifference;
        const stopLoss = Number(PsCheck.entryPrice) + (priceDifference * numberOfTimesStopLossPrice);
        await FuturesMarketBuySellTakeProfit(symbol, quantity, takeProfit, 'BUY');
        await FuturesMarketBuySellStopLoss(symbol, quantity, stopLoss, 'BUY');
    }

    const PsAlert = (await FuturesPositionRisk(symbol))[0];
    return PsAlert;
}

async function FuturesClosePositions(symbol) {

    /*Đóng vị thế trước*/
    const Ps = (await FuturesPositionRisk(symbol))[0];
    if (Ps.positionAmt != 0) {
        /*Long*/
        if (Ps.positionAmt > 0) {
            await FuturesMarketBuySell(symbol, Ps.positionAmt, 'SELL');
        }
        /*Short*/
        else {
            await FuturesMarketBuySell(symbol, Ps.positionAmt, 'BUY');
        }
    }
    const Od = await FuturesOpenOrders(symbol);
    if (Od.length > 0) {
        await FuturesCancelAll(symbol);
    }

    const PsAlert = (await FuturesPositionRisk(symbol))[0];
    return PsAlert;
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
    return (_.filter(balances, (p) => { return p.asset == "USDT" }))[0].balance;
}

async function SpotPositionRisk() {
    return await binance.prices();
}

async function FuturesPositionRisk(symbol) {
    return await binance.futuresPositionRisk({ symbol: symbol });
}

async function FuturesCheckPositionRisk(symbol) {
    const risk = await binance.futuresPositionRisk({ symbol });
    return _.nth(_.filter(risk, (p) => { return p.positionAmt != 0 }), 0);
}

async function FuturesLeverage(symbol, leverage) {
    return await binance.futuresLeverage(symbol, leverage);
}

async function FuturesOpenOrders(symbol) {
    return await binance.futuresOpenOrders(symbol);
}

async function FuturesCancelAll(symbol) {
    return await binance.futuresCancelAll(symbol);
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

async function EMA(symbol, interval, limit) {
    const latestTradeCandles = await binance.futuresCandles(symbol, interval, { limit: 1500 });
    let values = _.reduce(latestTradeCandles, (result, value) => {
        result.push(_.toNumber(lodash.nth(value, 4))); return result;
    }, []);
    let emaTrades = EMA.calculate({ period: limit, values: values });
    return _.nth(emaTrades, emaTrades.length - 1);
}

async function EMAOpen(symbol, interval, limit) {
    const latestTradeCandles = await binance.futuresCandles(symbol, interval, { limit: 1500 });
    let values = _.reduce(latestTradeCandles, (result, value) => {
        result.push(_.toNumber(_.nth(value, 1))); return result;
    }, []);
    let emaTrades = EMA.calculate({ period: limit, values: values });
    return _.nth(emaTrades, emaTrades.length - 1);
}

async function EMAClose(symbol, interval, limit) {
    const latestTradeCandles = await binance.futuresCandles(symbol, interval, { limit: 1500 });
    let values = _.reduce(latestTradeCandles, (result, value) => {
        result.push(_.toNumber(_.nth(value, 4))); return result;
    }, []);
    let emaTrades = EMA.calculate({ period: limit, values: values });
    return _.nth(emaTrades, emaTrades.length - 1);
}

module.exports = {
    FuturesMarketBuySell,
    FuturesMarketBuySellTakeProfit,
    FuturesMarketBuySellStopLoss,
    FuturesMarketBuySellTPSL,
    FuturesCheckPositions,
    FuturesClearPositions,
    FuturesOpenPositions,
    FuturesOpenPositionsTP,
    FuturesOpenPositionsTPSL,
    FuturesClosePositions,
    FuturesGetMinQuantity,
    FetchPositions,
    FuturesPrices,
    FuturesAccount,
    FuturesBalance,
    FuturesPositionRisk,
    SpotPositionRisk,
    FuturesCheckPositionRisk,
    FuturesLeverage,
    FuturesOpenOrders,
    FuturesCancelAll,
    FuturesCandles,
    RSI, EMA,
    EMAOpen, EMAClose
}
