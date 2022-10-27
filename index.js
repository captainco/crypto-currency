require('dotenv').config({ path: 'env/live.env' });
var express       = require('express');
var router        = express.Router();
var bodyParser    = require('body-parser');
var telegram      = require('./telegram/telegram');
var common        = require('./common')

/* GET home page. */
router.get('/', function (req, res, next) {
    res.json({ message: 'Welcome to Crypto Currency' });
    common.WriteConsoleLog('Welcome to Crypto Currency');
    res.end();
});

router.get('/webhook', bodyParser.text(), function (req, res) {
    try {
        common.WriteConsoleLog(`GET webhook: TEST`);
        telegram.log(`GET webhook: TEST`);
        res.json({ message: 'GET webhook: TEST' });
        res.end();
    } catch (error) {
        common.WriteConsoleLog(`GET webhook: ${error}`);
        telegram.log(`GET webhook: ${error}`);
        res.end();
    }
});

router.post('/webhook', bodyParser.text(), function (req, res) {
    try {
        common.WriteConsoleLog(`POST webhook: TEST`);
        telegram.log(`POST webhook: TEST`);
        res.json({ message: 'POST webhook: TEST' });
        res.end();
    } catch (error) {
        common.WriteConsoleLog(`POST webhook: ${error}`);
        telegram.log(`POST webhook: ${error}`);
        res.end();
    }
});

router.post('/webhooktrade', bodyParser.text(), function (req, res) {
    try {
        process.env.Webhook = req.body;
        telegram.log(`POST #Webhook: ${req.body}`);
        res.end();
    } catch (error) {
        res.end();
    }
});

module.exports = router;