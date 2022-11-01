require('dotenv').config({ path: 'env/live.env' });
const binance               = require('./binance/binance');

async function main() {
    const binanceOpen = await binance.FuturesOpenPositionsTPSL('BTCUSDT', 0.001, 5, 5, 'BUY');
    console.log(binanceOpen);
}

main();