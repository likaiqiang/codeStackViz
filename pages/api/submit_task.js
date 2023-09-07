import {TASKSTATUS} from "@/pages/server_utils";
import {router} from '@/database.js'

router.get(async (req,res)=>{
    const {query,headers} = req
    const {owner,repo,name,subPath} = query
    const {authorization:key} = headers

    const usersCollection = req.db.collection('users')

    if(await usersCollection.findOne({key,owner,repo,name,subPath})){
        return res.status(200)
    } // filter duplicate requests
    await usersCollection.insertOne({key,owner,repo,name,subPath, status: TASKSTATUS.INIT})
    // const bundleManager = new BundleManager(usersCollection)
    //
    // bundleManager.getBundle({
    //     owner,
    //     repo,
    //     key,
    //     name,
    //     subPath
    // }).then(()=>{
    //     return req.dbClient.close()
    // })
    return res.status(200)
})
export default router.handler({
    onError: (err, req, res) => {
        console.error(err.stack);
        res.status(err.statusCode || 500).end(err.message);
    }
})
