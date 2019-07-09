module.exports = (directory) => {
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

    // function to import libraries
    context.library = function(libraryPath) {
        libraryPath = __dirname + "/libraries/" + libraryPath;
        if(!fs.existsSync(libraryPath)) {
            throw "library \"" + libraryPath + "\" does not exist";
        }
        with(context) {
            eval(fs.readFileSync(libraryPath).toString());
        }
    }

    
    context.library("interval.js");
    context.library("include.js",);
    context.library("translate.js");
    context.library("html.js");
    context.library("database.js");
    context.library("session.js");

    // read setup file
    if(!fs.existsSync(directory + "/setup.js")) {
        throw "\"setup.js\" does not exist";
    }
    maskedEval(fs.readFileSync(directory + "/setup.js").toString(), context);

    console.log("starting server on port " + context.settings.port);

    http.createServer(function(req, res) {

        let path;
        let urlParamsStart = req.url.indexOf("?");
        if(urlParamsStart >= 0) {
            path = req.url.substring(0, urlParamsStart);
        } else {
            path = req.url;
        }
        let filePath = directory + "/root" + path;
        let dynamicFilePath = filePath.substring(0, filePath.lastIndexOf("/") + 1) + "_" + filePath.substring(filePath.lastIndexOf("/") + 1) + ".js";

        // read data
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

            // add redirect function
            res.redirect = function(redirectPath) {
                res.writeHead(302, {"Location": redirectPath});
                res.end();
            }    

            // set context
            context.output = "";
            context.errors = [];
            context.header = {};
            context.req = req;
            context.res = res;
            context.redirect = res.redirect;
            context.middleware.forEach((action) => {
                action(req, res);
            });

            // look up how to respond
            if(!fs.existsSync(filePath) && !fs.existsSync(dynamicFilePath)) {
                error(req, res, 404);
            } else {
                if(fs.existsSync(filePath) && fs.lstatSync(filePath).isDirectory()) {
                    // parse(req, res, path + "/_index.js");
                    // redirect to the index file
                    res.redirect(path.substring(1) + "/index");
                } else {
                    if(path.indexOf(".") === -1) {
                        parse(req, res, dynamicFilePath);
                    } else {
                        if(filePath.charAt(filePath.indexOf("/") + 1) !== '_') {
                            res.writeHead(200, {"Content-Type": mime.lookup(filePath)});
                            res.end(fs.readFileSync(filePath));
                        } else {
                            error(req, res, 404);
                        }
                    }
                }
            }
            
            let time = Date.now() - start;
            console.log(res.statusCode + "\t " + time + " ms" + "\t " + req.method + "\t " +  req.url);
        });

    }).listen(context.settings.port);

    function parse(req, res, filePath) {
        
        // evaluate file
        maskedEval(fs.readFileSync(filePath).toString(), context);

        // check for internal errors and send result
        if(context.errors.length > 0) {
            error(req, res, 500, context.errors);
        } else {
            context.header["Content-Type"] = "text/html";
            res.writeHead((context.statusCode === undefined) ? 200 : context.statusCode, context.header);
            res.end(context.output);
        }

    }

    function error(req, res, statusCode, errors){
        context.statusCode = statusCode;
        context.errorList = errors;
        parse(req, res, "modules/error.js");
    }

    function maskedEval(source, context) {
        new Function("with(this){" + source + "}").call(context);
    }
}