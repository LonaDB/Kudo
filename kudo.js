
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

function askQuestion(query, hide) {
    var rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      rl.input.on("keypress", function (c, k) {
        if(hide){
            // get the number of characters entered so far:
            var len = rl.line.length;
            // move cursor back to the beginning of the input:
            readline.moveCursor(rl.output, -len, 0);
            // clear everything to the right of the cursor:
            readline.clearLine(rl.output, 1);
            // replace the original input with asterisks:
            for (var i = 0; i < len; i++) {
            rl.output.write("*");
            }
        }
      });
      

    return new Promise(resolve => {
        rl.question(query, function(answer) {
            rl.close();
            resolve(answer);
          });
    });
}

async function checkConfig(){
    if (fs.existsSync("./config.json")) return;
    else {
        let ip = await askQuestion("What is the IP/Host your LonaDB instance is running on? \n", false);
        let port = await askQuestion("What port is your LonaDB instance running on? \n", false);
        let username = await askQuestion("What is your poweruser's username? \n", false);
        let password = await askQuestion("What is your poweruser's password? \n", true);
        let ownport = await askQuestion("What port do you want the Web Interface to run on? \n", false);
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