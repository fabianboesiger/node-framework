wrap("layout.js", () => {
    h1("Error " + statusCode);
    list(ul, errors, code);
});