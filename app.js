require('dotenv').config({ path: 'env/live.env' });

const binanceAutoTakeProfitByPercent = require('./binance/binanceAutoTakeProfitByPercent');
const binanceTradeRSI                = require('./binance/binanceTradeRSI');

const indexRouter                    = require('./index');
const express                        = require("express");
const http                           = require("http");
const app                            = express();
const port                           = process.env.PORT || 8080;
app.use('/', indexRouter);
app.set('port', port);
const server                         = http.createServer(app);
server.listen(port);

const envFunction = process.env.envFunction;

async function main() {
    //binanceAutoTakeProfitByPercent.Main();
    binanceTradeRSI.Main().then();
}

main();