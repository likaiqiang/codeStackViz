const { MongoClient } = require('mongodb');
const { createRouter } = require('next-connect');

const client = new MongoClient('mongodb://127.0.0.1:27017');

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
