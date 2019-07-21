let nodemailer = require("nodemailer");
let fs = require("fs");

let info = JSON.parse(fs.readFileSync("./local/mail.json"));

let transporter = nodemailer.createTransport({
    "service": info.service,
    "auth": {
        "user": info.address,
        "pass": info.password
    }
});

mail = function(to, subject, html) {
    let mailOptions = {
        "from": info.address,
        "to": to,
        "subject": subject,
        "html": html
    };
    
    transporter.sendMail(mailOptions, function(error, info){});
}

