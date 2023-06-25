var express = require('express');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var path = require("path");
const { allowedNodeEnvironmentFlags } = require('process');

var lonadb = require("lonadb-client");

module.exports = class {
    constructor(kudo){
        this.kudo = kudo;
        this.lonadb = new lonadb(this.kudo.config.host, this.kudo.config.port, this.kudo.config.username, this.kudo.config.password);
        this.app = express();

        this.app.set('view engine', 'html');
        this.app.engine('html', require('hbs').__express);

        this.app.set('views', path.join(__dirname, 'views'));
        this.app.use(express.static(path.join(__dirname, 'public')));
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

            let passCheck = await this.lonadb.checkPassword(req.cookies.name, req.cookies.password);
            if(!passCheck) {
                res.clearCookie('password');
                res.clearCookie('name');
                res.redirect('/login');
                return;
            }
        
            var json = await this.lonadb.getTables();
            
            res.render('index.hbs', {
                title: "LonaDB | Web Interface",
                tables: json
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
                res.cookie("password", req.body.password)
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
            if (req.body.set !== '') cmd = 'set'
            if (req.body.delete == "Delete") cmd = "delete"
            if (req.body.create == 'Create') cmd = 'create'
            if (req.cookies.password !== config.password) return res.render('login.hbs', {
                title: "LonaDB | Login",
            });
        
            switch (cmd) {
                case 'set':
                    if (req.body.name == 'password') return res.render('error.hbs', {
                        title: "LonaDB | Web Interface",
                        dataBase: dbCollection.getJson(),
                        err: "Cant change Password in Web. Change in Config.json"
                    });
                    dbCollection.set(req.body.name, req.body.set, config.password);
                    await delay(100);
                    dbCollection.save('./data.json');
                    break;
                case 'delete':
                    if (req.body.name == 'password') return res.render('error.hbs', {
                        title: "LonaDB | Web Interface",
                        dataBase: dbCollection.getJson(),
                        err: "Cant change Password in Web. Change in Config.json"
                    });
                    dbCollection.delete(req.body.name);
                    await delay(100);
                    dbCollection.save('./data.json');
                    break;
                case 'create':
                    if (dbCollection.get(req.body.name) !== undefined) return res.render('error.hbs', {
                        title: "ShinoaDB | Web Interface",
                        dataBase: dbCollection.getJson(),
                        err: "Key already exists"
                    });
                    dbCollection.set(req.body.name, req.body.set);
                    await delay(100);
                    dbCollection.save('./data.json');
                    break;
            }
        
            await delay(100);
            res.redirect('/');
        });
    }

    startSocket = async function () {
        var server = this.app.listen(this.kudo.config.ownport, () => {
            console.log('WebSocket listening on port ' + this.kudo.config.ownport);
        });
    }
}