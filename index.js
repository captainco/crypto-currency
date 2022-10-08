var express       = require('express');
var router        = express.Router();
const body_parser = require('body-parser');
const telegram    = require("./telegram/telegram");

/* GET home page. */
router.get('/', function (req, res, next) {
    res.json({ message: 'Welcome to Crypto Currency' });
    res.end();
});

router.post('/webhook', function (req, res) {
    try {
        telegram.log(`POST webhook: Test`);
        telegram.log(`POST webhook: ${req.body}`);
        res.end();
    } catch (error) {
        telegram.log(`POST webhook: ${error}`);
    }
});

module.exports = router;