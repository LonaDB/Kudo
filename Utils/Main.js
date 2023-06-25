let WebManager = require(__dirname + "/WebManager");

module.exports = class{
    constructor(config){
        this.version = "1.0.3";

        this.config = config;
        
        this.webManager = new WebManager(this);
    }

    start = async () =>{
        this.webManager.startSocket();
    }
}