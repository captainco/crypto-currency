const moment = require('moment-timezone');
const _      = require('lodash');
const fs     = require('fs');

moment.tz.setDefault("Asia/Ho_Chi_Minh");

function WriteConsoleLog(content) {
    const dateTime = moment(Date.now()).format("DD/MM/YYYY HH:mm:ss:SSS");
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

function GetDay() {
    // 0 => Chủ nhật
    // 1 => Thứ 2
    // 2 => Thú 3
    // 3 => Thứ 4
    // 4 => Thứ 5
    // 5 => Thứ 6
    // 6 => Thứ 7
    var date = new Date();
    return Number(date.getDay());
}

module.exports = {
    WriteConsoleLog,
    GetMoment,
    GetMomentSecond,
    ReplaceTextByTemplate,
    NumDigitsAfterDecimal,
    FormatNumberToString,
    GetDay
}