require('dotenv').config({ path: 'env/live.env' });

const binanceCC1m                    = require('./binance/binanceCC1m');
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
    binanceCC1m.Main();
}

main();