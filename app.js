require('dotenv').config({ path: 'env/live.env' });

const binanceAutoTakeProfitByPercent = require('./binance/binanceAutoTakeProfitByPercent');
const binanceTradeRSI                = require('./binance/binanceTradeRSI');
const telegram                       = require('./telegram/telegram');

const indexRouter                    = require('./index');
const express                        = require("express");
const app                            = express();
const port                           = 3000;
app.use('/', indexRouter);
app.set('port', port);
const server                         = http.createServer(app);
server.listen(port);

const envFunction = process.env.envFunction;

async function main() {
    //binanceAutoTakeProfitByPercent.Main();
    binanceTradeRSI.Main();
}

main();