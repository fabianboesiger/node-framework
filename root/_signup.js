wrap("layout.js", () => {
    h1(translate({
        "en": "Sign Up",
        "de": "Registrieren"
    }));
    form(() => {
        label({"for": "username"}, translate({
            "en": "Username",
            "de": "Benutzername"
        }));
        input({"name": "username", "id": "username"});
        input({"name": "password"});
        input({"name": "repeat-password"});
        input({"type": "submit", "value": translate({
            "en": "Send",
            "de": "Senden"
        })});
    });
});