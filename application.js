const http = require("http");
const fs = require("fs");
const mime = require("mime-types");
const querystring = require("querystring");

// setup
let context = {
    "settings": {
        "port": 8000
    },
    "middleware": []
};

 
context.library = function(libraryPath) {
    libraryPath = "libraries/" + libraryPath;
    if(!fs.existsSync(libraryPath)) {
        throw "library \"" + libraryPath + "\" does not exist";
    }
    with(context) {
        eval(fs.readFileSync(libraryPath).toString());
    }
}

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

        context.middleware.forEach((action) => {
            action(req, res);
        });

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

}).listen(context.settings.port);

function parse(req, res, filePath, variables, statusCode) {

    context.output = "";
    context.errors = [];
    context.header = {};

    // copy variables
    for(let key in variables) {
        context[key] = variables[key];
    }

    context.req = req;
    context.res = res;

    context.redirect = function(redirectPath) {
        res.writeHead(302, {"Location": redirectPath});
        res.end();
    }

    maskedEval(fs.readFileSync(filePath).toString(), context);

    console.log(context.errors);
    if(context.errors.length > 0) {
        error(req, res, 500, context.errors);
    }

    context.header["Content-Type"] = "text/html";
    res.writeHead((statusCode === undefined) ? 200 : statusCode, context.header);
    res.end(context.output);

}

function error(req, res, statusCode, errors){
    parse(req, res, "modules/error.js", {"statusCode": statusCode, "errorList": errors}, statusCode);
}

function maskedEval(source, context) {
    new Function("with(this){" + source + "}").call(context);
}
