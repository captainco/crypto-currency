const moment                = require('moment');
const _                     = require('lodash');
const fs                    = require('fs');

const envTelegramMyTelegram = process.env.envTelegramMyTelegram;

function WriteConsoleLog(content) {
    const dateTime = moment(Date.now()).format("DD/MM/YYYY HH:mm:ss");
    console.log(dateTime + " => " + content);
}

function GetMoment() {
    return moment(Date.now()).format("DD/MM/YYYY HH:mm:ss");
}

function GetTelegramMessage(ctxTelegramMessage, command) {
    return _.replace(_.get(ctxTelegramMessage, 'update.message.text'), `/${command}`, '').trim();
}

function CheckTelegramMessage(message) {
    if (message == "") {
        return "Cú pháp chưa đúng";
    }
    return "";
}

function ReplaceTextByTemplate(oldChar, newChar, templatePath) {
    if (oldChar.length == 0) return "";

    var output = fs.readFileSync(templatePath, 'utf8');
    for (let index = 0; index < oldChar.length; index++) {
        const oc = oldChar[index];
        const nc = newChar[index];
        output = output.replace(oc, nc);
    }
    return output;
}

function IsMyTelegramAccount(telegramId) {
    return _.get(telegramId, 'update.message.from.id') == envTelegramMyTelegram;
}

module.exports = {
    WriteConsoleLog,
    GetMoment,
    GetTelegramMessage,
    CheckTelegramMessage,
    IsMyTelegramAccount,
    ReplaceTextByTemplate
}