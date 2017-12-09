const Promise = require('bluebird');
var rp = require('request-promise');
// var request = Promise.promisify(require("request"), {
//     multiArgs: true
// });
// Promise.promisifyAll(request, {
//     multiArgs: true
// });

module.exports = {
    getLyrics: function (trackName, artistName) {
        return rp({uri: 'https://api.lyrics.ovh/v1/' + artistName + '/' + trackName, timeout: 1000})
        .then(function(res) {
            body = JSON.parse(res);
            return {
                lyrics: body.lyrics,
                trackName: trackName
            };
        }).catch(function(err) {
            console.error("Couldn't find song."); return {lyrics: undefined, trackName: undefined}
        });
    }
}
