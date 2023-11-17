const { MongoClient, ServerApiVersion } = require('mongodb');
const { createRouter } = require('next-connect');
const {parseEnv} = require("./utils/server");

const {MONGODB_URL} = parseEnv()

const client = new MongoClient(MONGODB_URL,{
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

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
