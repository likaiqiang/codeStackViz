import path from "path";
import {getBundleFiles, getRepoPath, resourcesFolderPath, TASKSTATUS} from "@/pages/server_utils";
import {router} from '@/database.js'

router.get(async (req,res)=>{
    const usersCollection = req.db.collection('users')

    const {headers} = req
    const {authorization: key} = headers
    const users = await usersCollection.find(
        {key}
    ).toArray()
    const bundledDir = users.filter(user=> user.status === TASKSTATUS.BUNDLED).map(user=>{
        const {owner,repo,name} = user
        return getRepoPath({owner,repo,key,name})
    })
    const interruptedList = users.filter(user=> user.status !== TASKSTATUS.BUNDLED).map(user=>{
        const {owner,repo,name,subPath,status} = user
        return [
            {
                owner,
                repo,
                name,
                subPath,
                status
            },
            {
                bundleFileName: user.subPath,
                bundleFile: null
            }
        ]
    })
    const bundledFiles = await getBundleFiles(bundledDir,usersCollection)
    // await req.dbClient.close()
    return res.status(200).json({
        files: bundledFiles.concat(interruptedList)
    })
})

export default router.handler({
    onError: (err, req, res) => {
        console.error(err.stack);
        res.status(err.statusCode || 500).end(err.message);
    }
})
