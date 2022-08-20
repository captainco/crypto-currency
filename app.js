require('dotenv').config({ path: 'env/live.env' });
const envFunction = process.env.envFunction;
const telegram = require('./telegram');

function main() {
    switch (envFunction.toLocaleUpperCase()) {
        case "TW_COPY":
            
            break;
    }
}

main();