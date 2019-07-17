const lock = new (require("rwlock"))();
const fs = require("fs");

function hashCode(string){
    let hash = 0;
    for (let i = 0; i < string.length; i++) {
        let character = string.charCodeAt(i);
        hash = ((hash << 5) - hash) + character;
        hash = hash & hash;
    }
    return hash;
}

templates = {};

// load templates
let directory = "./templates";
if(fs.existsSync(directory)) {
    fs.readdirSync(directory).forEach(file => {
        let template = fs.readFileSync(directory + "/" + file).toString();
        templates[file.substring(0, file.length - 3)] = template;
    });
}

save = function(arg1, arg2, arg3, arg4) {

    let name, data, template, id;
    if(typeof arg1 === "object" && typeof arg2 === "object") {
        name = arg1._name;
        data = arg1;
        template = arg2;
        id = arg1._id;
    } else {
        name = arg1;
        data = arg2;
        template = arg3;
        id = arg4;
    }

    if(!fs.existsSync("./data")) {
        fs.mkdirSync("./data");
    }
    let dir = "./data/" + name + "s";
    if(!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }

    if(template === undefined) {
        template = eval(templates[name]);
    }

    let overwrite = (id !== undefined);

    if(template !== undefined) {

        for(let key in template) {
            let element = template[key];

            if(element.save !== undefined && element.save === false && data[key] !== undefined) {
                delete data[key];
            } else {
                if(element.presave !== undefined) {
                    data[key] = element.presave(data);
                }
                /*
                if(data[key] === undefined && element.default !== undefined) {
                    data[key] = element.default;
                }
                */
                if(element.unique !== undefined && element.unique === true) {
                    id = data[key];
                }
            }
        }
    }


    if(id === undefined) {
        id = generateId(64);
    }

    // save files
    if(template !== undefined) {
        for(let key in template) {
            let element = template[key];
            if(element.type === "file") {

            }
        }
    }


    let file = dir + "/" + id + ".json";

    if(!overwrite && fs.existsSync(file)) {
        return null;
    }

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

    // check timestamp
    let current = load(name, id);
    if(data._timestamp !== undefined && current._timestamp > data._timestamp) {
        return null;
    }

    // set metadata
    data._timestamp = Date.now();
    data._id = id;
    data._name = name;

    lock.writeLock(file, function(release) {
        fs.writeFileSync(file, JSON.stringify(data));
        release();
        for(let key in template) {
            let element = template[key];
            if(element.postsave !== undefined) {
                element.postsave(data);
            }
        }

    });

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

    let data;
    lock.readLock(file, function(release) {
        data = fs.readFileSync(file);
        release();
    });

    return JSON.parse(data);
}

loadAll = function(name, content, single) {
    objects = [];
    let directory = "./data/" + name + "s";
    if(!fs.existsSync(directory)) {
        return null;
    }

    fs.readdirSync(directory).some(file => {
        let object = load(name, file.substring(0, file.length - 5));
        if(content !== undefined) {
            let correct = false;
            for(let key in content) {
                if(!(key in object) || content[key] !== object[key]) {
                    correct = false;
                    break;
                }
            }
            if(correct) {
                objects.push(object);
            }
        } else {
            objects.push(object);
        }
        return single !== undefined && single === true && objects.length > 0;
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

modify = function(name, id, action) {
    let object = load(name, id);
    if(object !== null) {
        action(object);
        save(object);
        return true;
    }
    return false;
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

        let element = template[key];

        if(mask !== undefined && !mask.includes(key)) {
            continue;
        }
        /*
        if(mask === undefined && element.hidden !== undefined && element.hidden === true) {
            continue;
        }
        */

        let errorKey = key;
        if(element.pass !== undefined) {
            errorKey = element.pass;
        }

        if(data !== undefined && data[key] !== undefined) {
            // element is not undefined
            let value = data[key];
            if(element.type !== undefined && element.type === "number") {
                // element is number
                if(!/^[+\-]?[0-9]*(\.[0-9]+)?$/.test(value)) {
                    errors.push({"name": errorKey, "error": element["type-message"]});
                } else {
                    value = parseFloat(value);
                    if(element.min !== undefined) {
                        if(value < element.min) {
                            errors.push({"name": errorKey, "error": element["min-message"]});
                        }
                    }
                    if(element.max !== undefined) {
                        if(value > element.max) {
                            errors.push({"name": errorKey, "error": element["max-message"]});
                        }
                    }
                }
            } else 
            if(element.type !== undefined && element.type === "select") {
                let valid = false;
                for(let i = 0; i < element.options.length; i++) {
                    if(element.options[i].value === value) {
                        valid = true;
                        break;
                    }
                }
                if(!valid) {
                    errors.push({"name": errorKey, "error": element["options-message"]});
                }
            } else
            if(element.type !== undefined && element.type === "boolean") {
                if(value === "true" || value === "false") {
                    data[key] = (value === "true");
                } else {
                    errors.push({"name": errorKey, "error": element["type-message"]});
                }
            } else
            if(element.type !== undefined && element.type === "file") {
                // element is file
                if(element.extension !== undefined) {
                    if(value.some((v) => {
                        let dotIndex = v.lastIndexOf(".");
                        return dotIndex === -1 || !element.extension.includes(v.substring(dotIndex + 1).toLowerCase());
                    })) {
                        errors.push({"name": errorKey, "error": element["extension-message"]});
                    }
                    
                }
            } else {
                // element is string
                if(element.minlength !== undefined) {
                    if(value.length < element.minlength) {
                        errors.push({"name": errorKey, "error": element["minlength-message"]});
                    }
                }
                if(element.maxlength !== undefined) {
                    if(value.length > element.maxlength) {
                        errors.push({"name": errorKey, "error": element["maxlength-message"]});
                    }
                }
                if(element.validate !== undefined) {
                    if(!element.validate(data)) {
                        errors.push({"name": errorKey, "error": element["validate-message"]});
                    }
                }
                if(element.unique !== undefined && element.unique === true) {
                    if(!/^[a-zA-Z0-9\-._]+$/.test(value) || value.length > 128 || value.length === 0) {
                        errors.push({"name": errorKey, "error": element["unique-message"]});
                    }
                }
            }
        } else {
            // element is undefined
            if(element.type === "boolean") {
                data[key] = false;
            } else {
                if(element.default !== undefined) {
                    if(typeof element.default === "function") {
                        data[key] = element.default(data);
                    } else {
                        data[key] = element.default;
                    }
                } else {
                    if(element.required !== undefined || element.required === true) {
                        errors.push({"name": errorKey, "error": element["required-message"]});
                    }
                }
            }
            
        }
    }
    return errors;
}

// autogenerate form
request = function(name, action, actionFailed, actionSucceeded, id, mask, labeled = true, placeholder = false) {

    let template = eval(templates[name]);

    let hash = mask === undefined ? hashCode(name) : hashCode(name + mask.toString());

    let formAttributes = {
        "method": "POST"
    };

    for(let key in template) {
        let element = template[key];
        if(element !== undefined && element.type === "file") {
            formAttributes.enctype = "multipart/form-data"; 
            break;
        }
    }

    form(formAttributes, () => {

        // validate POST parameters and execute action if there are no errors
        if(req.method === "POST") {
 
            let parameters = req.body;

            if(hash == parameters._hash) {



                session.parameters = parameters;

                let errors = validate(template, parameters, mask);

                if(errors.length > 0) {
                    session.errors = errors;
                } else {
                    let response = action(name, parameters, template, id);
                    if(response === null || response === false) {
                        if(typeof actionFailed === "function") {
                            actionFailed(parameters);
                        } else
                        if(typeof actionFailed === "string") {
                            session.errors = [actionFailed];
                        }
                    } else {
                        if(typeof actionSucceeded === "function") {
                            actionSucceeded(parameters);
                        } else
                        if(typeof actionSucceeded === "string") {
                            session.successes = [actionSucceeded];
                        }
                    }
                }

                update("session", session, undefined, session._id);
                redirect(req.url);
            }
        
        } else {

            let parameters = session.parameters || {};
            session.parameters = null;

            if(id !== undefined) {
                let loaded = load(name, id);
                for(let key in loaded) {
                    if(!(key in parameters)) {
                        parameters[key] = loaded[key];
                    }
                }
            }


            for(let key in template) {
                let element = template[key];

                if(mask !== undefined && !mask.includes(key)) {
                    continue;
                }
                if(mask === undefined && element.hidden !== undefined && element.hidden === true) {
                    continue;
                }

                let attributes = {
                    "type": element.type,
                    "name": key,
                };
                let content = "";

                // parse errors
                let errors = [];
                if(session.errors !== undefined) {
                    for(let i = 0; i < session.errors.length; i++) {
                        if(session.errors[i].name === key) {
                            errors.push(session.errors[i].error);
                            session.errors.splice(i, 1);
                            i--;
                        }
                    }
                }


                if(element.autocomplete === undefined || element.autocomplete === true) {
                    if(parameters !== null && parameters[key] !== undefined) {
                        if(!["checkbox", "radio", "textarea"].includes(attributes.type)) {
                            attributes.value = parameters[key];
                        } else 
                        if(["textarea"].includes(attributes.type)) {
                            content = parameters[key];
                        }
                    }
                } else {
                    attributes.autocomplete = "off";
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

                if(["file"].includes(attributes.type)) {
                    if(element.multiple !== undefined && element.multiple === true) {
                        attributes.multiple = null;
                    }
                }

                let inputWrapperAttributes = {
                    "class": "input-wrapper"
                };

                if(errors.length > 0) {
                    inputWrapperAttributes.class += " invalid";
                }

                div(inputWrapperAttributes, () => {

                    if(!["checkbox", "radio", "boolean"].includes(attributes.type)) {
                        if(labeled && element.label !== undefined) {
                            label({"for": key}, element.label);
                            attributes.id = key;
                        }
                        if(placeholder && element.label !== undefined) {
                            attributes.placeholder = element.label;
                        }
                    }
                    

                    if(attributes.type === "textarea") {
                        textarea(attributes, content);
                    } else
                    if(attributes.type === "select") {
                        select(attributes, () => {
                            if(attributes.options !== undefined) {
                                attributes.options.forEach((element) => {
                                    option({"value": element.value}, element.content);
                                });
                            }
                        });
                    } else
                    if(attributes.type === "radio") {
                        attributes.options.forEach((element) => {
                            let innerAttributes = {
                                "type": "radio", 
                                "name": key, 
                                "value": element.value
                            };
                            if(element.value === parameters[key]) {
                                innerAttributes.checked = null;
                            }
                            input(innerAttributes, element.description);
                        });
                    } else
                    if(attributes.type === "boolean") {
                        let innerAttributes = {
                            "type": "checkbox", 
                            "name": key, 
                            "id": key,
                            "value": true,
                        };
                        if(parameters[key] === true) {
                            innerAttributes.checked = null;
                        }
                        input(innerAttributes);
                        label({"for": key}, element.label);
                    } else {
                        input(attributes);
                    }
                    if(errors.length > 0) {
                        list(ul, errors, {"class": "errors"});
                    }

                });

            }
        
            div({"class": "input-wrapper"}, () => {
                input({"type": "submit", "value": translate({
                    "en": "Send",
                    "de": "Senden"
                })});
    
                if(session.errors !== undefined && session.errors.length > 0) {
                    list(ul, session.errors, {"class": "errors"});
                    session.errors = [];
                } else
                if(session.successes !== undefined && session.successes.length > 0) {
                    list(ul, session.successes, {"class": "successes"});
                    session.successes = [];
                }
            });

            input({"name": "_hash", "value": hash, "style": "display: none;"});
            

            update("session", session, undefined, session._id);


        }



    });
}
