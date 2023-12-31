var express = require('express');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var path = require("path");

var Crypto = require("crypto-js");
var lonadb = require("lonadb-client");

function checkbool (s){
    switch(s.toLowerCase()){
        case "false":
            return false;
            break;
        case "true":
            return true;
            break;
        default:
            return "not a bool";
            break;
    }
}

function checkjson(s){
try {
  JSON.parse(s);
  return true;
} catch (error) {
  return false;
}
}

const getVariable = async (val) => {
    var bool = await checkbool(val);
    var float = await parseFloat(val);
    var json = await checkjson(val);
    console.log(json)
    
    if(bool !== "not a bool") return bool;
    if(!isNaN(float)) return float;
    if(json) return JSON.parse(val);
    return val;
}

const encrypt = async (string, key) => {
    let encrypted = await Crypto.AES.encrypt(string, key).toString();
    return encrypted;
}
const decrypt = async (buffer, key) => {
    let decrypted = await Crypto.AES.decrypt(buffer, key).toString(Crypto.enc.Utf8);
    return decrypted;
}

module.exports = class {
    constructor(kudo) {
        this.kudo = kudo;
        this.lonadb = new lonadb(this.kudo.config.host, this.kudo.config.port, this.kudo.config.username, this.kudo.config.password);
        this.app = express();

        let hbs = require('hbs');

        hbs.registerHelper('json', function(context) {
            if(typeof(context) === typeof({})) return JSON.stringify(context);
            return context;
        });

        this.app.set('view engine', 'html');
        this.app.engine('html', hbs.__express);

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

    registerPaths = async function () {
        this.app.get('/', async (req, res) => {
            if (!req.cookies.password || !req.cookies.name) return res.redirect('/login');

            let passCheck = await this.lonadb.checkPassword(req.cookies.name, await decrypt(req.cookies.password, this.kudo.config.username));

            if (!passCheck) {
                res.clearCookie('password');
                res.clearCookie('name');
                res.redirect('/login?err=login_informations');
                return;
            }

            var json = await this.lonadb.getTables(req.cookies.name);
            var createTable = await this.lonadb.checkPermission(req.cookies.name, "table_create");
            var createUser = await this.lonadb.checkPermission(req.cookies.name, "user_create");
            var deleteUser = await this.lonadb.checkPermission(req.cookies.name, "user_delete");

            var data = {
                title: "LonaDB | Main",
                tables: json,
                username: req.cookies.name,
                createUserPerm: createUser,
                deleteUserPerm: deleteUser,
                createTablePerm: createTable
            }

            if(req.query.err){
                switch(req.query.err){
                    case "missing_permission":
                        data.error = "You are not allowed to do this"
                        break;
                }
            }

            res.render('index.hbs', data);
        });

        this.app.get('/users', async (req, res) => {
            if (!req.cookies.password || !req.cookies.name) return res.redirect('/login');

            let passCheck = await this.lonadb.checkPassword(req.cookies.name, await decrypt(req.cookies.password, this.kudo.config.username));

            if (!passCheck) {
                res.clearCookie('password');
                res.clearCookie('name');
                res.redirect('/login?err=login_informations');
                return;
            }

            var createUser = await this.lonadb.checkPermission(req.cookies.name, "user_create");
            var deleteUser = await this.lonadb.checkPermission(req.cookies.name, "user_delete");
            var usersList = await this.lonadb.getUsers();

            if (!createUser && !deleteUser) return res.redirect("/?err=missing_permission");

            res.render('users.hbs', {
                title: "Lonadb | Users",
                username: req.cookies.name,
                createUserPerm: createUser,
                deleteUserPerm: deleteUser,
                users: usersList
            })
        });

        this.app.get('/user/:name', async (req, res) => {
            if (!req.cookies.password || !req.cookies.name) return res.redirect('/login');

            let passCheck = await this.lonadb.checkPassword(req.cookies.name, await decrypt(req.cookies.password, this.kudo.config.username));

            if (!passCheck) {
                res.clearCookie('password');
                res.clearCookie('name');
                res.redirect('/login?err=login_informations');
                return;
            }

            var permissions = await this.lonadb.getPermissionsRaw(req.params.name);
            if (permissions.not_exist) return res.redirect("/");

            res.render('userManage.hbs', {
                title: "LonaDB | " + req.params.name,
                permissions: permissions.list,
                user: req.params.name,
                username: req.cookies.name,
            });
        })

        this.app.get('/table/:name', async (req, res) => {
            if (!req.cookies.password || !req.cookies.name) return res.redirect('/login');

            let passCheck = await this.lonadb.checkPassword(req.cookies.name, await decrypt(req.cookies.password, this.kudo.config.username));

            if (!passCheck) {
                res.clearCookie('password');
                res.clearCookie('name');
                res.redirect('/login?err=login_informations');
                return;
            }

            var table = await this.lonadb.getTableData(req.params.name);
            if (table.not_exist) return res.redirect("/");

            res.render('tableView.hbs', {
                title: "LonaDB | " + req.params.name,
                data: table.data,
                table: req.params.name,
                username: req.cookies.name,
            });
        });

        this.app.get("/logout", function (req, res) {
            res.clearCookie('password');
            res.clearCookie('name');
            res.redirect('/login');
        });

        this.app.get("/login", function (req, res) {
            var data = {
                title: "LonaDB | Login"
            }

            switch(req.query.err){
                case "missing_login_info":
                    data.error = "Missing username or password";
                    break;
                case "login_informations":
                    data.error = "Password or username is wrong";
                    break;
            }

            res.render('login.hbs', data);
        });

        this.app.post("/login", async (req, res) => {
            if (req.body.password && req.body.name) {
                let checkPassLogin = await this.lonadb.checkPassword(req.body.name, req.body.password);
                if (!checkPassLogin) return res.redirect("/login?err=login_informations");

                res.cookie("name", req.body.name);
                res.cookie("password", await encrypt(req.body.password, this.kudo.config.username))
                res.redirect('/');
            } else {
                res.redirect('/login?err=missing_login_info')
            }
        });

    }

    registerCommands = async function () {
        this.app.post('/command', async (req, res) => {
            var cmd = "";
            var tempClient = new lonadb(this.kudo.config.host, this.kudo.config.port, req.cookies.name, await decrypt(req.cookies.password, this.kudo.config.username));
            
            if (!req.body.command) return res.redirect("/");
            
            let password = await decrypt(req.cookies.password, this.kudo.config.username);
            let checkPassLogin = await tempClient.checkPassword(req.cookies.name, password);
            if (!checkPassLogin) return res.redirect("/login");

            switch (req.body.command.toLowerCase()) {
                case "create user":
                    await tempClient.createUser(req.body.userCreateName, req.body.userCreatePassword);
                    res.redirect("/users");
                    break;
                case "delete user":
                    await tempClient.deleteUser(req.body.userName);
                    res.redirect("/users");
                    break;
                case "create table":
                    await tempClient.createTable(req.body.tableCreateName);
                    res.redirect("/table/" + req.body.tableCreateName);
                    break;
                case "view table":
                    await res.redirect("/table/" + req.body.tableName);
                    break;
                case "delete table":
                    await tempClient.deleteTable(req.body.tableName);
                    res.redirect("/");
                    break;
                case "set variable":
                    let variable = await getVariable(req.body.value);

                    await tempClient.set(req.body.tableName, req.body.name, variable);
                    res.redirect("/table/" + req.body.tableName);
                    break;
                case "delete variable":
                    await tempClient.delete(req.body.tableName, req.body.name, req.body.value);
                    res.redirect("/table/" + req.body.tableName);
                    break;
                case "add permission":
                    await tempClient.addPermission(req.body.user, req.body.permissionName);
                    res.redirect("/user/" + req.body.user);
                    break;
                case "remove permission":
                    await tempClient.removePermission(req.body.user, req.body.permissionName);
                    res.redirect("/user/" + req.body.user);
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