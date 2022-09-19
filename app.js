require('dotenv').config({ path: 'env/live.env' });

const binanceAutoTakeProfitByPercent = require('./binance/binanceAutoTakeProfitByPercent');
const binanceTradeRSI                = require('./binance/binanceTradeRSI');
const binanceTradeLiquid             = require('./binance/binanceTradeLiquid');
const indexRouter                    = require('./index');
const express                        = require("express");
const http                           = require("http");
const app                            = express();
const port                           = process.env.PORT || 8081;
app.use('/', indexRouter);
app.set('port', port);
const server                         = http.createServer(app);
server.listen(port);

async function main() {
    //binanceAutoTakeProfitByPercent.Main();
    //binanceTradeRSI.Main();
    binanceTradeLiquid.Main();
}

main();