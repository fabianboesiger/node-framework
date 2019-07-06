// includes other files from modules
include = function(modulePath) {
    modulePath = "modules/" + modulePath;
    if(!fs.existsSync(modulePath)) {
        errors.push("file \"" + modulePath + "\" does not exist");
        return;
    }
    eval(fs.readFileSync(modulePath).toString());
}

// wraps other file from module around parent file
wrap = function(modulePath, inside) {
    modulePath = "modules/" + modulePath;
    if(!fs.existsSync(modulePath)) {
        errors.push("file \"" + modulePath + "\" does not exist");
        return;
    }

    content = function() {
        if(typeof inside === "function") {
            inside();
        } else
        if(typeof inside === "string") {
            output += inside;
        }
    }

    with(this) {
        eval(fs.readFileSync(modulePath).toString());
    }
}
