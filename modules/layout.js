html(() => {
    head(() => {
        meta({"charset": "UTF-8"});
        link({"rel": "stylesheet", "type": "text/css", "href": "/stylesheets/style.css"});
        link({"rel": "stylesheet", "href": "https://fonts.googleapis.com/css?family=Fauna+One|Vollkorn+SC&display=swap"}); 
    });
    body(() => {
        main(() => {
            content();
        });
        /*
        footer(() => {
            p({"class": "centered"}, () => {
                print(translate({
                    "en": "Visit me on ",
                    "de": "Besuche mich auf "
                }));
                a({"href": "https://github.com/fabianboesiger"}, "GitHub");
            }); 
        });
        */
    });
});