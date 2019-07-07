/*
global.filesInProcess = {};

const sleep = require('util').promisify(setTimeout)

startReading = async function(name, id) {
    console.log("br " + JSON.stringify(global.filesInProcess));
    //console.log((global.filesInProcess[name] !== undefined) + " "+ (global.filesInProcess[name][id] !== undefined) +" "+(global.filesInProcess[name][id].writing !== 0));
    while(global.filesInProcess[name] !== undefined && global.filesInProcess[name][id] !== undefined && global.filesInProcess[name][id].writing !== 0){
        await sleep(10);
    }
    if(global.filesInProcess[name] === undefined) {
        global.filesInProcess[name] = {};
    }
    if(global.filesInProcess[name][id] === undefined) {
        global.filesInProcess[name][id] = {"reading": 1, "writing": 0};
    } else {
        global.filesInProcess[name][id].reading++;
    }
}

stopReading = function(name, id) {
    console.log("er " + JSON.stringify(global.filesInProcess));
    global.filesInProcess[name][id].reading--;
    if(global.filesInProcess[name][id].reading === 0) {
        delete global.filesInProcess[name][id];
    }
}

startWriting = async function(name, id) {
    console.log("bw " + JSON.stringify(global.filesInProcess));
    while(global.filesInProcess[name] !== undefined && global.filesInProcess[name][id] !== undefined && (global.filesInProcess[name][id].reading !== 0 || global.filesInProcess[name][id].writing !== 0)) {
        await sleep(10);
    }
    if(global.filesInProcess[name] === undefined) {
        global.filesInProcess[name] = {};
    }
    if(global.filesInProcess[name][id] === undefined) {
        global.filesInProcess[name][id] = {"reading": 0, "writing": 1};
    } else {
        // global.filesInProcess[name][id].writing++;
        assert(false);
    }
}

stopWriting = function(name, id) {
    console.log("ew " + JSON.stringify(global.filesInProcess));
    global.filesInProcess[name][id].writing--;
    if(global.filesInProcess[name][id].writing === 0) {
        delete global.filesInProcess[name][id];
    }
}
*/

save = function(name, data, template, id) {
    if(!fs.existsSync("./data")) {
        fs.mkdirSync("./data");
    }
    let dir = "./data/" + name + "s";
    if(!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }

    if(template === undefined) {
        let template = eval(fs.readFileSync("templates/" + name + ".js").toString());
    }

    let overwrite = (id !== undefined);

    if(template !== undefined) {
        for(let key in template) {
            let element = template[key];
            if(element.save !== undefined && element.save === false && data[key] !== undefined) {
                delete data[key];
            }
            if(element.unique !== undefined && element.unique === true) {
                id = data[key];
            }
        }
    }

    if(id === undefined) {
        id = generateId(64);
    }


    let file = dir + "/" + id + ".json";

    if(!overwrite && fs.existsSync(file)) {
        return null;
    }

    //startWriting(name, id);

    let copy = load(name, id);
    if(copy !== null) {
        if(copy._timestamp !== undefined) {
            if(data._timestamp !== undefined) {
                if(copy._timestamp > data._timestamp) {
                    return null;
                }
            }
        }
    }

    data._timestamp = Date.now();
    data._id = id;
    data._name = name;

    fs.writeFileSync(file, JSON.stringify(data));
    //stopWriting(name, id);

    return id;
}

load = function(name, id) {
    if(id === undefined) {
        return null;
    }
    let file = "./data/" + name + "s/" + id + ".json";
    if(!fs.existsSync(file)) {
        return null;
    }
    //startReading(name, id);
    let data = fs.readFileSync(file);
    //stopReading(name, id);
    return JSON.parse(data);
}

loadAll = function(name) {
    objects = [];
    let file = "./data/" + name + "s";
    if(!fs.existsSync(file)) {
        return null;
    }
    fs.readdirSync(file).forEach(file => {
        objects.push(load(name, file.substring(0, file.length - 5)));
    });
    return objects;
}

update = function(name, data, template, id) {
    let object = load(name, id);
    if(object === null) {
        return false;
    }
    for(let key in data) {
        object[key] = data[key];
    }
    save(name, object, template, id);
    return true;
}

generateId = function(length) {
    let output = "";
    for(let i = 0; i < length; i++) {
        let r = Math.floor(Math.random() * 62);
        if(r < 10) {
            output += String.fromCharCode(r + 48);
        } else
        if(r < 36) {
            output += String.fromCharCode(r + 55);
        } else {
            output += String.fromCharCode(r + 61);
        }
    }
    return output;
}

validate = function(template, data, mask) {
    let errors = [];
    for(let key in template) {
        if(mask !== undefined && !mask.includes(key)) {
            continue;
        }

        let element = template[key];
        if(data !== undefined && data[key] !== undefined) {
            // element is not undefined
            let value = data[key];
            if(element.type !== undefined && element.type === "number") {
                // element is number
                if(!/^[+\-]?[0-9]*(\.[0-9]+)?$/.test(value)) {
                    errors.push(element["type-message"]);
                } else {
                    value = parseFloat(value);
                    if(element.min !== undefined) {
                        if(value < element.min) {
                            errors.push(element["min-message"]);
                        }
                    }
                    if(element.max !== undefined) {
                        if(value > element.max) {
                            errors.push(element["max-message"]);
                        }
                    }
                }
            } else {
                // element is string
                if(element.minlength !== undefined) {
                    if(value.length < element.minlength) {
                        errors.push(element["minlength-message"]);
                    }
                }
                if(element.maxlength !== undefined) {
                    if(value.length > element.maxlength) {
                        errors.push(element["maxlength-message"]);
                    }
                }
                if(element.validate !== undefined) {
                    if(!element.validate(data)) {
                        errors.push(element["validate-message"]);
                    }
                }
                if(element.unique !== undefined && element.unique === true) {
                    if(!/^[a-zA-Z0-9\-._]+$/.test(value) || value.length > 128) {
                        errors.push(element["unique-message"]);
                    }
                }
            }
        } else {
            // element is undefined
            if(element.required !== undefined || element.required === true) {
                errors.push(element["required-message"]);
            }
        }
    }
    return errors;
}

// autogenerate form
request = function(templateName, action, actionFailed, actionSucceeded, id, mask, labeled = true, placeholder = false) {

    let template = eval(fs.readFileSync("templates/" + templateName + ".js").toString());

    form({"method": "POST"}, () => {

        let parameters = req.body;

        if(id !== undefined) {
            let loaded = load(templateName, id);
            for(let key in loaded) {
                if(!(key in parameters)) {
                    parameters[key] = loaded[key];
                }
            }
        }

        if(req.method === "POST") {
            let errors = validate(template, parameters, mask);

            if(errors.length > 0) {
                //list(ul, errors, {"class": "errors"});
                session.errors = errors;
            } else {
                let response = action(templateName, parameters, template, id);
                if(response === null || response === false) {
                    if(typeof actionFailed === "function") {
                        actionFailed(parameters);
                    } else
                    if(typeof actionFailed === "string") {
                        //list(ul, [actionFailed], {"class": "errors"});
                        session.errors = [actionFailed];
                    }
                } else {
                    if(typeof actionSucceeded === "function") {
                        actionSucceeded(parameters);
                    } else
                    if(typeof actionSucceeded === "string") {
                        //list(ul, [actionSucceeded], {"class": "successes"});
                        session.errors = [actionSucceeded];
                    }
                }
            }

            update("session", session, undefined, session._id);
            redirect(req.url);
        
        } else {
            if(session.errors !== undefined && session.errors.length > 0) {
                list(ul, session.errors, {"class": "successes"});
                session.errors = [];
                update("session", session, undefined, session._id);
            }

            for(let key in template) {
                if(mask !== undefined && !mask.includes(key)) {
                    continue;
                }

                let element = template[key];

                let attributes = {
                    "type": element.type,
                    "name": key,
                };

                if(element.autofill === undefined || element.autofill === true) {
                    if(parameters !== undefined && parameters[key] !== undefined) {
                        attributes.value = parameters[key];
                    }
                }

                if(labeled && element.label !== undefined) {
                    label({"for": key}, element.label);
                    attributes.id = key;
                }
                if(placeholder && element.label !== undefined) {
                    attributes.placeholder = element.label;
                }

                attributes.type = element.type;

                if(["text", "password"].includes(attributes.type)) {
                    if(element.minlength !== undefined) {
                        attributes.minlength = element.minlength;
                    }
                    if(element.maxlength !== undefined) {
                        attributes.maxlength = element.maxlength;
                    }
                }

                if(["number"].includes(attributes.type)) {
                    if(element.min !== undefined) {
                        attributes.min = element.min;
                    }
                    if(element.max !== undefined) {
                        attributes.max = element.max;
                    }
                }

                input(attributes);
            }
        
            input({"type": "submit", "value": translate({
                "en": "Send",
                "de": "Senden"
            })});

        }
    });
}
