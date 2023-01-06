require('dotenv').config({ path: '../env/live.env' });
const telegram             = require("../telegram/telegram");
const WebSocket            = require("ws");
const binance              = require('./binance');

var binanceStartApp        = 0;
var binanceIsLockRefresh   = 0;
var binanceIsLockLong      = 0;
var binanceIsLockShort     = 0;

var totalUSDT              = 0;
var totalUSDTBefore        = 0;

var checkTrendLong         = "";
var checkTrendShort        = "";

async function Main() {

    const Refresh = new WebSocket('wss://fstream.binance.com/ws/btcusdt@markPrice@1s');
    Refresh.on('message', async (event) => {
        try {
            if (binanceIsLockRefresh != 0) {
                return;
            }
            binanceIsLockRefresh = 1;

            if (binanceStartApp == 0) {
                binanceStartApp = 1;
    
                await binance.FuturesLeverage(process.env.binanceSymbol, Number(process.env.binanceLeverage));
                await telegram.log(`✅ Đòn bẩy ${process.env.binanceSymbol} hiện tại: ${process.env.binanceLeverage}x.`);
    
                const priceBeforeTrade = await binance.FuturesBalance();
                totalUSDTBefore = Number(priceBeforeTrade);
            }
    
            const priceTrade = await binance.FuturesBalance();
            totalUSDT = process.env.Webhook == "" ? 0 : Number(priceTrade) - Number(totalUSDTBefore);
            process.env.Webhookud = Number(totalUSDT).toFixed(2);
    
            const PsLong = await binance.FuturesHedgeModePositionRiskLong(process.env.binanceSymbol);
            const PsShort = await binance.FuturesHedgeModePositionRiskShort(process.env.binanceSymbol);
            process.env.Webhookud_ = Number(PsLong.unRealizedProfit) + Number(PsShort.unRealizedProfit);
            
            binanceIsLockRefresh = 0;
        } catch (e) {
            binanceIsLockRefresh = 0;
        }
    });

    const TradingLong = new WebSocket('wss://fstream.binance.com/ws/btcusdt@markPrice@1s');
    TradingLong.on('message', async (event) => {
        try {
            if (binanceIsLockLong != 0) {
                return;
            }
            binanceIsLockLong = 1;

            //Check trend
            if (checkTrendLong == process.env.Webhook) {
                binanceIsLockLong = 0;
                return;
            }
            checkTrendLong = process.env.Webhook;

            //Trade
            const volConvert = await binance.FuturesConvertToQuantity(process.env.binanceSymbol, process.env.binanceVolume, process.env.binanceLeverage);
            const Ps = await binance.FuturesHedgeModePositionRiskLong(process.env.binanceSymbol);

            if (process.env.binanceBot == "1") {
                switch (checkTrendLong) {
                    case "buy":
                        if (Number(Ps.positionAmt) == 0) {
                            await binance.FuturesHedgeModeMarketLongBuySell(process.env.binanceSymbol, volConvert, "BUY");
                            await telegram.log(`✅ Đã mở lệnh ${process.env.binanceSymbol} 🟢 tại giá ${Number(Ps.markPrice).toFixed(2)} USDT.`);
                        }
                        else {
                            if (Number(Ps.entryPrice) > Number(Ps.markPrice)) {
                                await binance.FuturesHedgeModeMarketLongBuySell(process.env.binanceSymbol, volConvert, "BUY");
                                await telegram.log(`✅ Đã DCA lệnh ${process.env.binanceSymbol} 🟢 tại giá ${Number(Ps.markPrice).toFixed(2)} USDT.`);
                            }
                        }
                        break;
    
                    case "sell":
                        if (Number(Ps.entryPrice) < Number(Ps.markPrice)) {
                            await binance.FuturesHedgeModeMarketLongBuySell(process.env.binanceSymbol, Ps.positionAmt, "SELL");
                            await telegram.log(`✅ Đã đóng lệnh ${process.env.binanceSymbol} 🟢 tại giá ${Number(Ps.markPrice).toFixed(2)} USDT.`);
                        }
                        break;
                }
            }
            
            binanceIsLockLong = 0;
        } catch (e) {
            binanceIsLockLong = 0;
        }
    });

    const TradingShort = new WebSocket('wss://fstream.binance.com/ws/btcusdt@markPrice@1s');
    TradingShort.on('message', async (event) => {
        try {
            if (binanceIsLockShort != 0) {
                return;
            }
            binanceIsLockShort = 1;

            //Check trend
            if (checkTrendShort == process.env.Webhook) {
                binanceIsLockShort = 0;
                return;
            }
            checkTrendShort = process.env.Webhook;

            //Trade
            const volConvert = await binance.FuturesConvertToQuantity(process.env.binanceSymbol, process.env.binanceVolume, process.env.binanceLeverage);
            const Ps = await binance.FuturesHedgeModePositionRiskShort(process.env.binanceSymbol);
            
            if (process.env.binanceBot == "1") {
                switch (checkTrendShort) {
                    case "buy":
                        if (Number(Ps.entryPrice) > Number(Ps.markPrice)) {
                            await binance.FuturesHedgeModeMarketShortBuySell(process.env.binanceSymbol, Ps.positionAmt, "BUY");
                            await telegram.log(`✅ Đã đóng lệnh ${process.env.binanceSymbol} 🔴 tại giá ${Number(Ps.markPrice).toFixed(2)} USDT.`);
                        }
                        break;
    
                    case "sell":
                        if (Number(Ps.positionAmt) == 0) {
                            await binance.FuturesHedgeModeMarketShortBuySell(process.env.binanceSymbol, volConvert, "SELL");
                            await telegram.log(`✅ Đã mở lệnh ${process.env.binanceSymbol} 🔴 tại giá ${Number(Ps.markPrice).toFixed(2)} USDT.`);
                        }
                        else {
                            if (Number(Ps.entryPrice) < Number(Ps.markPrice)) {
                                await binance.FuturesHedgeModeMarketShortBuySell(process.env.binanceSymbol, volConvert, "SELL");
                                await telegram.log(`✅ Đã DCA lệnh ${process.env.binanceSymbol} 🔴 tại giá ${Number(Ps.markPrice).toFixed(2)} USDT.`);
                            }
                        }
                        break;
                }
            }
            
            binanceIsLockShort = 0;
        } catch (e) {
            binanceIsLockShort = 0;
        }
    });
}

module.exports = { Main }