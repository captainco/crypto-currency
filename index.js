require('dotenv').config({ path: 'env/live.env' });
var express       = require('express');
var router        = express.Router();
var bodyParser    = require('body-parser');
var telegram      = require("./telegram/telegram");

/* GET home page. */
router.get('/', function (req, res, next) {
    res.json({ message: 'Welcome to Crypto Currency' });
    res.end();
});

router.post('/webhook1m', bodyParser.text(), function (req, res) {
    try {
        process.env.Webhook1m = req.body;
        res.end();
    } catch (error) {
        telegram.log(`POST Webhook1m: ${error}`);
        res.end();
    }
});

router.post('/webhook5m', bodyParser.text(), function (req, res) {
    try {
        process.env.Webhook5m = req.body;
        res.end();
    } catch (error) {
        telegram.log(`POST Webhook5m: ${error}`);
        res.end();
    }
});

router.post('/webhook15m', bodyParser.text(), function (req, res) {
    try {
        process.env.Webhook15m = req.body;
        res.end();
    } catch (error) {
        telegram.log(`POST Webhook15m: ${error}`);
        res.end();
    }
});

router.post('/webhook30m', bodyParser.text(), function (req, res) {
    try {
        process.env.Webhook30m = req.body;
        res.end();
    } catch (error) {
        telegram.log(`POST Webhook30m: ${error}`);
        res.end();
    }
});

router.post('/webhook1h', bodyParser.text(), function (req, res) {
    try {
        process.env.Webhook1h = req.body;
        res.end();
    } catch (error) {
        telegram.log(`POST Webhook1h: ${error}`);
        res.end();
    }
});

module.exports = router;