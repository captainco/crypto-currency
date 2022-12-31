require('dotenv').config({ path: '../env/live.env' });
const binance              = require('./binance');

async function Main() {
    // const Trading = new WebSocket('wss://fstream.binance.com/ws/btcusdt@markPrice@1s');
    // Trading.on('message', async (event) => {
        
    // });
    
    const result = await binance.FuturesHedgeModeMarketLongBuySell("BTCUSDT", 0.001, "BUY");
    console.log(result);
}

module.exports = { Main }