const serverUtils = require("./utils/server.js");

const {rimraf} = require("rimraf");
const simpleGit = require('simple-git');
const path = require("path");
const rollup = require("./rollup.js");
const fs = require("fs/promises");
const {db,client} = require("./database.js");

const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const {logger} = require("./log/index.js");
const {expireConfig,findFileUpwards} = require("./utils/server");
const babel = require("@babel/core");
const {babel: babelPlugins} = require('./plugins')

const {checkPathExists, getRepoPath, resourcesFolderPath, TASKSTATUS} = serverUtils

const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handle = app.getRequestHandler()


const promiseAllWithConcurrency = (task = [],option = {})=>{
    const ops = Object.assign({},option,{
        limit: 3
    })
    const newTask = []
    for(let i=0;i<task.length;i+=ops.limit){
        const tmp = []
        for(let j=i;j<i+ops.limit;j++){
            task[j] && tmp.push(task[j])
        }
        newTask.push(tmp)
    }
    return newTask.reduce((acc,tmp)=>{
        return acc.then(()=>Promise.allSettled(
            tmp.map(t=>{
                return typeof t === 'function' ? t() : t
            })
        ))
    },Promise.resolve())
}

const delay = (timer= 60000)=>{
    return new Promise((resolve,reject)=>{
        try{
            setTimeout(resolve,timer)
        } catch (e){
            reject(e)
        }
    })
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
        const interruptedTask = await (this.usersCollection.find({type:'resource',status: { $in: [TASKSTATUS.INIT, TASKSTATUS.REPOCLONEDEND] }})).toArray()
        const promiseTask = interruptedTask.map(task=>{
            if(task.status === TASKSTATUS.INIT){
                return ()=>{
                    return this.cloneRepo(task).then(()=>{
                        return this.generateBundle(task) // 会执行两次，待调查,有点奇怪
                    })
                }
            }
            if(task.status === TASKSTATUS.REPOCLONEDEND){
                return ()=>{
                    return this.generateBundle(task) // 会执行两次，待调查,有点奇怪
                }
            }
        })
        return promiseAllWithConcurrency(promiseTask)
    }
    async cloneRepo(task){
        const repoPath = getRepoPath(task)
        const {owner,repo,name,_id} = task

        const isCloningTask = await this.usersCollection.find({
            owner: task.owner,
            repo: task.repo,
            name: task.name,
            key: task.key,
            type: task.type,
            status: TASKSTATUS.REPOSTARTCLONE
        }).toArray()

        if(isCloningTask.length) return Promise.reject() // 避免同一目录重复clone


        logger.info(`clone start ${repoPath}`)
        await this.usersCollection.updateOne({_id: task._id},{$set:{status: TASKSTATUS.REPOSTARTCLONE}})
        const clonedTask = await this.usersCollection.find({
            owner: task.owner,
            repo: task.repo,
            name: task.name,
            type: task.type,
            key: task.key,
            status: TASKSTATUS.REPOCLONEDEND
        }).toArray()
        if(clonedTask.length){
            logger.info(`clone done ${repoPath}`)
            return this.usersCollection.updateOne(
                {_id},
                { $set: {status: TASKSTATUS.REPOCLONEDEND} }
            )
        }
        await rimraf(repoPath)
        await simpleGit().clone(`https://github.com/${owner}/${repo}.git` + (name ? ` -b ${name}` : ''), repoPath ).then(async ()=>{
            const gitDir = path.join(repoPath, '.git')
            logger.info(`clone done ${repoPath}`)
            await this.usersCollection.updateOne(
                {_id},
                { $set: {status: TASKSTATUS.REPOCLONEDEND} }
            )
            await rimraf(gitDir)
        }).catch(async e=>{
            logger.error(`clone error ${repoPath}`,e)
            await this.usersCollection.updateOne(
                {_id},
                { $set: {status: TASKSTATUS.REPOCLONEDENDERROR} }
            )
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
    async generateBundle(user){
        const repoPath = getRepoPath(user)
        const {subPath, _id} = user

        const isCloningTask = await this.usersCollection.find({
            owner: user.owner,
            repo: user.repo,
            name: user.name,
            key: user.key,
            type: user.type,
            status: TASKSTATUS.BUNDLESTART
        }).toArray()

        if(isCloningTask.length) return Promise.reject() //

        logger.info(`bundle start ${repoPath} ${subPath}`)
        await this.usersCollection.updateOne({_id: user._id},{$set:{status: TASKSTATUS.BUNDLESTART}})

        return rollup({
            entry: path.join(repoPath, subPath),
            output: path.join(repoPath,'__bundle',`${encodeURIComponent(subPath)}.js`),
            repoPath
        }).then(async ()=>{
            logger.info(`bundle done ${repoPath} ${subPath}`)
            await this.usersCollection.updateOne(
                {_id},
                { $set: {status: TASKSTATUS.BUNDLED, bundle_expire: Date.now() + expireConfig.timestamp} }
            )
        }).catch(async e=>{
            logger.error(`bundle error ${repoPath} ${subPath}`,e)
            await this.usersCollection.updateOne(
                {_id},
                { $set: {status: TASKSTATUS.BUNDLEDERROR, bundle_expire: Date.now() + expireConfig.timestamp} }
            )
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

    logger.info('Server is starting...')

    createServer((req, res) => {
        const parsedUrl = parse(req.url, true)
        handle(req, res, parsedUrl)
    }).listen(3000, async (err) => {
        if (err) {
            await client.close()
            throw err
        }
        logger.info('> Ready on http://127.0.0.1:3000')

        const userCollection = db.collection('users')
        new BundleManager(userCollection)
    })
})
