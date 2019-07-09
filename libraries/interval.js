interval = async function(action, duration) {
    const sleep = require('util').promisify(setTimeout);

    let next = Date.now();
    while(true) {
        action();
        next += duration;
        await sleep(Math.max(0, next - Date.now()));
    }
}