import { MongoClient } from 'mongodb';
import { createRouter } from 'next-connect';

const client = new MongoClient('mongodb://localhost:27017', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

async function database(req, res, next) {
    req.dbClient = client;
    req.db = client.db('code_view');
    return next();
}

const router = createRouter();

export default router.use(database)
