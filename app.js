require('dotenv').config({ path: 'env/live.env' });

const binanceTestEma                 = require('./binance/binanceTestEma');
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
    binanceTestEma.Main();
}

//main();