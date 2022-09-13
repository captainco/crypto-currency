const moment                = require('moment-timezone');
const _                     = require('lodash');
const fs                    = require('fs');
const {sendMessage, log}    = require("./telegram/telegram");

moment.tz.setDefault("Asia/Ho_Chi_Minh");
const envTelegramMyTelegram = process.env.envTelegramMyTelegram;

function WriteConsoleLog(content) {
    const dateTime = moment(Date.now()).format("DD/MM/YYYY HH:mm:ss");
    console.log(dateTime + " => " + content);
}

function GetMoment() {
    return moment(Date.now()).format("DD/MM/YYYY HH:mm:ss");
}

function GetMomentSecond() {
    return Number(moment(Date.now()).format("ss"));
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

function ConvertToPositiveNumber(number) {
    return number < 0 ? number * -1 : number;
}

module.exports = {
    WriteConsoleLog,
    GetMoment,
    GetMomentSecond,
    ReplaceTextByTemplate,
    ConvertToPositiveNumber
}