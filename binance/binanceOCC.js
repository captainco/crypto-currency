require('dotenv').config({ path: '../env/live.env' });
const telegram             = require("../telegram/telegram");
const WebSocket            = require("ws");
const binance              = require('./binance');
const common               = require('../common');

var binanceChart           = process.env.binanceChart;
var binanceSymbol          = process.env.binanceSymbol;
var binanceLeverage        = Number(process.env.binanceLeverage);
var DCALongTotalPriceMin   = Number(process.env.DCALongTotalPriceMin);
var DCAShortTotalPriceMin  = Number(process.env.DCAShortTotalPriceMin);
var DCALongTotalPriceMax   = Number(process.env.DCALongTotalPriceMax);
var DCAShortTotalPriceMax  = Number(process.env.DCAShortTotalPriceMax);

var binanceIsLock          = 0;
var binanceIsLockSoon      = 0;
var binanceIsLockAlert     = 0;
var binanceIsLockCheckPos  = 0;
var totalUSDTBefore        = 0;
var totalUSDT              = 0;

var checkTrend             = '';
var isChangeDCA            = '';
var isChangeEntry          = '';
var isDCAPrice             = 0;
var entryPricePre          = 0;
var DCAPrice               = 0;
var minMarkPrice           = 1;
var bestMarkPrice          = 1;
						   
var DCALong                = [];
var DCALongStringPrice     = '';
var DCALongTotalPrice_     = DCALongTotalPriceMin;
var DCALongTotalPrice      = DCALongTotalPriceMin;
						   
var DCAShort               = [];
var DCAShortStringPrice    = '';
var DCAShortTotalPrice_    = DCAShortTotalPriceMin;
var DCAShortTotalPrice     = DCAShortTotalPriceMin;

var DayNoTradeSetup        = [0, 1, 6];

async function Main() {
    const ClearAndCheckPositions = new WebSocket('wss://fstream.binance.com/ws/btcusdt@markPrice@1s');
    ClearAndCheckPositions.on('message', async (event) => {
        try {
            if (binanceIsLockCheckPos != 0) {
                return;
            }
            binanceIsLockCheckPos = 1;

            await binance.FuturesClearPositions(binanceSymbol);
            
            binanceIsLockCheckPos = 0;
        } catch (e) {
            binanceIsLockCheckPos = 0;
            console.log(e);
        }
    });

    const UpdateBestMarkPrice = new WebSocket('wss://fstream.binance.com/ws/btcusdt@markPrice@1s');
    UpdateBestMarkPrice.on('message', async (event) => {
        try {
            if (binanceIsLockAlert != 0) {
                return;
            }
            binanceIsLockAlert = 1;

            if (process.env.Webhook == "") {
                binanceIsLockAlert = 0;
                const Ps = (await binance.FuturesPositionRisk(binanceSymbol))[0];
                minMarkPrice = Number(Ps.markPrice).toFixed(2);
                bestMarkPrice = Number(Ps.markPrice).toFixed(2);
                return;
            }

            if (isDCAPrice == 0) {
                isDCAPrice = 1;
                isChangeDCA = process.env.Webhook;
                await binance.FuturesLeverage(binanceSymbol, binanceLeverage);
                await telegram.log(`???${binanceSymbol} ???? ??i???u ch???nh ????n b???y ${binanceLeverage}x`);
                const priceBeforeTrade = await binance.FuturesBalance();
                totalUSDTBefore = Number(priceBeforeTrade);
                binanceIsLockAlert = 0;
                return;
            }

            const Ps = (await binance.FuturesPositionRisk(binanceSymbol))[0];

            if (process.env.Webhook == isChangeDCA) {
                if (process.env.Webhook != isChangeEntry) {
                    isChangeEntry = process.env.Webhook;
                    entryPricePre = Number(Ps.positionAmt) == 0 ? Number(Ps.markPrice) : Number(Ps.entryPrice);
                }
                
                /*Get Max Price*/
                if ((Number(bestMarkPrice) < Number(Ps.markPrice) && process.env.Webhook == 'buy') || (Number(bestMarkPrice) > Number(Ps.markPrice) && process.env.Webhook == 'sell')) {
                    bestMarkPrice = Number(Ps.markPrice).toFixed(2);
                    DCAPrice = Number(Number(bestMarkPrice) - Number(entryPricePre)).toFixed(2);
                    const iconLongShortAlert = process.env.Webhook == 'buy' ? '????' : '????';
                    await telegram.log(`${iconLongShortAlert} => Max new: ${DCAPrice}`);
                }

                /*Get Min Price*/
                if ((Number(minMarkPrice) > Number(Ps.markPrice) && process.env.Webhook == 'buy') || (Number(minMarkPrice) < Number(Ps.markPrice) && process.env.Webhook == 'sell')) {
                    minMarkPrice = Number(Ps.markPrice).toFixed(2);
                    const iconLongShortAlert = process.env.Webhook == 'buy' ? '????' : '????';
                    await telegram.log(`${iconLongShortAlert} => Min new: ${Number(minMarkPrice)} USDT`);
                }
            } else {
                isChangeDCA = process.env.Webhook;
                const NumberDCAPrice = Number(DCAPrice).toFixed(2);

                //Push to array
                if (NumberDCAPrice != 0) {
                    if (NumberDCAPrice > 0) {
                        DCALong.push(NumberDCAPrice);
                        await telegram.log(`???? => DCAPrice push: ${NumberDCAPrice}`);
                        await telegram.log(`???? => DCALong: ${DCALong.toString()}`);
    
                        if (DCALong.length < 5) {
                            var tttmp = 0;
                            for (let index = 0; index < DCALong.length; index++) {
                                tttmp = Number(tttmp) + Number(DCALong[index]);
                            }
                            DCALongTotalPrice_ = Number(Number(tttmp) / Number(DCALong.length)).toFixed(2);
                        } else {
                            DCALongStringPrice = `${Number(DCALong[DCALong.length - 1])};${Number(DCALong[DCALong.length - 2])};${Number(DCALong[DCALong.length - 3])};${Number(DCALong[DCALong.length - 4])};${Number(DCALong[DCALong.length - 5])}`;
                            DCALongTotalPrice = Number((Number(DCALong[DCALong.length - 1]) + Number(DCALong[DCALong.length - 2]) + Number(DCALong[DCALong.length - 3]) + Number(DCALong[DCALong.length - 4]) + Number(DCALong[DCALong.length - 5])) / 5).toFixed(2);
                            DCALongTotalPrice_ = DCALongTotalPrice;
                            DCALongTotalPrice = Number(DCALongTotalPrice) < DCALongTotalPriceMin ? DCALongTotalPriceMin : Number(DCALongTotalPrice);
                            DCALongTotalPrice = Number(DCALongTotalPrice) > DCALongTotalPriceMax ? DCALongTotalPriceMax : Number(DCALongTotalPrice);
                        }
                    } else {
                        DCAShort.push(NumberDCAPrice);
                        await telegram.log(`???? => DCAPrice push: ${NumberDCAPrice}`);
                        await telegram.log(`???? => DCAShort: ${DCAShort.toString()}`);
    
                        if (DCAShort.length < 5) {
                            var tttmp = 0;
                            for (let index = 0; index < DCAShort.length; index++) {
                                tttmp = Number(tttmp) + Number(DCAShort[index]);
                            }
                            DCAShortTotalPrice_ = Number(Number(tttmp) / Number(DCAShort.length)).toFixed(2);
                        } else {
                            DCAShortStringPrice = `${Number(DCAShort[DCAShort.length - 1])};${Number(DCAShort[DCAShort.length - 2])};${Number(DCAShort[DCAShort.length - 3])};${Number(DCAShort[DCAShort.length - 4])};${Number(DCAShort[DCAShort.length - 5])}`;
                            DCAShortTotalPrice = Number((Number(DCAShort[DCAShort.length - 1]) + Number(DCAShort[DCAShort.length - 2]) + Number(DCAShort[DCAShort.length - 3]) + Number(DCAShort[DCAShort.length - 4]) + Number(DCAShort[DCAShort.length - 5])) / 5).toFixed(2);
                            DCAShortTotalPrice_ = DCAShortTotalPrice;
                            DCAShortTotalPrice = Number(DCAShortTotalPrice) > DCAShortTotalPriceMin ? DCAShortTotalPriceMin : Number(DCAShortTotalPrice);
                            DCAShortTotalPrice = Number(DCAShortTotalPrice) < DCAShortTotalPriceMax ? DCAShortTotalPriceMax : Number(DCAShortTotalPrice);
                        }
                    }
                }
            }
            binanceIsLockAlert = 0;
        } catch (e) {
            binanceIsLockAlert = 0;
            console.log(e);
        }
    });

    const Refresh = new WebSocket('wss://fstream.binance.com/ws/btcusdt@markPrice@1s');
    Refresh.on('message', async (event) => {
        try {
            const priceTrade = await binance.FuturesBalance();
            totalUSDT = process.env.Webhook == "" ? 0 : Number(priceTrade) - Number(totalUSDTBefore);
            process.env.Webhookud = Number(totalUSDT).toFixed(2);

            const Ps = (await binance.FuturesPositionRisk(binanceSymbol))[0];
            process.env.Webhookud_ = Number(Ps.unRealizedProfit);

            const markPrice = Number(Ps.markPrice).toFixed(2);
            var DCALongStringPriceTmp = DCALong.length < 5 ? DCALong.toString().replace(',', ';') : DCALongStringPrice;
            var DCAShortStringPriceTmp = DCAShort.length < 5 ? DCAShort.toString().replace(',', ';') : DCAShortStringPrice;
            var price = Number(Ps.positionAmt) == 0 ? 0 : Number(Number(markPrice) - Number(entryPricePre)).toFixed(2);
            var priceNow = checkTrend == "" ? 0 : Number(Number(markPrice) - Number(entryPricePre)).toFixed(2);
            var checkTrendIcon = checkTrend == "" ? '???' : checkTrend == "buy" ? '????' : '????';

            var oc = ["_price", "_priceNow", "_markPrice", "_totalUSDTBefore", "_totalUSDTTrade", "_totalUSDT", "_tmpTotalUSDT", "_checkTrendIcon", "_DCAPrice", "_entryPricePre", "_minMarkPrice", "_bestMarkPrice", "_DCALongLength", "_DCALongStringPrice", "_DCALongTotalPrice_", "_DCALongTotalPrice", "_DCAShortLength", "_DCAShortStringPrice", "_DCAShortTotalPrice_", "_DCAShortTotalPrice", "time_in"];
            var nc = [
                price,
                priceNow,
                markPrice,
                Number(totalUSDTBefore).toFixed(2),
                Number(priceTrade).toFixed(2),
                Number(totalUSDT).toFixed(2),
                Ps.unRealizedProfit,
                checkTrendIcon,
                DCAPrice,
                entryPricePre,
                minMarkPrice,
                bestMarkPrice,
                DCALong.length,
                DCALongStringPriceTmp,
                Number(DCALongTotalPrice_),
                Number(DCALongTotalPrice),
                DCAShort.length,
                DCAShortStringPriceTmp,
                Number(DCAShortTotalPrice_),
                Number(DCAShortTotalPrice),
                common.GetMoment()
            ];

            process.env.binanceAlertDetail = common.ReplaceTextByTemplate(oc, nc, './telegram/contents/alert_template.txt');

            var timeSetup = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
            if (timeSetup.indexOf(common.GetMomentSecond()) >= 0) {
                await telegram.logAlert(oc, nc);
            }
        } catch (e) {
            console.log(e);
        }
    });

    const Trading = new WebSocket('wss://fstream.binance.com/ws/btcusdt@markPrice@1s');
    Trading.on('message', async (event) => {
        try {
            if (binanceIsLock != 0) {
                return;
            }
            binanceIsLock = 1;

            if (process.env.Webhook == '') {
                binanceIsLock = 0;
                return;
            }

            if (process.env.Webhook == checkTrend) {
                binanceIsLock = 0;
                return;
            }
            checkTrend = process.env.Webhook;
            
            const Ps = (await binance.FuturesPositionRisk(binanceSymbol))[0];

            if (process.env.Webhook == 'buy') {
                if (Ps.positionAmt <= 0) {
                    if (DayNoTradeSetup.indexOf(common.GetDay()) >= 0) {
                        await binance.FuturesClosePositions(binanceSymbol);
                        await telegram.log(`???${binanceSymbol} ${binanceChart} ????ng v??? th??? t???m ng???ng trade!`);
                    } else {
                        const binanceOpen = await binance.FuturesOpenPositionsTP(binanceSymbol, Number(process.env.binanceQuantity), 'BUY');
                        await telegram.log(`????${binanceSymbol} ${binanceChart}. E: ${Number(binanceOpen.entryPrice).toFixed(2)} USDT`);
                    }
                }
            } else {
                if (Ps.positionAmt >= 0) {
                    if (DayNoTradeSetup.indexOf(common.GetDay()) >= 0) {
                        await binance.FuturesClosePositions(binanceSymbol);
                        await telegram.log(`???${binanceSymbol} ${binanceChart} ????ng v??? th??? t???m ng???ng trade!`);
                    } else {
                        const binanceOpen = await binance.FuturesOpenPositionsTP(binanceSymbol, Number(process.env.binanceQuantity), 'SELL');
                        await telegram.log(`????${binanceSymbol} ${binanceChart}. E: ${Number(binanceOpen.entryPrice).toFixed(2)} USDT`);
                    }
                }
            }

            const checkPs = await binance.FuturesCheckPositions(binanceSymbol, Number(DCALongTotalPrice), Number(DCAShortTotalPrice));
            if (checkPs != "") {
                await telegram.log(checkPs);
            }

            binanceIsLock = 0;
        } catch (e) {
            binanceIsLock = 0;
            await telegram.log(`??? ${e}`);
        }
    });

    const CloseTradingSoon = new WebSocket('wss://fstream.binance.com/ws/btcusdt@markPrice@1s');
    CloseTradingSoon.on('message', async (event) => {
        try {
            if (binanceIsLockSoon != 0) {
                return;
            }
            binanceIsLockSoon = 1;

            const Ps = (await binance.FuturesPositionRisk(binanceSymbol))[0];

            /*Take Profit Soon*/
            if (Ps.positionAmt != 0) {
                const CheckTP = await binance.FuturesCheckTP(binanceSymbol);
                if (CheckTP == 0) {
                    /*Long*/
                    if (Ps.positionAmt > 0) {
                        if (Number(Ps.entryPrice) + Number(DCALongTotalPrice) < Number(Ps.markPrice)) {
                            await binance.FuturesMarketBuySell(binanceSymbol, Number(Ps.positionAmt), 'SELL');
                            const binanceClose = (await binance.FuturesPositionRisk(binanceSymbol))[0];
                            await telegram.log(`???????????ng v??? th??? ${binanceSymbol} ${binanceChart} s???m t???i gi?? ${Number(binanceClose.markPrice).toFixed(2)} USDT`);
                        }
                    }
                    /*Short*/
                    else {
                        if (Number(Ps.entryPrice) + Number(DCAShortTotalPrice) > Number(Ps.markPrice)) {
                            await binance.FuturesMarketBuySell(binanceSymbol, Number(Ps.positionAmt), 'BUY');
                            const binanceClose = (await binance.FuturesPositionRisk(binanceSymbol))[0];
                            await telegram.log(`???????????ng v??? th??? ${binanceSymbol} ${binanceChart} s???m t???i gi?? ${Number(binanceClose.markPrice).toFixed(2)} USDT`);
                        }
                    }
                }
            }

            binanceIsLockSoon = 0;
        } catch (e) {
            binanceIsLockSoon = 0;
            await telegram.log(`??? ${e}`);
        }
    });
}

module.exports = { Main }