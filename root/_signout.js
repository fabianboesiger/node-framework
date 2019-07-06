
session.user = undefined;
update("session", session, undefined, session._id);
redirect("/");