const serverUtils = require("./pages/server_utils.js");

const {rimraf} = require("rimraf");
const Git = require("nodegit");
const path = require("path");
const rollup = require("./rollup.js");
const fs = require("fs/promises");
const {db,client} = require("./database.js");

const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const {logger} = require("./log/index.js");

const {checkPathExists, getRepoPath, resourcesFolderPath, TASKSTATUS} = serverUtils

const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handle = app.getRequestHandler()

const delay = (timer= 300000)=>{
    return new Promise((resolve,reject)=>{
        try{
            setTimeout(resolve,timer)
        } catch (e){
            reject(e)
        }
    })
}


const expireConfig = {
    timestamp: 20000
}

class BundleManager {
    usersCollection
    constructor(usersCollection) {
        this.usersCollection = usersCollection
        // const checkExpired = ()=>{
        //     this.deleteExpiredResource().then(async ()=>{
        //         await delay()
        //         checkExpired()
        //     })
        // }
        const checkInterruptedTask = ()=>{
            logger.info('start checkInterruptedTask')
            this.checkTask().then(async ()=>{
                logger.info('finish checkInterruptedTask')
                await delay()
                checkInterruptedTask()
            })
        }
        checkInterruptedTask()
        // checkExpired()
        // this.checkTask()
    }
    async checkTask(){
        const interruptedTask = await (this.usersCollection.find({status: { $ne: TASKSTATUS.BUNDLED }})).toArray()
        for(let task of interruptedTask){
            if(task.status === TASKSTATUS.INIT){
                await this.cloneRepo(task).then(()=>{
                    return this.generateBundle(task)
                })
            }
            if(task.status === TASKSTATUS.REPOCLONEDONE){
                await this.generateBundle(task)
            }
        }
    }
    async cloneRepo({owner,repo,key,name ='',subPath=''}){
        const repoPath = getRepoPath({
            owner,
            repo,
            name,
            key
        })
        this.usersCollection.insertOne({
            owner,
            repo,
            name,
            key,
            subPath,
            status:TASKSTATUS.INIT
        })
        await rimraf(repoPath)
        return Git.Clone(`https://github.com/${owner}/${repo}.git` + (name ? ` -b ${name}` : ''), repoPath ).then(()=>{
            const gitDir = path.join(repoPath, '.git')
            logger.info(`clone done ${repoPath}`)
            this.usersCollection.updateOne(
                {owner,repo,name,key,subPath},
                { $set: {status: TASKSTATUS.REPOCLONEDONE} }
            )
            return rimraf(gitDir)
        })
    }
    hasRepo({owner,repo,key,name =''}){
        const repoPath = getRepoPath({
            owner,
            repo,
            name,
            key
        })
        return checkPathExists(repoPath)
    }
    hasBundle({owner,repo,key,name ='',subPath = ''}){
        const repoPath = getRepoPath({
            owner,
            repo,
            name,
            key
        })
        return checkPathExists(
            path.join(repoPath,`./__bundle/${encodeURIComponent(subPath)}.js`)
        )
    }
    generateBundle({owner,repo,key,name ='',subPath = ''}){
        const repoPath = getRepoPath({
            owner,
            repo,
            name,
            key
        })
        return this.hasRepo({owner,repo,key,name}).then( async status=>{
            if(!status){
                await this.cloneRepo({owner,repo,key,name,subPath})
            }
            return rollup({
                entry: path.join(repoPath,subPath),
                output: path.join(repoPath,`./__bundle/${encodeURIComponent(subPath)}.js`),
                repoPath
            }).then(()=>{
                logger.info(`bundle done ${repoPath} ${subPath}`)
                return this.usersCollection.updateOne(
                    {owner,repo,name,key,subPath},
                    { $set: {status: TASKSTATUS.BUNDLED, bundle_expire: Date.now() + expireConfig.timestamp} }
                )
            })
        })
    }
    getBundle({owner,repo,key,name ='',subPath = ''}){
        const repoPath = getRepoPath({
            owner,
            repo,
            name,
            key
        })
        return this.hasRepo({
            owner,
            repo,
            key,
            name
        }).then(async status=>{
            if(!status){
                await this.cloneRepo({owner,repo,key,name,subPath})
            }
            return this.hasBundle({owner,repo,key,name,subPath}).then(async (status2)=>{
                if(!status2){
                    await this.generateBundle({owner,repo,key,name,subPath})
                }

                await this.usersCollection.updateOne(
                    {owner,repo,key,name,subPath},
                    { $set:{bundle_expire: Date.now() + expireConfig.timestamp, repo_expire: Date.now() + expireConfig.timestamp} }
                )
                return fs.readFile(
                    path.join(repoPath,`./__bundle/${encodeURIComponent(subPath)}.js`)
                )
            })
        })
    }
    async deleteExpiredResource(){
        const files = await fs.readdir(resourcesFolderPath)
        for(let file of files){
            const fullPath = path.join(resourcesFolderPath, file)
            const stat = await fs.lstat(fullPath);
            if(stat.isDirectory()){
                const [key,owner,repo,name=''] = file.split('@')
                const repos_expire = await this.usersCollection.find(
                    {key,owner,repo,name},
                    {repo_expire: 1}
                )
                const repo_expire = Math.max(...repos_expire)
                if(Date.now() > repo_expire) {
                    await rimraf(fullPath)
                    await this.usersCollection.deleteMany({
                        key,
                        owner,
                        repo,
                        name
                    })
                }
                else{
                    const bundlePath = path.join(fullPath,'__bundle')
                    if( await checkPathExists(bundlePath)){
                        const bundleFiles = await fs.readdir(bundlePath)
                        for(let bundle of bundleFiles){
                            const bundleFullPath = path.join(fullPath,'__bundle',bundle)

                            const bundle_expire = await this.usersCollection.findOne(
                                {key,owner,repo,name,subPath: decodeURIComponent(bundle)},
                                {bundle_expire: 1}
                            )
                            if(Date.now() > bundle_expire){
                                await this.usersCollection.deleteMany({
                                    key,
                                    owner,
                                    repo,
                                    name,
                                    subPath: decodeURIComponent(bundle)
                                })
                                await rimraf(bundleFullPath)
                            }
                        }
                    }
                }
            }
        }

    }
}


app.prepare().then(() => {
    // 在这里添加你的初始化代码

    const userCollection = db.collection('users')
    new BundleManager(userCollection)

    logger.info('Server is starting...')

    createServer((req, res) => {
        const parsedUrl = parse(req.url, true)
        handle(req, res, parsedUrl)
    }).listen(3000, async (err) => {
        if (err) {
            await client.close()
            throw err
        }
        logger.info('> Ready on http://localhost:3000')
    })
})
