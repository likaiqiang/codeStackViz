const { MongoClient } = require('mongodb');
const { createRouter } = require('next-connect');

const url = process.env.NODE_ENV === 'development' ? 'mongodb://127.0.0.1:27017' : `mongodb://${process.env.MONGODB_USER}:${process.env.MONGODB_PASSWORD}@127.0.0.1:27017`


const client = new MongoClient(url);

const db = client.db('code_view');
async function database(req, res, next) {
    req.dbClient = client;
    req.db = db;
    return next();
}

module.exports = {
    createRouter,
    database,
    client,
    db
}
