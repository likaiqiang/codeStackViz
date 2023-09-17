import {getFilesByUsers, TASKSTATUS} from "@/utils/server";
import {createRouter, database} from '@/database.js'

const router = createRouter().use(database)

router.get(async (req,res)=>{
    const usersCollection = req.db.collection('users')

    const {headers} = req
    const {authorization: key} = headers

    const errorTask = await usersCollection.find(
        {key,type:'resource',status:{$in:[TASKSTATUS.BUNDLEDERROR, TASKSTATUS.REPOCLONEDENDERROR]}}
    ).toArray()
    await Promise.all(
        errorTask.map(task=>{
            return usersCollection.updateOne({_id: task._id},{$set:{status: TASKSTATUS.INIT}})
        })
    )

    const users = await usersCollection.find(
        {key,type:'resource'}
    ).toArray()

    const files = await getFilesByUsers(users,usersCollection)

    res.setHeader('Cache-Control', 'no-cache');
    // await req.dbClient.close()
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
