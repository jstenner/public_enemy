/**
 * Created by jstenner on 7/18/16.
 */

var nconf = require('nconf');

function getOptionsFromConfigFile () {
    nconf.env(['USER'])
        .file('options', {file: __dirname + '/config.local.json'}); // change this to '/config.json' for deployment

    var options = {};

    var user = nconf.get('USER');
    if (user) options.user = user;

    options.TOUCHRELOAD = nconf.get('TOUCHRELOAD');
    options.HOST = nconf.get('HOST');
    options.PORT = nconf.get('PORT');
    options.MONGOUSER = nconf.get('MONGOUSER');
    options.MONGOPASS = nconf.get('MONGOPASS');
    options.MONGOHOST = nconf.get('MONGOHOST');
    options.MONGOPORT = nconf.get('MONGOPORT');
    options.MONGODB = nconf.get('MONGODB');
    options.PETWITTER_CONSUMER_KEY = nconf.get('PETWITTER_CONSUMER_KEY');
    options.PETWITTER_CONSUMER_SECRET = nconf.get('PETWITTER_CONSUMER_SECRET');
    options.PETWITTER_ACCESS_TOKEN_KEY = nconf.get('PETWITTER_ACCESS_TOKEN_KEY');
    options.PETWITTER_ACCESS_TOKEN_SECRET = nconf.get('PETWITTER_ACCESS_TOKEN_SECRET');
    options.PETWITTER_BEARER_TOKEN = nconf.get('PETWITTER_BEARER_TOKEN');

    return options;
}

module.exports = {DEFAULTS:getOptionsFromConfigFile ()};
