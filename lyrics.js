const Promise = require('bluebird');
var request = Promise.promisify(require("request"), {
    multiArgs: true
});
Promise.promisifyAll(request, {
    multiArgs: true
});

module.exports = {
    getLyrics: function (trackName, artistName) {
        return request.getAsync('https://api.lyrics.ovh/v1/' + artistName + '/' + trackName).then(res => {
            var [blah, body] = res;
            body = JSON.parse(body);
            return {
                lyrics: body.lyrics,
                trackName: trackName
            };
        }).catch(err => console.error(err));
    }
}
