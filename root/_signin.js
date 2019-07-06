wrap("layout.js", () => {
    div({"class": "centered-form"}, () => {
        h1(translate({
            "en": "Sign Ip",
            "de": "Anmelden"
        }));
        nav(() => {
            a({"href": "/"}, translate({
                "en": "Back",
                "de": "Zurück"
            }));
        });
        request("user", (name, data, template, id) => {
            let user = load(name, data.username);
            if(user === null) {
                return false;
            }
            if(user.password === data.password) {
                return true;
            }
            return false;
        }, translate({
            "en": "The provided data is faulty",
            "de": "Die angegebenen Daten sind fehlerhaft"
        }), (data) => {
            session.user = data.username;
            update("session", session, undefined, session._id);
            redirect("/");
        }, undefined, ["username", "password"]);
    });
});