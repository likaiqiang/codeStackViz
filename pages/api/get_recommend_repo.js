import {createRouter, database} from '@/database.js'

import {getFilesByUsers} from "@/utils/server";

const router = createRouter().use(database)

router.get(async (req,res)=>{
    const usersCollection = req.db.collection('users')
    const recommends = await usersCollection.find({type:'recommend'}).toArray()
    const files = await getFilesByUsers(recommends, usersCollection)
    res.setHeader('Cache-Control', 'no-cache');
    return res.status(200).json({
        files
    })
})

export default router.handler({
    onError: (err, req, res) => {
        console.error(err.stack);
        res.status(err.statusCode || 500).end(err.message);
    }
})

