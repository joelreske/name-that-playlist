require('dotenv').config()

/**
 * This is an example of a basic node.js script that performs
 * the Authorization Code oAuth2 flow to authenticate against
 * the Spotify Accounts.
 *
 * For more information, read
 * https://developer.spotify.com/web-api/authorization-guide/#authorization_code_flow
 */

var express = require('express'); // Express web server framework
var request = require('request'); // "Request" library
var querystring = require('querystring');
var cookieParser = require('cookie-parser');
var fs = require('fs');

var client_id = process.env.CLIENT_ID; // Your client id
var client_secret = process.env.CLIENT_SECRET; // Your secret
var redirect_uri = process.env.REDIRECT_URI; // Your redirect uri

const Lyrics = require('./lyrics');

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
var generateRandomString = function (length) {
    var text = '';
    var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (var i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
};

var stateKey = 'spotify_auth_state';

var app = express();

app.use(express.static(__dirname + '/public'))
    .use(cookieParser());
// app.use(express.static(__dirname + '/node_modules/animejs/anime.min.js'));

app.get('/login', function (req, res) {

    var state = generateRandomString(16);
    res.cookie(stateKey, state);

    // your application requests authorization
    var scope = 'playlist-read-private user-read-private user-read-email';
    res.redirect('https://accounts.spotify.com/authorize?' +
        querystring.stringify({
            response_type: 'code',
            client_id: client_id,
            scope: scope,
            redirect_uri: redirect_uri,
            state: state
        }));
});

app.get('/callback', function (req, res) {

    // your application requests refresh and access tokens
    // after checking the state parameter

    var code = req.query.code || null;
    var state = req.query.state || null;
    var storedState = req.cookies ? req.cookies[stateKey] : null;

    if (state === null || state !== storedState) {
        res.redirect('/#' +
            querystring.stringify({
                error: 'state_mismatch'
            }));
    } else {
        res.clearCookie(stateKey);
        var authOptions = {
            url: 'https://accounts.spotify.com/api/token',
            form: {
                code: code,
                redirect_uri: redirect_uri,
                grant_type: 'authorization_code'
            },
            headers: {
                'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
            },
            json: true
        };

        request.post(authOptions, function (error, response, body) {
            if (!error && response.statusCode === 200) {

                var access_token = body.access_token,
                    refresh_token = body.refresh_token;

                var options = {
                    url: 'https://api.spotify.com/v1/me',
                    headers: {
                        'Authorization': 'Bearer ' + access_token
                    },
                    json: true
                };

                // use the access token to access the Spotify Web API
                request.get(options, function (error, response, body) {
                    console.log(body);
                });

                // we can also pass the token to the browser to make requests from there
                res.redirect('/#' +
                    querystring.stringify({
                        access_token: access_token,
                        refresh_token: refresh_token
                    }));
            } else {
                res.redirect('/#' +
                    querystring.stringify({
                        error: 'invalid_token'
                    }));
            }
        });
    }
});

app.get('/refresh_token', function (req, res) {

    // requesting access token from refresh token
    var refresh_token = req.query.refresh_token;
    var authOptions = {
        url: 'https://accounts.spotify.com/api/token',
        headers: {
            'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
        },
        form: {
            grant_type: 'refresh_token',
            refresh_token: refresh_token
        },
        json: true
    };

    request.post(authOptions, function (error, response, body) {
        if (!error && response.statusCode === 200) {
            var access_token = body.access_token;
            res.send({
                'access_token': access_token
            });
        }
    });
});

const Promise = require('bluebird');
var rp = require('request-promise');
// var request = Promise.promisify(require("request"), {
//     multiArgs: true
// });
// Promise.promisifyAll(request, {
//     multiArgs: true
// });
const SpotifyWebApi = require('spotify-web-api-node');
const clientId = process.env.CLIENT_ID,
    clientSecret = process.env.CLIENT_SECRET;

// Create the api object with the credentials
const spotifyApi = new SpotifyWebApi({
    clientId: clientId,
    clientSecret: clientSecret
});

const Natural = require('natural');
const Classifier = new Natural.BayesClassifier();
const Tokenizer = new Natural.WordTokenizer();

const trainingSet = [
    {
        playlistId: "5XImMDY9wV8ouAeNWDlcbl",
        sentiment: "Sadness"
    },
    {
        playlistId: "5B5W56ddH2PXRyao2yrKAD",
        sentiment: "Anger"
    },
    {
        playlistId: "2WXXDWbK3Bt5hrR5UnIeIA",
        sentiment: "Joy"
    },
    {
        playlistId: "6901MeNMIJaAvBPuxOyXAx",
        sentiment: "Love"
    }
];

spotifyApi.clientCredentialsGrant()
    .then(function (data) {
        spotifyApi.setAccessToken(data.body['access_token']);
    })
    .then(() => {
        return Promise.each(trainingSet, c => {
            spotifyApi.getPlaylist('joelres', c.playlistId)
                .then(function (data) {
                    return Promise.each(data.body.tracks.items, t => {
                        var track = t.track;
                        console.log(track.name, track.artists[0].name, c.sentiment); // print song and sentiment
                        return Lyrics.getLyrics(track.name, track.artists[0].name).then(info => {
                            console.log("-------------");
                            console.log("-------------");
                            console.log("-------------");
                            console.log(Tokenizer.tokenize(info.lyrics).join(" ")); // print lyrics
                            return Classifier.addDocument(Tokenizer.tokenize(info.lyrics).join(" "), c.sentiment);
                        });
                    });
                }, function (err) {
                    console.log('Something went wrong!', err);
                });
        });
    })
    .then(() => {
        setTimeout(function () {
            Classifier.train();
            console.log("classifier has been trained!");
        }, 10000);
    });

const MAX_SONGS_TO_ANALYZE = 15;
app.get('/playlistAnalysis', function (req, res, next) {
    /* First, get the playlist */
    const playlistId = req.query.playlistId;
    const userId = req.query.userId;
    const token = req.query.token;

    console.log(userId, token);

    spotifyApi.setAccessToken(token);
    spotifyApi.getPlaylistTracks(userId, playlistId)
        .then(tracks => {
            return Promise.map(tracks.body.items.slice(0, MAX_SONGS_TO_ANALYZE + 1), item => {
                return Lyrics.getLyrics(item.track.name, item.track.artists[0].name);
            });
        })
        .then(info => {
            res.json(info.filter(l => l != undefined && l.lyrics != undefined).map(l => {
                const cs = Classifier.getClassifications(l.lyrics);
                const total = cs.reduce((total, c) => total + c.value, 0);
                return {
                    trackName: l.trackName,
                    classifications: Classifier.getClassifications(l.lyrics).map(c => ({
                        label: c.label,
                        value: c.value,
                        percentage: (100 * (c.value / total)).toFixed(0)
                    }))
                };
            }));
        })
        .catch(err => {
            console.error("Hello", err);
            res.sendStatus(500);
        });
});

var sass = require('node-sass');
sass.render({
    indentedSyntax: true,
    file: 'sass/index.sass',
    // includePaths: [ 'lib/', 'mod/' ],
    outputStyle: 'compressed',
    outFile: 'public/css/index.css'
}, function (error, result) { // node-style callback from v3.0.0 onwards
    if (error) {
        console.log(error.status); // used to be "code" in v2x and below
        console.log(error.column);
        console.log(error.message);
        console.log(error.line);
    } else {
        console.log(result.stats);

        // No errors during the compilation, write this result on the disk
        fs.writeFile('public/css/index.css', result.css, function (err) {
            if (!err) {
                //file written on disk
            }
        });
    }
});

console.log('Listening on 8888');

//Lyrics.getLyrics("3n3Ppam7vgaVa1iaRUc9Lp");

app.listen(process.env.PORT || 8888);
