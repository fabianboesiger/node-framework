settings = {
    "port": 8001
};

library("interval.js");
library("include.js",);
library("translate.js");
library("html.js");
library("database.js");
library("session.js");

interval(() => {
    console.log(Date.now());
}, 1000);