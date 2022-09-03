require('dotenv').config({ path: 'env/live.env' });

const binanceAutoTakeProfitByPercent = require('./binance/binanceAutoTakeProfitByPercent');
const telegram                       = require('./telegram/telegram');

const envFunction = process.env.envFunction;

async function main() {
    //binanceAutoTakeProfitByPercent.Main();
}

main();