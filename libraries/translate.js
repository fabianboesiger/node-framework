// translates into client language
translate = function(text) {

    try {
        req;
    } catch(e) {
        return null;
    }

    let languagesString = req.headers["accept-language"];
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
        // special rules
        if(element.language === "gsw-ch") {
            appendedLanguages.push({
                "language": "de",
                "weight": element.weight
            });
        }
    });

    let output = "Error";
    for(let i = 0; i < appendedLanguages.length; i++) {
        let key = appendedLanguages[i].language;
        if(key in text) {
            output = text[key];
            break;
        }
    }
    return output;
}