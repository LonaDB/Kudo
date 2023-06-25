
/*
This is currently being ported from ShinoaDB
Dont do anything on this until this comment disappears

Nothing will work at this point!
*/

let Main = require("./Utils/Main");

let fs = require("fs");
const readline = require('readline');
let BSON = require("bson");

process.stdout.write('\033c');

function askQuestion(query) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise(resolve => rl.question(query, ans => {
        rl.close();
        resolve(ans);
    }))
}

async function checkConfig(){
    if (fs.existsSync("./config.json")) return;
    else {
        let ip = await askQuestion("What is the IP/Host your LonaDB instance is running on? \n");
        let port = await askQuestion("What port is your LonaDB instance running on? \n");
        let username = await askQuestion("What is your Administrator user username? (initial user) \n");
        let password = await askQuestion("What is your Administrator user password? (initial user) \n");
        let ownport = await askQuestion("What port do you want the Web Interface to run on? \n");
        fs.writeFileSync("./config.json", JSON.stringify({
            "ip": ip, 
            "port": parseInt(port),
            "username": username,
            "password": password,
            "ownport": parseInt(ownport)
        }));
    }
}

async function start() {

    await checkConfig();

    let config = JSON.parse(fs.readFileSync("./config.json", "utf-8"));
    let kudo = new Main(config);
    console.log("\
[Note] LonaDB is still in the beta.\n\
[Note] Visit us on GitHub! \n\
[URL] https://github.com/LonaDB \n\
    ");
    
    kudo.start();

}

start();