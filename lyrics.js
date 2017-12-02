const Promise = require('bluebird');
var request = Promise.promisify(require("request"), {
    multiArgs: true
});
Promise.promisifyAll(request, {
    multiArgs: true
});
const SpotifyWebApi = require('spotify-web-api-node');
const clientId = process.env.CLIENT_ID,
    clientSecret = process.env.CLIENT_SECRET;

// Create the api object with the credentials
const spotifyApi = new SpotifyWebApi({
    clientId: clientId,
    clientSecret: clientSecret
});

module.exports = {
    getLyrics: function (trackId) {
        spotifyApi.clientCredentialsGrant()
            .then(function (data) {
                spotifyApi.setAccessToken(data.body['access_token']);
            })
            .then(() => {
                return spotifyApi.getTrack(trackId);
            })
            .then(data => {
                const title = data.body.name;
                const primaryArtist = data.body.artists[0].name;
                /* Now, get the lyrics */
                return request('https://api.lyrics.ovh/v1/' + primaryArtist + '/' + title);
            })
            .then((response, body) => {
                console.log(response, body);
            })
            .catch(err => {
                console.error("ERROR!", err);
            });
    }
}
