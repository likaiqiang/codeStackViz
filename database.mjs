import { MongoClient } from 'mongodb';
import { createRouter } from 'next-connect';

const client = new MongoClient('mongodb://localhost:27017');

const db = client.db('code_view');
async function database(req, res, next) {
    req.dbClient = client;
    req.db = db;
    return next();
}

const router = createRouter();

export default router.use(database)
