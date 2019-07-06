const sessionDuration = 7 * 24 * 60 * 60;

function parseCookies(request) {
    let list = {};
    let rc = request.headers.cookie;
    if(rc !== undefined) {
        rc.split(';').forEach(function(cookie) {
            var parts = cookie.split('=');
            list[parts.shift().trim()] = decodeURI(parts.join('='));
        });
    }
    return list;
}

let cookies = parseCookies(req);

let session = null;
if(cookies.sessionid !== undefined) {
    session = load("session", cookies.sessionid);
}
if(session !== null) {
    // session exists
    this.session = session;
    header["Set-Cookie"] = "sessionid=" + cookies.sessionid + "; Path=/; Max-Age=" + sessionDuration;
} else {
    // new session
    let session = {};
    let id = save("session", session);
    this.session = session;
    header["Set-Cookie"] = "sessionid=" + id + "; Path=/; Max-Age=" + sessionDuration;
}
