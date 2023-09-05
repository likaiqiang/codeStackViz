import {MongoClient} from "mongodb";
import {TASKSTATUS} from "@/pages/utils";
import path from "path";
import {getBundleFiles} from "@/pages/server_utils";

export default async function handler(req,res){
    if (req.method.toUpperCase() !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    const client = await MongoClient.connect('mongodb://localhost:27017')
    const db = client.db('code_view')
    const usersCollection = db.collection('users')

    const {headers} = req
    const {authorization: key} = headers
    const users = await usersCollection.find(
        {key}
    ).toArray()
    const files = users.filter(user=> user.status === TASKSTATUS.BUNDLED).map(user=>{
        const {owner,repo,name} = user
        const repoPath = Cache.getRepoPath({owner,repo,key,name})
        return path.join(Cache.resourcesFolderPath,repoPath)
    })


    // const tasks = users.map(user=>{
    //     const {status,subPath,owner,repo,name} = user
    //     const repoPath = Cache.getRepoPath({owner,repo,key,name})
    //     if(status === TASKSTATUS.BUNDLED){
    //         return fs.readFile(
    //             path.join(repoPath, '__bundle',encodeURIComponent(subPath) + '.js'),
    //             'utf-8'
    //         ).then(bundle=>{
    //             return {
    //                 ...user,
    //                 bundle
    //             }
    //         })
    //     }
    //     return Promise.resolve(user)
    // })
    return res.status(200).json({
        list: await getBundleFiles(files)
    })
}
