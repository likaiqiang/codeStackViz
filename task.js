const {logger} = require("./log");
const {rimraf} = require("rimraf");
const simpleGit = require("simple-git");
const path = require("path");
const rollup = require("./rollup");
const {expireConfig, TASKSTATUS, getRepoPath} = require("./utils/server");
const {db} = require("./database");

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
    type
    constructor(usersCollection,type) {
        this.usersCollection = usersCollection
        this.type = type || 'resource'
    }
    checkInterruptedTask(){
        logger.info('start checkInterruptedTask')
        this.checkTask().then(async ()=>{
            logger.info('finish checkInterruptedTask')
            await delay()
            this.checkInterruptedTask()
        })
    }
    async checkTask(){
        const interruptedTask = await (this.usersCollection.find({type: this.type,status: { $in: [TASKSTATUS.INIT] }})).toArray()
        const promiseTask = interruptedTask.map(task=>{
            return ()=>{
                return this.cloneRepo(task).then(()=>{
                    return this.generateBundle(task)
                })
            }
        })
        return promiseAllWithConcurrency(promiseTask)
    }
    async cloneRepo(task){
        const repoPath = getRepoPath(task)
        const {owner,repo,name,_id} = task

        logger.info(`clone start ${repoPath}`)

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
            await this.usersCollection.updateOne(
                {_id},
                { $set: {status: TASKSTATUS.REPOCLONEDENDERROR} }
            )
            logger.error(`clone error ${repoPath}`,e)
            return Promise.reject(e)
        })
    }
    async generateBundle(user){
        const repoPath = getRepoPath(user)
        const {subPath, _id} = user

        logger.info(`bundle start ${repoPath} ${subPath}`)

        return rollup({
            entry: path.join(repoPath, subPath),
            output: path.join(repoPath,'__bundle',`${encodeURIComponent(subPath)}.js`),
            repoPath
        }).then(async (code)=>{
            logger.info(`bundle done ${repoPath} ${subPath}`)
            await this.usersCollection.updateOne(
                {_id},
                { $set: {status: TASKSTATUS.BUNDLED, bundle_expire: Date.now() + expireConfig.timestamp, bundled: code} }
            )
            await rimraf(repoPath)
        }).catch(async e=>{
            await this.usersCollection.updateOne(
                {_id},
                { $set: {status: TASKSTATUS.BUNDLEDERROR} }
            )
            logger.error(`bundle error ${repoPath} ${subPath}`,e)
            return Promise.reject(e)
        })
    }
}

module.exports = {
    BundleManager
}
