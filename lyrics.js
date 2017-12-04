const Promise = require('bluebird');
var request = Promise.promisify(require("request"), {
    multiArgs: true
});
Promise.promisifyAll(request, {
    multiArgs: true
});

module.exports = {
    getLyrics: function (trackName, artistName) {
        return request('https://api.lyrics.ovh/v1/' + artistName + '/' + trackName);
    }
}
