const express = require('express');
const morgan = require('morgan');
const http = require('http');
const mongo = require('mongodb').MongoClient;
const winston = require('winston');

// Logging components

winston.emitErrs = true;

let logger = new winston.Logger({
    transports: [
        new winston.transports.Console({
            timestamp: true,
            level: 'debug',
            handleExceptions: true,
            json: false,
            colorize: true
        })
    ],
    exitOnError: false
});

logger.stream = {
    write: function (message, encoding) {
        logger.debug(message.replace(/\n$/, ''));
    }
};

// Express and middlewares components

let app = express();
app.use(
    // Log incoming requests
    morgan(':method :url :status :response-time ms - :res[content-length]', {
        stream: logger.stream
    })
);

let db;

const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/jupiter-orders';

if (MONGO_URL) {
    mongo.connect(MONGO_URL, null, function (err, db_) {
        if (err) {
            logger.error(err);
        } else {
            db = db_;
        }
    });
}

app.use(function (req, res, next) {
    if (!db) {
        // When there's no database connection
        mongo.connect(MONGO_URL, null, function (err, db_) {
            if (err) {
                logger.error(err);
                res.sendStatus(500);
            } else {
                db = db_;
                next();
            }
        });
    } else {
        next();
    }
});

// Order resource endpoint

app.get('/orders', function (req, res, next) {
    let collection = db.collection('orders');
    collection.find().toArray(function (err, result) {
        if (err) {
            logger.error(err);
            res.sendStatus(500);
            return;
        }
        res.json(result);
    });
});

const port = process.env.PORT || 3001;

http.createServer(app).listen(port, function (err) {
    if (err) {
        logger.error(err);
    } else {
        logger.info('Listening on http://localhost: ' + port);
    }
});
