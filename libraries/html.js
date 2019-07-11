let tags = [
    "a",
    "abbr",
    "address",
    {
        "name": "area",
        "selfClosing": true
    },
    "article",
    "aside",
    "audio",
    "b",
    {
        "name": "base",
        "selfClosing": true
    },
    "bdi",
    "bdo",
    "blockquote",
    "body",
    {
        "name": "br",
        "selfClosing": true
    },
    "button",
    "canvas",
    "caption",
    "cite",
    "code",
    {
        "name": "col",
        "selfClosing": true
    },
    "colgroup",
    "data",
    "datalist",
    "dd",
    "del",
    "details",
    "dfn",
    "dialog",
    "div",
    "dl",
    "dt",
    "em",
    {
        "name": "embed",
        "selfClosing": true
    },
    "fieldset",
    "figcaption",
    "figure",
    "footer",
    "form",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "head",
    "header",
    {
        "name": "hr",
        "selfClosing": true
    },
    {
        "name": "html",
        "pre": () => {
            output += "<!DOCTYPE html>"
        }
    },
    "i",
    "iframe",
    {
        "name": "img",
        "selfClosing": true
    },
    {
        "name": "input",
        "selfClosing": true
    },
    "ins",
    "kbd",
    "label",
    "legend",
    "li",
    {
        "name": "link",
        "selfClosing": true
    },
    "main",
    "map",
    "mark",
    {
        "name": "meta",
        "selfClosing": true
    },
    "meter",
    "nav",
    "noscript",
    "object",
    "ol",
    "optgroup",
    "option",
    "output",
    "p",
    {
        "name": "param",
        "selfClosing": true
    },
    "picture",
    "pre",
    "progress",
    "q",
    "rp",
    "rt",
    "ruby",
    "s",
    "samp",
    "script",
    "section",
    "select",
    "small",
    {
        "name": "source",
        "selfClosing": true
    },
    "span",
    "strong",
    "style",
    "sub",
    "summary",
    "sup",
    "svg",
    "table",
    "tbody",
    "td",
    "template",
    "textarea",
    "tfoot",
    "th",
    "thead",
    "time",
    "title",
    "tr",
    {
        "name": "track",
        "selfClosing": true
    },
    "u",
    "ul",
    "var",
    "video",
    {
        "name": "wbr",
        "selfClosing": true
    }
];
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

        output += "<" + tag;
        if(attributes !== undefined) {
            for(key in attributes) {
                output += " " + key + "=\"" + attributes[key] + "\"";
            }
        }

        if(contentFunction !== undefined || contentString !== undefined) {
            output += ">";
            if(contentFunction !== undefined) {
                contentFunction();
            } else {
                output += contentString;
            }
            output += "</" + tag + ">";
        } else {
            if(element.selfClosing !== undefined && element.selfClosing === true) {
                output += "/>";
            } else {
                output += "></" + tag + ">"; 
            }
        }

        if(element.post !== undefined) {
            element.post();
        }

    }
});

// prints plain text
print = function(string) {
    output += string;
}

// generates a html list from a javascript array
list = function(type, list, attributes, lambda) {
    type(attributes, () => {
        list.forEach((element, index, array) => {
            li(() => {
                if(lambda !== undefined) {
                    lambda(element, index, array);
                } else {
                    output += element;
                }
            });
        })
    });
}