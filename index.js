var express       = require('express');
var router        = express.Router();
const body_parser = require('body-parser');
const telegram    = require("./telegram/telegram");

/* GET home page. */
router.get('/home', function (req, res, next) {
    res.json({ message: 'Welcome to Crypto Currency' });
    res.end();
});

router.get('/webhook', function (req, res) {
    telegram.log(`GET webhook: ${req.body}`);
    // let strategyOrderAction = req.query["strategy.order.action"];
    // let strategyOrderContracts = req.query["strategy.order.contracts"];
    // let ticker = req.query["ticker"];
    // let strategyPositionSize = req.query["strategy.position_size"];
    // let message = `Open Close Cross Strategy R5.1 revised by JustUncleL (3, SMMA, 8, 6, 0.85, 0, BOTH, 0, 0, 10000): order ${strategyOrderAction} @ ${strategyOrderContracts} filled on ${ticker}. New strategy position is ${strategyPositionSize}`;

    // res.json({
    //     strategyOrderAction: strategyOrderAction,
    //     strategyOrderContracts: strategyOrderContracts,
    //     ticker: ticker,
    //     strategyPositionSize: strategyPositionSize,
    //     message: message
    // });
    // res.end();
});

router.post('/webhook', function (req, res) {
    telegram.log(`POST webhook: ${req.body}`);
    // let strategyOrderAction = req.query["strategy.order.action"];
    // let strategyOrderContracts = req.query["strategy.order.contracts"];
    // let ticker = req.query["ticker"];
    // let strategyPositionSize = req.query["strategy.position_size"];
    // let message = `Open Close Cross Strategy R5.1 revised by JustUncleL (3, SMMA, 8, 6, 0.85, 0, BOTH, 0, 0, 10000): order ${strategyOrderAction} @ ${strategyOrderContracts} filled on ${ticker}. New strategy position is ${strategyPositionSize}`;

    // res.json({
    //     strategyOrderAction: strategyOrderAction,
    //     strategyOrderContracts: strategyOrderContracts,
    //     ticker: ticker,
    //     strategyPositionSize: strategyPositionSize,
    //     message: message
    // });
    // res.end();
});

module.exports = router;