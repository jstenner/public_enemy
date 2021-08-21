const https = require('https');
const express = require('express');
var assert = require('assert');
var jsonfile = require('jsonfile');
var fs = require("fs");
var request = require('request');
var util = require('util');
var Promise = require('bluebird');
var twitter = require('twitter');
var rita = require('rita');
var MongoDB = Promise.promisifyAll(require("mongodb"));
var MongoClient = Promise.promisifyAll(MongoDB.MongoClient);
var schedule = require('node-schedule');
var logger = require('./utils/logger');
var loadconfig = require('./utils/loadconfig.js');

var defaultOptions = loadconfig.DEFAULTS;

var port = defaultOptions.PORT;

var userConfig = {
    consumer_key: defaultOptions.PETWITTER_CONSUMER_KEY,
    consumer_secret: defaultOptions.PETWITTER_CONSUMER_SECRET,
    access_token_key: defaultOptions.PETWITTER_ACCESS_TOKEN_KEY,
    access_token_secret: defaultOptions.PETWITTER_ACCESS_TOKEN_SECRET
};

var appConfig = {
    consumer_key: defaultOptions.PETWITTER_CONSUMER_KEY,
    consumer_secret: defaultOptions.PETWITTER_CONSUMER_SECRET,
    bearer_token: defaultOptions.PETWITTER_BEARER_TOKEN
};

// https://dev.twitter.com/oauth/application-only
var consumer_key = defaultOptions.PETWITTER_CONSUMER_KEY;
var consumer_secret = defaultOptions.PETWITTER_CONSUMER_SECRET;
var enc_secret = new Buffer(consumer_key + ':' + consumer_secret).toString('base64');

var oauthOptions = {
    url: 'https://api.twitter.com/oauth2/token',
    headers: {'Authorization': 'Basic ' + enc_secret, 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'},
    body: 'grant_type=client_credentials'
};

var bearer; // bearer token for app-level access
var appTwitterClient;
var userTwitterClient;
var currentStream;
var trackParams;
var tweetIndexCollection;
var tweetCollection;
var options;


var currentHashtagsJSON = "/static/json/currenthashtags.json";
//var tmpHashtagsJSON = "/static/json/tmp/currenthashtags.json"
var avatar_frog = "/static/ae-frog.txt";
var mythologies = "/static/myth.txt";
var walden = "/static/walden.txt";
var smackdown = "/static/smackdown.txt";
var currentHashtags;

var aeText = ""; // Avatar Emergency excerpt
var mythText = ""; // Mythologies excerpt
var waldenText = ""; // Walden excerpt
var smackdownText = ""; // ECW One Night Stand 2006

var trackerJob = null;
var trackerRule = null;
var collectJob = null;
var collectRule = null;

var app = express();

var dbURL = 'mongodb://' +
    defaultOptions.MONGOUSER + ':' +
    defaultOptions.MONGOPASS + '@' +
    defaultOptions.MONGOHOST + ':' +
    defaultOptions.MONGOPORT;

if (defaultOptions.MONGODB){
    dbURL = dbURL + '/' + defaultOptions.MONGODB;
}

// https://stackoverflow.com/questions/15680985/what-is-the-right-way-to-deal-with-mongodb-connections/15688610#15688610
// So, evidently, from the guy who designed it, Mongodb should be connected to one time and left open in node.js apps.
var peDb = null; // mongo database

app.use(express.static('static'));

app.use(function(req, res, next) {
    res.header('Access-Control-Allow-Origin', "*");
    res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

// routes =====================================================================

app.get('/', function (req, res) {
  res.send('./static/index.html');
});

app.get('/tweets', function (req, res) {
    // count hashtags
    logger.debug("via app.get:" + req.query.hashtag);
    countHashtags(bearer, req.query.hashtag,
        function (err, statuses, total) {
            if (err) {
                logger.error(err);
            } else {
                if (req.query.full) {
                    res.json(statuses);
                } else {
                    res.json({count: total});
                }
            }
        });
});

app.get('/gen', function (req, res) {
    // get generative sentence(s)
    //console.log("received: " + req.query.hashtag);
    getGen(req.query.hashtag,
        function (err, sentences, total) {
            if (err) {
                logger.error(err);
            } else {
                res.json(sentences);
            }
        });
});

app.get('/hashtags', function (req, res) {
    // retreive hashtags
    getHashtags(
        function (err, total) {
            if(err){
                logger.error(err);
            } else {
                res.json( { count : total } );
            }
        });
});

app.get('/update', function (req, res) {

    updateCurrentHashtags(
        function (err, success) {
            if(err){
                logger.error(err);
            } else {
                res.json( { msg : success } );
            }
        });
});


app.listen(defaultOptions.PORT, defaultOptions.HOST, function() {
    logger.info("Listening on " + defaultOptions.HOST + ":" + defaultOptions.PORT);
});

init();

function init() {
    // I'm saving the bearer token in an environment variable. If for some reason
    // it changes and we need to generate another one, just uncomment getBearerToken()
    // and copy paste the console.log print.
    //getBearerToken();

    appTwitterClient = setupTwitterClient("appAuth");
    //setTimeout(run, 4000); // give it time to grab the client

    userTwitterClient = setupTwitterClient("userAuth");

    // Load up Avatar Emergency, Frog
    fs.readFile(__dirname + avatar_frog, function (err, data) {
        if (err) throw err;
        aeText = data.toString();
    });
    // Load up Barthes Mythologies, The World of Wrestling
    fs.readFile(__dirname + mythologies, function (err, data) {
        if (err) throw err;
        mythText = data.toString();
    });

    // Load up Walden, The World of Wrestling
    fs.readFile(__dirname + walden, function (err, data) {
        if (err) throw err;
        waldenText = data.toString();
    });

    // Load up Smackdown
    fs.readFile(__dirname + smackdown, function (err, data) {
        if (err) throw err;
        smackdownText = data.toString();
    });

    setEnvironment();

    setInterval(tweetPoster, 1.1 * 60000); // 1 post every 1.1 mins to keep below 15/15min Twitter limit.

    // For testing - single shot tweet post
/*    setTimeout(function(){
     tweetPoster();
     }, 5000);*/

/*    setTimeout(function () {
        deleteData(100);
    }, 10000);*/

    // The real deal - 7 days per week at 11:30am (GMT + 5). A timeout function kills it.
    trackerRule = new schedule.RecurrenceRule();
    trackerRule.dayOfWeek = [0, 1, 2, 3, 4, 5, 6];
    trackerRule.hour = 16;
    trackerRule.minute = 30;

/*    // For testing - schedule Twitter Streaming tracker
    trackerRule = new schedule.RecurrenceRule();
    trackerRule.minute = 58;*/

    trackerJob = schedule.scheduleJob(trackerRule, function(){
        runTracker();
    });

    // Run every 6 hours.
    collectJob = schedule.scheduleJob('0 */6 * * *', function(){
        logger.info('Twitter search (hr6): grabbing 100 most recent tweets.');
        // TODO Make this recursive.
        collectTweets(currentHashtags);
        setTimeout(analyzeResults,15000); // wish I could use promises
    });

    /*    var tweetArray = ["AllinForJeb", "JebBush", "ImWithBen", "Carson2016"];
     // For testing - single shot twitter search
     setTimeout(function () {
     collectTweets(tweetArray);
     }, 5000);*/

    // For testing - schedule Twitter Search
/*    collectRule = new schedule.RecurrenceRule();
    collectRule.minute = 5;

    collectJob = schedule.scheduleJob(collectRule, function(){
        logger.info('Starting twitter search.');
        collectTweets(currentHashtags);
        setTimeout(analyzeResults,10000); // wish I could use promises
    });*/

};

// Establish basic working conditions for our app.
function setEnvironment(){
    loadHashtags(currentHashtagsJSON).then(function (theHashtags) {
        logger.info("Hashtags loaded.");
        currentHashtags = theHashtags;
        return createTrackingParams(currentHashtags);
    }).then(function(){
        logger.info("Twitter Streaming API tracking parameters created.")
        return connectToMongo();
    }).then(function(){
        logger.info("Connected to database.");
        return getHashtagCounts(currentHashtags);
    }).then(function(rawHashtags) {
        logger.info("Gathered raw hashtag counts.");
        return normalizeHashtagCounts(rawHashtags);
    }).then(function (normalizedHashtags) {
        logger.info("Normalized hashtag counts.");
        var filePath = __dirname + currentHashtagsJSON;
        writeJSON(filePath, normalizedHashtags)
            .then(function (val) {
                logger.info("Wrote:" + val);
            });
        logger.info("Done configuring the environment.");
        return true;
    }).catch(function(error){
        logger.error(error);
    });
};

/**
 * Start the twitter tracker and set it to stop after 1 hour.
 */
function runTracker(){
    twitterTrack(trackParams);
    setTimeout(stopStream, 60 * 60000); // 1 Hour
}

function run(){

    countHashtags(bearer, "bernieorbust", function (err, statuses, total) {
        if (err) {
            console.error(err);
        } else {
            console.log("total: " + total);
            console.dir(statuses);
        }
    });
};

function stopStream(){
    //currentStream.readable = false;
    currentStream.destroy();
    let tweetCollection = peDb.collection("tweets");
    tweetCollection.stats( { scale: 1024 * 1024} ).then(function (statics) {
        logger.info("Closing the Twitter Tracker. Current size of tweets collection: " + statics.size/1024 + " Gigabytes.");
        //console.dir(statics.size);
    });
    analyzeResults();
};
/**
 * Reset the environment so the JSON currenttags file is re-read, characterized and regenerated.
 */
function analyzeResults(){
    if(!defaultOptions.TOUCHRELOAD) {
        logger.info("Resetting the environment after search/stream.");
        setEnvironment(); // prefer touch reload, because it seems the mongo conn is a problem.
    } else {
        logger.info("Touching semaphore file to initiate restart after search/stream.");
        touchReload();
    };
};

function createIndex(){
    if (peDb != null){
        tweetIndexCollection = peDb.collection("tweetIndex");
        tweetIndexCollection.createIndex( { text: "text" } );
    };

};

/**
 * touchReload "touches" a file whenever it seems strategic to cause pm2 to reload the application.
 * This should clear memory, reconnect to the database, and generally give it a fresh start as often
 * as the app updates the database with new items. I could do this programmatically, but this technique
 * gives me the option to ignore it by simply not telling pm2 to "watch" the reload.txt.
 */
function touchReload(){
    fs.closeSync(fs.openSync(__dirname + "/tmp/reload.txt", 'w'));
}

// Grab the mongo tweets collection, iterate through hashtag list and tabulate number of occurrences in db.
// https://stackoverflow.com/questions/20812056/running-for-in-loop-with-mongodb-operations
function getHashtagCounts(tags) {
    var count = 0;
    var tagArray  = [];
    var countArray = [];
    for (key in tags){
        tagArray.push(key);
    }

    return new Promise(function (resolve, reject) {
        Promise.map(tagArray, function (tag) {
            // this searches the text field for the tag, returning the id if it finds it.
            peDb.collection("tweets").find({'text': {'$regex': tag, $options: 'i'}}, { '_id': true }).toArrayAsync()
                .then(function(tweetsPerTag){
                    return tweetsPerTag.length;
                })
                .then(function (numTweets) {
                    currentHashtags[tag] = numTweets;
                    logger.debug("Counting tweets for " + tag + ": " + numTweets);
                    countArray.push(numTweets);
                })
                .then(function () {
                    if(countArray.length == tagArray.length){
                        //console.log("WE'RE DONE: ", currentHashtags);
                        resolve(currentHashtags);
                    }
                })
                .catch(function (err) {
                    reject(err);
                });
        });
    });
};

// Adjust each hashtag count to place them in relation to each other on a scale from min to max (or 1 - 100).
function normalizeHashtagCounts(tags) {
    var tagArray = [];
    var countArray = [];
    for (key in tags) {
        tagArray.push(key);
    };
    for (key in tags) {
        countArray.push(tags[key]);
    };

    let maxCount = Math.max(...countArray); // using new ES6 Spread operator
    let minCount = Math.min(...countArray);
    logger.debug("Raw tag count max: " + maxCount + "  min: " + minCount)
    let normMin = 0;
    let normMax = 1;

    return new Promise(function (resolve, reject) {
        Promise.map(countArray, function (rawCount) {
            //console.log(rawCount);
            let normVal = mapRange(rawCount, minCount, maxCount, normMin, normMax );
            return normVal;
        }).then(function (normalizedVal) {
            //console.log(normalizedVal);
            for(let i = 0; i < normalizedVal.length; i++){
                currentHashtags[tagArray[i]] = normalizedVal[i];
            };
            //console.log(currentHashtags);
            resolve(currentHashtags);
        }).catch(function (err) {
            reject(err);
        });
    });
};

// Map an input number from one range to another.
function mapRange(valueToBeMapped, currentLow, currentHigh, desiredLow, desiredHigh) {
    return desiredLow + (desiredHigh - desiredLow) * (valueToBeMapped - currentLow) / (currentHigh - currentLow);
};

function writeJSON(file, obj) {
    //var file = '/tmp/data.json'
    //var obj = {name: 'JP'}

    return new Promise(function (resolve, reject) {
        jsonfile.writeFile(file, obj, function (err) {
            if(err){
                reject(err);
            }else{
                resolve(file);
            }
        });
    })

};

function printTweets(err, data){
    //console.log("Number of items: " + data.length);
    //console.dir(currentHashtags);
    if(data.length > 0)
    console.log(data[0].text);
    //cb();
}

function twitterTrack(params) {

    // Should already be connected to database
    let tweetCollection = peDb.collection("tweets");
    tweetCollection.stats( { scale: 1024 * 1024} ).then(function (statics) {
        logger.info("Starting the Twitter Stream/Tracker. Current size of tweets collection: " + statics.size/1024 + " Gigabytes.");
        //console.dir(statics.size);
    });
    userTwitterClient.stream('statuses/filter', {track: params},  function(stream) {
        stream.on('data', function(chunk) {
            currentStream = stream;
            var tweet = chunk;
            tweetCollection.insert(tweet, function (error) {
                if (error) {
                    logger.error(error.message);
                } else{
                    logger.trace("Tweet inserted: ", tweet.text);
                }
            });
        });

        stream.on('error', function(error) {
            logger.error(error);
        });
    });
};

function createTrackingParams(hashtagJSON){
    //console.dir(hashtagJSON);
    return new Promise(function(resolve, reject){
        var tmpStr = "";
        for(var key in hashtagJSON){
            if(key.charAt(0) == "#"){
                tmpStr += key.slice(1) + ", ";
            }else{
                tmpStr += key + ", ";
            }
        };
        if (tmpStr != ""){
            trackParams = tmpStr; // setting this globally, may not need to now that chained
            //console.dir(trackParams);
            resolve(tmpStr);
        }
        else
            reject("Failed to create tracking parameters.")
    });
};

function connectToMongo() {
    return new Promise(function (resolve, reject) {
        if (peDb == null) {
            MongoClient
                .connectAsync(dbURL, {
                    promiseLibrary: Promise,
                    poolSize: 12
                })
                .then(function (db) {
                    peDb = db;
                    resolve(peDb);
                })
                .catch(function (err) {
                    reject(err);
                });
        } else{
            resolve(logger.info("No need to reconnect, already connected to database."));
        };
    });
};

function saveData(data) {
    MongoClient
        .connect(dbUrl, {
            promiseLibrary: Promise
        })
        .then(function(db) {
            return db
                .collection('myCollection')
                .insert(data)
                .finally(db.close.bind(db))
        })
        .catch(function(err) {
            console.error("ERROR", err);
        });
}

/**
 * deleteData removes the "num" oldest documents from the tweet collection.
 * @param numToDelete
 */
function deleteData(numToDelete){
    let tweetCol = peDb.collection("tweets");

    tweetCol.count(function (err, numTweets) {
        logger.info("Current number of tweets in collection: " + numTweets);
    });

    tweetCol.find({}, {_id : 1})
        .limit(numToDelete)
        .sort({timestamp:-1})
        .toArray()
        .map(function(doc) { 
            return doc._id; 
        }).then(function (idArray) {
            tweetCol.deleteMany({_id: {$in: idArray}}, function (err, results) {
                if(err){
                    logger.error("Error deleting tweets: " + err);
                } else{
                    logger.debug("DELETEMANY: " + results);
                    tweetCol.count(function (err, numTweets) {
                        logger.info("Post-delete number of tweets in collection: " + numTweets);
                    });
                };
            });
        });
};

// twitter api handling ========================================================

function countHashtags (token, hashtag, cb) {
  var query = '#'+hashtag;
  var opt = {};
  var retrievedStatuses = [];
  var total = 0;

  (function recursiveGetTweets (t, o, h, p, cb) {
    getTweets (t, o, h, p,
      function (err, data, pop) {
        if(err) {
          return cb(err);
        }
        if(pop){
          data.statuses = data.statuses.slice(1);
        }
        total += data.statuses.length;
        retrievedStatuses.push(data.statuses);
        if(data.search_metadata.next_results && data.search_metadata.count === 100) {
          o.next_results = data.search_metadata.next_results;
          recursiveGetTweets(t, o, h, true, cb);
        } else {
          cb(null, retrievedStatuses, total);
        }
      });
  })(token, opt, query, false, cb);
};

// https://dev.twitter.com/rest/reference/get/search/tweets
// rate limit: 180 (user auth), 450 (app auth)

function getTweets (token, qoptions, query, pop, cb) {
  var baseq = '?q=';
  var encQuery = baseq+encodeURIComponent(query);
  if(qoptions.next_results) {
    encQuery = qoptions.next_results;
    console.log(encQuery);
  }
  encQuery += '&count=100';
  var options = {
    hostname : 'api.twitter.com',
    path : '/1.1/search/tweets.json'+encQuery,
    headers : {
      'Authorization' : 'Bearer ' + token
    }
  };
  var resData = '';
  https.get(options, function ( res ) {
    res.on('data', function (d) {
      resData += d;
    });
    res.on('end', function () {
      var err = null;
      try {
        resData = JSON.parse(resData);
      } catch (e) {
        err = e;
      } finally {
        cb(err, resData, pop);
      }
    });
  });
};

/**
 * collectTweets accepts a list of hashtags and retrieves up to the Twitter defined, single call
 * max of 100 tweets, and places them in the database. This is scheduled to run periodically every day.
 * Earlier version would update existing entries and add new ones that are not present in the database.
 * Now that we're using a capped collection, we just insert rather than update.
 * @param tagsJSON
 */
function collectTweets(tagsJSON) {
    var tagArray = [];
    var tweetCount = 0;

    for (var key in tagsJSON) {
        tagArray.push(key);
    }

    // for testing - allowing input to be array
    /*    for (key in tagsJSON){
     tagArray.push(tagsJSON[key]);
     }*/

    // Should already be connected to database
    let tweetCollection = peDb.collection("tweets");


    Promise.map(tagArray, function (tag) {
        // I tested adding "result_type: 'popular'" to the options, but some tags returned 0!
        appTwitterClient.get('search/tweets', {q: tag, count: 100}, function (error, tweets, response) {
            if (!error) {
                logger.detail(tweets);
                logger.debug("Tweets returned for " + tag + ": " + tweets.statuses.length);
                tweetCount += tweets.statuses.length;
                for (var key in tweets.statuses) {
                    // be sure it's a tweet, not search_metadata (which is also returned)
                    if (tweets.statuses[key].id) {
                        // we now use a capped collection, so we just insert new tweets
                        // rather than updateOne w/upsert as done previously.
                        tweetCollection.insertOne({id: tweets.statuses[key].id},
                            {$set: tweets.statuses[key]})
                            .then(function (result) {
                                assert.equal(1, result.result.n);
                            });
                    };
                    logger.detail("collectTweets: " + response);
                };

            } else {
                logger.error(error);
            };
        });
    });
};

function updateCurrentHashtags( cb ){
    loadHashtags(currentHashtagsJSON).then(function (theHashtags) {
        logger.info("Latest hashtags loaded.");
        currentHashtags = theHashtags;
        return collectTweets(currentHashtags);
    }).then(function(){
        logger.info("Collected tweets for updated hashtag list.");
        var success = "Collected tweets for updated hashtag list.";
        cb(null, success);
        setTimeout(analyzeResults,15000);
    }).catch(function(error){
        logger.error(error);
    });
}

/**
 * tweetPoster() will check the database postqueue and post a single tweet from the collection.
 * Once the tweet is posted, it deletes the document from the queue and increments the current
 * post count.
 */
function tweetPoster() {
    let postqueue = peDb.collection("postqueue");
    let currentPostSentence = null;

    return new Promise(function (resolve, reject) {
        postqueue.count(function (err, count) {
            logger.debug("Tweets waiting to be posted: " + count);
            if (err) {
                reject(err);
            } else if (count > 0) {
                    postqueue.find({},{posted:0}).limit(1).toArray()
                        .then(function (postSentence) {
                            let tweetText = constructTweet(postSentence);
                            currentPostSentence = postSentence;
                            return tweetText;
                        }).then(function (theText) {
                            let postedTweet = postTweet(theText, userTwitterClient);
                        }).then(function () {
                            postqueue.deleteOne({_id:currentPostSentence[0]._id}, function (err, results) {
                                if (err) {
                                    reject(err);
                                }
                                else {
                                    resolve();
                                }
                            });
                        }).catch(function (err) {
                            reject(err);
                        });
            } else {
                logger.debug("Queue is empty. Nothing to post");
            };
        });
    });
};

function constructTweet(tweetArray){
    return new Promise(function (resolve, reject) {
        logger.debug("tweetArray: " + tweetArray);
        let tweetPost = "#" + tweetArray[0].tag + " " + tweetArray[0].sentence1 + " " + tweetArray[0].sentence2;
        let trimmedPost = tweetPost.substring(0,140); // 140 chars max for Twitter :-(
        if(trimmedPost != ""){
            resolve(trimmedPost);
        }else{
            logger.debug("Unable to compose post.");
            reject();
        };
    });
};

function postTweet(tweetStr, client){
    return new Promise(function (resolve, reject) {
        client.post('statuses/update', {status: tweetStr}, function(error, tweet, response) {
            if (!error) {
                logger.info("Posting tweet: " + tweet.id_str);
                logger.debug(tweet);
                logger.detail(response);
                resolve(tweet);
            } else {
                reject(error);
            }
        });
    })

};

// utility functions ========================================================

function getHashtags ( cb ) {
    var total = 100;
    cb(null, total);
}

function getGen(tag, cb) {
    // There are 22 sentences in aeText, so limiting to 40 should equalize starting weight. <-- work on this
    let maxToRetrieve = 40;

    retrieveTagText(tag, maxToRetrieve).then(function (theTextArray) {
        logger.debug("Retrieved tweets: " + theTextArray.length);
        return theTextArray;
    }).then(function (daTextArray) {
        var sentences = processTagText(tag, daTextArray);
        sentences.then(function (value) {
            cb(null, value);
        });
        return sentences;
    }).then(function(theseSentences){
        saveSentencesToDb(theseSentences);
    }).catch(function (err) {
        logger.error(err);
    })
};

function retrieveTagText(tag, num){
    var defaultText = ["Sorry, this tag is not very popular right now!", "Maybe this tag was popular at one time, but no one is saying anything with it now!"];

    return new Promise(function (resolve, reject) {
        // This query returns the num, latest, text fields, minus retweets.
        peDb.collection("tweets").find({'text': {'$regex': tag, $options: 'i'}, 'retweeted_status':
        { '$exists' : false }},{_id:0, text:1}).limit(num).sort({created_at:1}).toArray()
            .then(function(tagArray){
                //console.log(tagArray.length);
                if(tagArray.length == 0){
                    resolve(defaultText);
                }else{
                    //console.dir(tagArray);
                    resolve(tagArray);
                };
            })
            .catch(function (err) {
                reject(err);
            });
        //});
    });
};
/**
 * Use RiTA to generate sentences using RiMarkov
 * @param tag
 * @param text
 */
function processTagText(tag, text) {
    // the higher the "n" value, the more similar to the original sentence.
    var rm = new rita.RiMarkov(2, true, true); // factor, recognizeSentences, allowDuplicates
    var textString = "";
    let curSentences = {
        sentence1 : "",
        sentence2 : "",
        tag       : "",
        posted    : false
    };

    return new Promise(function (resolve, reject) {
        for (var k in text) {
            textString += text[k].text + ". ";
        };
        //console.log("===============================================================");
        //console.log("RAW STRING: " + textString);
        var noLines = textString.replace(/\r?\n|\r/g, " "); // remove any new lines
        var noUrlString = noLines.replace(/(?:https?|ftp):\/\/[\n\S]+/gm, ""); // remove any urls

        var noAtWordsString = noUrlString.replace(/@\w+\s+/ig,""); // remove words beginning with @
        var words = rita.RiTa.tokenize(noAtWordsString, /\s/g); // break up based on spaces between words
        for(var i = 0; i < words.length; i++) {
            if (words[i].charAt(0) == "#") {
                words[i] = makeHashSentence(words[i]);
            }
        };
        var expandedString = rita.RiTa.untokenize(words);

        var noHashString = expandedString.replace(/#|@/g,""); // remove any # or @ symbols that remain
        //var noHashString = noUrlString.replace(/@/g,""); // remove just @ symbols

        var noCamelsString = unCamelCase(noHashString); // separate camel case words
        //var noCamelsString = noLines;
        var noDoublesString = noCamelsString.replace(/ +(?= )/g,''); // remove double spaces and replace with single
        var noLeadingSpString = noDoublesString.replace(/^\s+ \s+$/g,''); // trim leading/trailing spaces
        var capFirstString = noLeadingSpString.charAt(0).toUpperCase() + noLeadingSpString.slice(1); // Cap at first letter of string.

        // load strings and apply multiplier to give weight to contents.
        rm.loadText(aeText, 1);
        rm.loadText(mythText, 1);
        rm.loadText(waldenText, 1);
        rm.loadText(smackdownText, 1);
        rm.loadText(capFirstString, 40);
        logger.debug("tag sentence: " + capFirstString);
        var sentences = rm.generateSentences(2);
        sentences.push(tag);
        curSentences.sentence1 = sentences[0];
        curSentences.sentence2 = sentences[1];
        curSentences.tag = sentences[2];
        logger.debug("===============================================================");
        logger.debug("tag: " + curSentences.tag);
        logger.debug("sentence 1: " + curSentences.sentence1);
        logger.debug("sentence 2: " + curSentences.sentence2);
        logger.debug("===============================================================");
        resolve(curSentences);
        if (curSentences == null) {
            reject(err);
        }
    });
};

function saveSentencesToDb(sentences) {
    let sentenceCollection = peDb.collection("sentences");
    let postQueue = peDb.collection("postqueue");

    return new Promise(function (resolve, reject) {
        //console.log(util.inspect(sentences, {depth: null, colors: true}))
        //console.log("Sentence1: " + sentences.sentence1);
        sentenceCollection.insertOne(sentences, function (error) {
            if (error) {
                reject("Error: ", error.message);
            } else {
                logger.debug("Sentence inserted into database.");
                postQueue.insertOne(sentences, function (error) {
                    if (error) {
                        reject("Error: ", error.message);
                    } else {
                        logger.debug("Sentence inserted into post queue.");
                        resolve();
                    }
                });
            };
        });
    });
};

/*function loadHashtags(file) {
    var filePath = __dirname + file;
    var hashtags = jsonfile.readFileSync(filePath);
    return hashtags;
}*/

function loadHashtags(file) {
    return new Promise(function(resolve, reject){
        var filePath = __dirname + file;
        jsonfile.readFile(filePath, function (err, obj) {
            if (obj != null){
                //currentHashtags = obj;
                resolve(obj);
            }
            else{
                reject(err);
            }
        });
    });
};

function getHashtagCount(tag){
    appTwitterClient.get('search/tweets', {q: 'node.js'}, function(error, tweets, response) {
        console.log(tweets);
    });
};

// Setup either a user authenticated or app authenticated twitter client.
// App auth allows a higher call threshold (450 currently) but restricts the type of info.
// User auth allows access to a user account (150 calls/15 min) and is also required for access to Streaming API
function setupTwitterClient(type) {

    if (type == "appAuth") {

        // First grab a "bearer token" for application level Twitter auth
        // if for some reason it's changed or you haven't already set it in env.
        request.post(oauthOptions, function (e, r, body) {
            if (e || r.statusCode != 200) {
                console.error("Status Code: " + r.statusCode + "Error: " + e);
            } else {
                var bod = JSON.parse(body);
                bearer = bod.access_token;
                //console.log("Got a twitter Bearer token: " + bearer);
                appConfig.bearer_token = bearer;
                //console.dir(appConfig);
                appTwitterClient = new twitter(appConfig);
                //Promise.promisifyAll(appTwitterClient); // never got this to work
                return appTwitterClient;
            };
        });
    } else if (type == "userAuth"){
        appTwitterClient = new twitter(userConfig);
        return appTwitterClient;
    } else{
        return console.log("Set type to, appAuth or userAuth!");
    }
};

function unCamelCase (str){
    return str
    // insert a space between lower & upper
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        // space before last upper in a sequence followed by lower
        .replace(/\b([A-Z]+)([A-Z])([a-z])/, '$1 $2$3')
        // uppercase the first character
        .replace(/^./, function(str){ return str.toUpperCase(); })
};

function makeHashSentence(str){
    return str
        // remove hash
        .replace(/#/g,"")
        // insert a space between lower & upper
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        // space before last upper in a sequence followed by lower.
        .replace(/\b([A-Z]+)([A-Z])([a-z])/, '$1 $2$3')
        // Lowercase everything
        .replace(/./gi, function(str){ return str.toLowerCase(); })
        // uppercase the first character
        .replace(/^./, function(str){ return str.toUpperCase(); })
        // every hashtag is an exclamation, right?
        + "!";
}

/**
 *  Grab a Twitter API bearer token. This is needed for Application-level API access (i.e. higher limits)
 *  This is a utility function to retrieve the token which is saved in an an environment variable for reuse.
 */
function getBearerToken() {
    request.post(oauthOptions, function (e, r, body) {

        if (e || r.statusCode != 200) {
            console.error("Status Code: " + r.statusCode + "Error: " + e);
            return e;
        } else {
            var bod = JSON.parse(body);
            bearer = bod.access_token;
            console.log("Got a twitter Bearer token: " + bearer);
            return bearer;
        }
    });

};