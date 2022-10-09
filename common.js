const moment = require('moment-timezone');
const _ = require('lodash');
const fs = require('fs');

moment.tz.setDefault("Asia/Ho_Chi_Minh");

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
    return Math.abs(number);
}

function NumDigitsAfterDecimal(x) {
    var afterDecimalStr = x.toString().split('.')[1] || '';
    return afterDecimalStr.length;
}

function FormatNumberToString(num) {
    var output = "";
    if (Math.abs(num) < 1000) {
        output = num;
    }else if (Math.abs(num) >= 1000 && Math.abs(num) < 1000000) {
        output = Math.sign(num) * ((Math.abs(num) / 1000).toFixed(2)) + 'K';
    }
    else if(Math.abs(num) >= 1000000 && Math.abs(num) < 1000000000) {
        output = Math.sign(num) * ((Math.abs(num) / 1000000).toFixed(2)) + 'M';
    }
    else {
        output = Math.sign(num) * ((Math.abs(num) / 1000000000).toFixed(2)) + 'B';
    }
    return output;
}

module.exports = {
    WriteConsoleLog,
    GetMoment,
    GetMomentSecond,
    ReplaceTextByTemplate,
    ConvertToPositiveNumber,
    NumDigitsAfterDecimal,
    FormatNumberToString
}