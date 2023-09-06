import path from "path";
import {getBundleFiles, TASKSTATUS} from "@/pages/server_utils";
import router from '@/database.mjs'

router.get(async (req,res)=>{
    const usersCollection = req.db.collection('users')

    const {headers} = req
    const {authorization: key} = headers
    const users = await usersCollection.find(
        {key}
    ).toArray()
    const bundledDir = users.filter(user=> user.status === TASKSTATUS.BUNDLED).map(user=>{
        const {owner,repo,name} = user
        const repoPath = Cache.getRepoPath({owner,repo,key,name})
        return path.join(Cache.resourcesFolderPath,repoPath)
    })
    const repoClonedList = users.filter(user=> user.status === TASKSTATUS.REPOCLONEDONE).map(user=>{
        const {owner,repo,name,subPath} = user
        return [
            {
                owner,
                repo,
                name
            },
            {
                bundleFileName: subPath,
                bundleFile: null
            }
        ]
    })
    const bundledFiles = await getBundleFiles(bundledDir)
    await req.dbClient.close()
    return res.status(200).json({
        files: bundledFiles.concat(repoClonedList)
    })
})

export default router.handler({
    onError: (err, req, res) => {
        console.error(err.stack);
        res.status(err.statusCode || 500).end(err.message);
    }
})
