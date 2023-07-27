var express = require('express');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var path = require("path");
const { allowedNodeEnvironmentFlags } = require('process');

var Crypto = require("crypto-js");
var lonadb = require("lonadb-client");

const encrypt = async (string, key) => {
    let encrypted = await Crypto.AES.encrypt(string, key).toString();
    return encrypted;
}
const decrypt = async (buffer, key) => {
    let decrypted = await Crypto.AES.decrypt(buffer, key).toString(Crypto.enc.Utf8);
    return decrypted;
}

module.exports = class {
    constructor(kudo){
        this.kudo = kudo;
        this.lonadb = new lonadb(this.kudo.config.host, this.kudo.config.port, this.kudo.config.username, this.kudo.config.password);
        this.app = express();

        this.app.set('view engine', 'html');
        this.app.engine('html', require('hbs').__express);

        this.app.set('views', path.join(__dirname, 'views'));
        this.app.use('/assets', express.static(path.join(__dirname, 'assets')));
        this.app.use(cookieParser());
        this.app.use(bodyParser.urlencoded({
            extended: true
        }));
        this.app.use(bodyParser.json());

        this.registerPaths();
        this.registerCommands();
    }

    registerPaths = async function(){
        this.app.get('/', async (req, res) => {
            if (!req.cookies.password || !req.cookies.name) return res.redirect('/login');

            let passCheck = await this.lonadb.checkPassword(req.cookies.name, await decrypt(req.cookies.password, this.kudo.config.username));

            if(!passCheck) {
                res.clearCookie('password');
                res.clearCookie('name');
                res.redirect('/login');
                return;
            }
        
            var json = await this.lonadb.getTables();
            var createTable = await this.lonadb.checkPermission(req.cookies.name, "table_create");
            var createUser = await this.lonadb.checkPermission(req.cookies.name, "user_create");
            
            res.render('index.hbs', {
                title: "LonaDB | Web Interface",
                tables: json,
                username: req.cookies.name,
                createUserPerm: createUser,
                createTablePerm: createTable
            });
        });

        this.app.get('/table/:name', async (req, res) => {
            if (!req.cookies.password || !req.cookies.name) return res.redirect('/login');

            let passCheck = await this.lonadb.checkPassword(req.cookies.name, await decrypt(req.cookies.password, this.kudo.config.username));

            if(!passCheck) {
                res.clearCookie('password');
                res.clearCookie('name');
                res.redirect('/login');
                return;
            }

            var table = await this.lonadb.getTableData(req.params.name);
            if(table.not_exist) return res.redirect("/");

            res.render('tableView.hbs', {
                title: "LonaDB | " + req.params.name,
                data: table.data,
                table: req.params.name
            });
        });

        this.app.get("/logout", function (req, res) {
            res.clearCookie('password');
            res.clearCookie('name');
            res.redirect('/login');
        });

        this.app.get("/login", function (req, res) {
            res.render('login.hbs', {
                title: "LonaDB | Login"
            });
        });

        this.app.post("/login", async (req, res) => {
            if (req.body.password && req.body.name) {
                let  checkPassLogin = await this.lonadb.checkPassword(req.body.name, req.body.password);
                if(!checkPassLogin) return res.redirect("/login");

                res.cookie("name", req.body.name);
                res.cookie("password", await encrypt(req.body.password, this.kudo.config.username))
                res.redirect('/');
            } else {
                res.render('loginError.hbs', {
                    title: "LonaDB | Login",
                    err: 'wrong password'
                });
            }
        });

    }

    registerCommands = async function () {
        this.app.post('/command', async (req, res) => {
            var cmd = "";

            //CHANGE THIS WHEN YOU HAVE TIME IDIOT
            if (!req.body.command) return res.redirect("/"); 
            let checkPassLogin = await this.lonadb.checkPassword(req.cookies.name, await decrypt(req.cookies.password, this.kudo.config.username));
            if (!checkPassLogin) return res.redirect("/login");

            switch (req.body.command.toLowerCase()){
                case "create user":
                    await this.lonadb.createUser(req.body.userCreateName, req.body.userCreatePassword);
                    res.redirect("/");
                    break;
                case "view table":
                    await res.redirect("/table/" + req.body.tableName);
                    break;
                case "set":
                    await this.lonadb.set(req.body.tableName, req.body.name, req.body.value);
                    res.redirect("/table/" + req.body.tableName);
                    break;
                case "create table":
                    await this.lonadb.createTable(req.body.tableCreateName);
                    res.redirect("/table/" + req.body.tableCreateName);
                    break;
                default:
                    res.redirect("/");
                    break;
            }
        });
    }

    startSocket = async function () {
        var server = this.app.listen(this.kudo.config.ownport, () => {
            console.log('WebSocket listening on port ' + this.kudo.config.ownport);
        });
    }
}