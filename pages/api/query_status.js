import {getBundleFiles, getRepoPath, resourcesFolderPath, TASKSTATUS} from "@/pages/server_utils";
import {router} from '@/database.js'
import fs from "fs/promises";
import path from "path";

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

    const interruptedListObj = users.filter(user=> user.status !== TASKSTATUS.BUNDLED).reduce((acc,user)=>{
        const repoPathStr = getRepoPath(user)
        acc[repoPathStr] = (acc[repoPathStr] || []).concat(
            {
                bundleFilePromise: null,
                bundleFileName: user.subPath,
                user
            }
        )
        return acc
    },{})
    const interruptedList = Object.entries(interruptedListObj).map(([repoPathStr, bundled])=>{
        const {user} = bundled[0]
        return [
            {
                key: user.key,
                owner: user.owner,
                repo: user.repo,
                name: user.name,
            },
            bundled.map(bun=>{
                return {bundleFileName: bun.bundleFileName, bundleFile: null, status: bun.user.status}
            })
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
