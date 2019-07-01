let http = require("http");
let fs = require("fs");
let mime = require("mime-types");

http.createServer(function(req, res) {

    let start = new Date().getMilliseconds();
    let path = "root" + req.url;
    let dynamicPath = path.substring(0, path.lastIndexOf("/") + 1) + "_" + path.substring(path.lastIndexOf("/") + 1) + ".js";

    if(!fs.existsSync(path) && !fs.existsSync(dynamicPath)) {
        error(req, res, 404, ["not found"]);
    } else {
        if(fs.existsSync(path) && fs.lstatSync(path).isDirectory()) {
            parse(req, res, path + "_index.js");
        } else {
            if(path.indexOf(".") === -1) {
                parse(req, res, dynamicPath);
            } else {
                res.writeHead(200, {"Content-Type": mime.lookup(path)});
                res.end(fs.readFileSync(path));
            }
        }
    }

    let time = new Date().getMilliseconds() - start;
    console.log(res.statusCode + "\t " + time + " ms" + "\t " + req.method + "\t " +  req.url);

}).listen(8001);

function parse(_req, _res, _path, _variables, _statusCode) {

    let _output = "";
    let _errors = [];
    
    // copy variables
    for(let key in _variables) {
        this[key] = _variables[key];
    }

    // prints plain text
    this.print = function(string) {
        _output += string;
    }

    // includes other files from modules
    this.include = function(_modulePath) {
        _modulePath = "modules/" + _modulePath;
        if(!fs.existsSync(_modulePath)) {
            _errors.push("file \"" + _modulePath + "\" does not exist");
            return;
        }
        eval(fs.readFileSync(_modulePath).toString());
    }

    // wraps other file from module around parent file
    this.wrap = function(_modulePath, _content) {
        _modulePath = "modules/" + _modulePath;
        if(!fs.existsSync(_modulePath)) {
            _errors.push("file \"" + _modulePath + "\" does not exist");
            return;
        }

        this.content = function() {
            if(typeof _content === "function") {
                _content();
            } else
            if(typeof _content === "string") {
                _output += _content;
            }
        }

        eval(fs.readFileSync(_modulePath).toString());
    }

    // generates a html list from a javascript array
    this.list = function(type, list, lambda, attributes) {
        type(attributes, () => {
            list.forEach((element, index, array) => {
                li(() => {
                    lambda(element, index, array);
                });
            })
        });
    }

    this.translate = function(text) {
        let languagesString = _req.headers["accept-language"];
        let splittedLanguagesString = languagesString.split(",");
        let languages = [{
            "language": "en",
            "weight": 0
        }];
        splittedLanguagesString.forEach(element => {
            splittedLanguageString = element.split(";");
            languages.push({
                "language": splittedLanguageString[0],
                "weight": (splittedLanguageString.length >= 2) ? 
                    parseFloat(splittedLanguageString[1].substring(splittedLanguageString[1].indexOf("=") + 1)) : 1
            });
        });
        languages.sort((a, b) => {
            return b.weight - a.weight;
        });
        let appendedLanguages = [];
        languages.forEach(element => {
            appendedLanguages.push(element);
            if(element.language.indexOf("-") !== -1) {
                appendedLanguages.push({
                    "language": element.language.substring(0, element.language.indexOf("-")),
                    "weight": element.weight
                });
            }
        });
        return text[appendedLanguages[0].language];
    }

    // html tag functions
    let tags = eval(fs.readFileSync("tags.js").toString());
    tags.forEach(element => {
        let tag = "";
        if(typeof element === "string") {
            tag = element;
        } else {
            tag = element.name;
        }

        this[tag] = function(arg1, arg2) {
            if(element.pre !== undefined) {
                element.pre();
            }
            
            let attributes = 
                (typeof arg1 === "object") ? arg1 :
                (typeof arg2 === "object") ? arg2 : undefined;
            let contentFunction = 
                (typeof arg1 === "function") ? arg1 :
                (typeof arg2 === "function") ? arg2 : undefined;
            let contentString = 
                (typeof arg1 === "string") ? arg1 :
                (typeof arg2 === "string") ? arg2 : undefined;

            _output += "<" + tag;
            if(attributes !== undefined) {
                for(key in attributes) {
                    _output += " " + key + "=\"" + attributes[key] + "\"";
                }
            }

            if(contentFunction !== undefined || contentString !== undefined) {
                _output += ">";
                if(contentFunction !== undefined) {
                    contentFunction();
                } else {
                    _output += contentString;
                }
                _output += "</" + tag + ">";
            } else {
                _output += "/>";
            }

            if(element.post !== undefined) {
                element.post();
            }
        }
    });

    eval(fs.readFileSync(_path).toString());

    if(_errors.length > 0) {
        error(_req, _res, 500, _errors);
    }

    _res.writeHead((_statusCode === undefined) ? 200 : _statusCode, {"Content-Type": "text/html"});
    _res.end(_output);

}

function error(req, res, statusCode, errors){
    parse(req, res, "modules/error.js", {"statusCode": statusCode, "errors": errors}, statusCode);
}