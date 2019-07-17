module.exports = (settings) => {
    const http = require("http");
    const fs = require("fs");
    const mime = require("mime-types");
    const querystring = require("querystring");
    const multipart = require("parse-multipart");
    const Busboy = require("busboy");


    // setup
    let context = {
        "settings": settings,
        "middleware": [],
        "require": require,
    };

    // function to import libraries
    library = function(libraryPath) {
        libraryPath = __dirname + "/libraries/" + libraryPath;
        if(!fs.existsSync(libraryPath)) {
            throw "library \"" + libraryPath + "\" does not exist";
        }
        maskedEval(fs.readFileSync(libraryPath).toString(), context);
    }

    library("interval.js");
    library("include.js");
    library("translate.js");
    library("html.js");
    library("database.js");
    library("session.js");

    // read setup directors
    let directory = "./setup";
    if(fs.existsSync(directory)) {
        fs.readdirSync(directory).forEach(file => {
            maskedEval(fs.readFileSync(directory + "/" + file).toString(), context);
        });
    }

    console.log("starting server on port " + context.settings.port);

    http.createServer(function(req, res) {

        let path;
        let urlParamsStart = req.url.indexOf("?");
        if(urlParamsStart >= 0) {
            path = req.url.substring(0, urlParamsStart);
        } else {
            path = req.url;
        }
        let filePath = "./root" + path;
        let dynamicFilePath = filePath.substring(0, filePath.lastIndexOf("/") + 1) + "_" + filePath.substring(filePath.lastIndexOf("/") + 1) + ".js";

        let start = Date.now();

        /*
        // get POST parameters
        let contentType = req.headers["content-type"];
        if(contentType === undefined) {
            req.body = {};
            if(data.length > 0) {
                decodeURIComponent(data.replace(/\+/g, " ")).split("&").forEach(element => {
                    let splitted = element.split("=");
                    req.body[splitted[0]] = splitted[1];
                });
            }
        } else {
            let contentTypeSemicolon = contentType.indexOf("=");
            let boundary = "--" + contentType.substring(contentTypeSemicolon + 1);
            let next = data;

            function getData(string) {
                let output = {};
                string.split(";").forEach((element) => {
                    let splitted = element.split("=");
                    if(splitted.length === 2) {
                        output[splitted[0].trim()] = splitted[1].substring(splitted[1].indexOf("\"") + 1, splitted[1].lastIndexOf("\""));
                    }
                });
                return output;
            }

            function removeLine(string) {
                return string.substring(string.indexOf("\n") + 1);
            }

            while(next.length >= boundary.length) {
                let boundaryIndex = next.indexOf(boundary) + boundary.length;
                next = next.substring(boundaryIndex).trim();
                if(next.length >= boundary.length) {


                    let part = next.substring(0, next.indexOf(boundary)).trim();
                    let content = getData(part.substring(part.indexOf(":") + 1, part.indexOf("\n")));
                    part = removeLine(part);
                    if(content.filename !== undefined) {
                        content.type = part.substring(part.indexOf(":") + 1, part.indexOf("\n")).trim();
                        part = removeLine(part);
                    }
                    part = removeLine(part);
                    content.value = part;
                    console.log(content);
                }
                
            }
        }
        */

        function process() {
            // parse GET parameters
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
            context.statusCode = undefined;
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
                    res.redirect(path.substring(1) + "/index");
                } else {
                    if(path.indexOf(".") === -1) {
                        parse(req, res, dynamicFilePath);
                    } else {
                        if(filePath.charAt(filePath.lastIndexOf("/") + 1) !== '_') {
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
        }

        req.body = {};

        if(req.method === "POST") {
            // parse POST parameters
            var busboy = new Busboy({"headers": req.headers});
            busboy.on("file", function(fieldname, file, filename, encoding, mimetype) {
                if(!fs.existsSync("./temporary")) {
                    fs.mkdirSync("./temporary");
                }
                if(filename !== "") {
                    file.pipe(fs.createWriteStream("./temporary/" + filename));
                } else {
                    file.resume();
                }
                if(req.body[fieldname] === undefined) {
                    req.body[fieldname] = [];
                }
                req.body[fieldname].push(filename);
            });
            busboy.on("field", function(fieldname, val, fieldnameTruncated, valTruncated, encoding, mimetype) {
                req.body[fieldname] = val;
            });
            busboy.on('finish', function() {
                process();
            });
            req.pipe(busboy);
        } else {
            process();
        }

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