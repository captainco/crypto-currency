require('dotenv').config({ path: 'env/live.env' });

const binanceCC                      = require('./binance/binanceCC');
const binanceCC1mDynamic             = require('./binance/binanceCC1m-Dynamic');
const binanceCC1mDynamicTest         = require('./binance/binanceCC1m-DynamicTest');
const binanceCC1m                    = require('./binance/binanceCC1m');
const binanceCC5m                    = require('./binance/binanceCC5m');
const binanceCC15m                   = require('./binance/binanceCC15m');
const binanceCC30m                   = require('./binance/binanceCC30m');
const binanceCC1h                    = require('./binance/binanceCC1h');
const common                         = require('./common');
const indexRouter                    = require('./index');
const express                        = require("express");
const http                           = require("http");
const app                            = express();
const port                           = process.env.PORT || 8080;
app.use('/', indexRouter);
app.set('port', port);
const server                         = http.createServer(app);
server.listen(port);

async function main() {
    // binanceCC1m.Main();
    // binanceCC5m.Main();
    // binanceCC15m.Main();
    // binanceCC30m.Main();
    // binanceCC1h.Main();

    //binanceCC1mDynamic.Main();
    binanceCC1mDynamicTest.Main();
    //binanceCC.Main();
}

main();