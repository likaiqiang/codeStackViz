import {TASKSTATUS} from "@/utils/server";
import {createRouter, database} from '@/database.js'

const router = createRouter().use(database)

router.post(async (req,res)=>{
    const {body,headers} = req

    const {owner,repo,name,subPath} = typeof body === 'string' ? JSON.parse(body) : body
    const {authorization:key} = headers

    const usersCollection = req.db.collection('users')

    if(await usersCollection.findOne({key,owner,repo,name,subPath})){
        return res.status(200).end()
    } // filter duplicate requests
    await usersCollection.insertOne({key,owner,repo,name,subPath, status: TASKSTATUS.INIT, type:'resource'})

    return res.status(200).end()
})
export default router.handler({
    onError: (err, req, res) => {
        console.error(err.stack);
        res.status(err.statusCode || 500).end(err.message);
    }
})
