import {getFilesByUsers, TASKSTATUS} from "@/utils/server";
import {router} from '@/database.js'
router.get(async (req,res)=>{
    const usersCollection = req.db.collection('users')

    const {headers} = req
    const {authorization: key} = headers

    const errorTask = await usersCollection.find(
        {key,type:'resource',status:{$in:[TASKSTATUS.BUNDLEDERROR, TASKSTATUS.REPOCLONEDENDERROR]}}
    ).toArray()
    await Promise.all(
        errorTask.map(task=>{
            if(task.status === TASKSTATUS.REPOCLONEDENDERROR){
                return usersCollection.updateOne({id: task.id},{$set:{status: TASKSTATUS.INIT}})
            }
            if(task.status === TASKSTATUS.BUNDLEDERROR){
                return usersCollection.updateOne({id: task.id},{$set: {status: TASKSTATUS.REPOCLONEDEND}})
            }
        })
    )

    const users = await usersCollection.find(
        {key,type:'resource'}
    ).toArray()

    const files = await getFilesByUsers(users,usersCollection)

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
