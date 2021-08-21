/**
 * Created by jstenner on 6/28/16.
 */
var winston = require('winston');
winston.emitErrs = true;

var log = {
    'logger' : {
        'levels': {
            'detail': 6,
            'trace': 5,
            'debug': 4,
            'enter': 3,
            'info': 2,
            'warn': 1,
            'error': 0
        },
        'colors': {
            'detail': 'grey',
            'trace': 'white',
            'debug': 'blue',
            'enter': 'inverse',
            'info': 'green',
            'warn': 'yellow',
            'error': 'red'
        },
    }
};

var logger = new (winston.Logger)({
    transports: [
        new winston.transports.File({
            level: 'info',
            filename: __dirname + '/log/pe-log.log',
            handleExceptions: true,
            json: true,
            maxsize: 5242880, //5MB
            maxFiles: 5,
            colorize: false
        }),
        new winston.transports.Console({
            level: 'debug',
            handleExceptions: true,
            json: false,
            colorize: true
        })
    ],
    exitOnError: false
});

winston.addColors(log.logger.colors);
logger.setLevels(log.logger.levels);
logger.info('Logs are being captured 2 ways - console and file');

module.exports = logger;

// This is used to override Express/Morgan (would need to install) to log req/res calls.
module.exports.stream = {
    write: function(message, encoding){
        logger.info(message);
        //winston.info(message.slice(0, -1)); // to remove extra line break if wanted
    }
};