require('dotenv').config({ path: 'env/live.env' });
var express       = require('express');
var router        = express.Router();
var bodyParser    = require('body-parser');
var telegram      = require('./telegram/telegram');

/* GET home page. */
router.get('/', function (req, res, next) {
    res.json({ message: 'Welcome to Crypto Currency' });
    res.end();
});

router.post('/webhooktrade', bodyParser.text(), function (req, res) {
    try {
        process.env.Webhook = req.body;
        res.end();
    } catch (error) {
        res.end();
    }
});

module.exports = router;