const http = require("http");
const fs = require("fs");
const mime = require("mime-types");
const querystring = require("querystring");

// setup
let context = {
    "port": 8000
};

maskedEval(fs.readFileSync("setup.js").toString(), context);

http.createServer(function(req, res) {

    let path;
    let filePath = "root";
    let urlParamsStart = req.url.indexOf("?");
    if(urlParamsStart >= 0) {
        path = req.url.substring(0, urlParamsStart);
    } else {
        path = req.url;
    }
    filePath += path;
    let dynamicFilePath = filePath.substring(0, filePath.lastIndexOf("/") + 1) + "_" + filePath.substring(filePath.lastIndexOf("/") + 1) + ".js";

    var data = "";
    req.on("data", function(chunk) {
        data += chunk;
    });

    req.on("end", function() {
        let start = Date.now();

        // get POST parameters
        req.body = {};
        if(data.length > 0) {
            decodeURIComponent(data).split("&").forEach(element => {
                let splitted = element.split("=");
                req.body[splitted[0]] = splitted[1];
            });
        }

        // get GET parameters
        req.params = {};
        if(urlParamsStart >= 0) {
            req.params = querystring.parse(req.url.substring(urlParamsStart + 1));
        }

        // see how to respond
        if(!fs.existsSync(filePath) && !fs.existsSync(dynamicFilePath)) {
            error(req, res, 404, ["not found"]);
        } else {
            if(fs.existsSync(filePath) && fs.lstatSync(filePath).isDirectory()) {
                // parse(req, res, path + "/_index.js");
                res.writeHead(302, {"Location": path.substring(1) + "/index"});
                res.end();
            } else {
                if(path.indexOf(".") === -1) {
                    parse(req, res, dynamicFilePath);
                } else {
                    if(filePath.charAt(filePath.indexOf("/") + 1) !== '_') {
                        res.writeHead(200, {"Content-Type": mime.lookup(filePath)});
                        res.end(fs.readFileSync(filePath));
                    } else {
                        error(req, res, 404, ["not found"]);
                    }
                }
            }
        }
        
        let time = Date.now() - start;
        console.log(res.statusCode + "\t " + time + " ms" + "\t " + req.method + "\t " +  req.url);
    });

}).listen(context.port);

function parse(req, res, filePath, variables, statusCode) {

    let output = "";
    let errors = [];
    let header = {};

    let context = {};

    // copy variables
    for(let key in variables) {
        context[key] = variables[key];
    }

    context.redirect = function(redirectPath) {
        res.writeHead(302, {"Location": redirectPath});
        res.end();
    }
    
    library = function(libraryPath) {
        libraryPath = "libraries/" + libraryPath;
        if(!fs.existsSync(libraryPath)) {
            throw "library \"" + libraryPath + "\" does not exist";
        }
        with(context) {
            eval(fs.readFileSync(libraryPath).toString());
        }
    }

    library("include.js");
    library("translate.js");
    library("html.js");
    library("database.js");     // requires html.js, translate.js
    library("session.js");      // requires database.js

    maskedEval(fs.readFileSync(filePath).toString(), context);

    if(errors.length > 0) {
        error(req, res, 500, errors);
    }

    header["Content-Type"] = "text/html";
    res.writeHead((statusCode === undefined) ? 200 : statusCode, header);
    res.end(output);

}

function error(req, res, statusCode, errors){
    parse(req, res, "modules/error.js", {"statusCode": statusCode, "errors": errors}, statusCode);
}

function maskedEval(source, context) {
    new Function("with(this){" + source + "}").call(context);
}