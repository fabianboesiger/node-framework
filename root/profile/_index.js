if(session.user === undefined) {
    redirect("/signup");
}
wrap("layout.js", () => {
    div({"class": "centered-form"}, () => {
        h1(translate({
            "en": "Update Profile",
            "de": "Profil ändern"
        }));
        nav(() => {
            a({"href": "/"}, translate({
                "en": "Back",
                "de": "Zurück"
            }));
        });
        request("user", update, translate({
            "en": "This username is already in use",
            "de": "Dieser Benutzername wird bereits verwendet"
        }), translate({
            "en": "Your profile was changed successfully",
            "de": "Dein Profil wurde erfolgreich geändert"
        }), session.user, ["password", "confirmPassword"]);
    });
});