import path from 'path'
import fs from 'fs/promises'
import Git from 'nodegit'
import rollup from "@/rollup";
import {rimraf} from 'rimraf'
import {MongoClient} from 'mongodb'
import {TASKSTATUS,checkPathExists} from "@/pages/server_utils";


const expireConfig = {
    timestamp: 20000
}

const delay = (timer=1000)=>{
    return new Promise((resolve,reject)=>{
        try{
            setTimeout(resolve,timer)
        } catch (e){
            reject(e)
        }
    })
}

export class Cache {
    db
    usersCollection
    static resourcesFolderPath = path.join(process.cwd(),'public/resources')
    static getRepoPath({owner,repo,key,name =''}){
        return path.join(Cache.resourcesFolderPath,`${key}@${encodeURIComponent(owner)}@${encodeURIComponent(repo)}` + (name ? `@${encodeURIComponent(name)}` : ''))
    }
    constructor(db) {
        this.db = db
        this.usersCollection = db.collection('users')
        const checkExpired = ()=>{
            this.deleteExpiredResource().then(async ()=>{
                await delay()
                checkExpired()
            })
        }
        // checkExpired()
    }
    async cloneRepo({owner,repo,key,name ='',subPath=''}){
        const repoPath = Cache.getRepoPath({
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
        return Git.Clone(`https://github.com/${owner}/${repo}.git` + (name ? ` -b ${name}` : ''), repoPath ).then(()=>{
            const gitDir = path.join(repoPath, '.git')
            this.db.updateOne(
                {owner,repo,name,key,subPath},
                { $set: {status: TASKSTATUS.REPOCLONEDONE} }
            )
            return rimraf(gitDir)
        })
    }
    hasRepo({owner,repo,key,name =''}){
        const repoPath = Cache.getRepoPath({
            owner,
            repo,
            name,
            key
        })
        return checkPathExists(repoPath)
    }
    hasBundle({owner,repo,key,name ='',subPath = ''}){
        const repoPath = Cache.getRepoPath({
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
        const repoPath = Cache.getRepoPath({
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
                this.db.updateOne(
                    {owner,repo,name,key,subPath},
                    { $set: {status: TASKSTATUS.BUNDLED, bundle_expire: Date.now() + expireConfig.timestamp} }
                )
            })
        })
    }
    getBundle({owner,repo,key,name ='',subPath = ''}){
        const repoPath = Cache.getRepoPath({
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

                this.usersCollection.updateOne(
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
        const files = await fs.readdir(Cache.resourcesFolderPath)
        for(let file of files){
            const fullPath = path.join(Cache.resourcesFolderPath, file)
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


export default async function handler(req,res){
    if (req.method.toUpperCase() !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    const {query,headers} = req
    const {owner,repo,name,subPath} = query
    const {authorization:key} = headers

    const client = await MongoClient.connect('mongodb://localhost:27017')
    const db = client.db('code_view')
    const usersCollection = db.collection('users')
    if(await usersCollection.findOne({key,owner,repo,name,subPath})){
        return res.status(200)
    } // filter duplicate requests


    const cacheManage = new Cache(db)
    cacheManage.getBundle({
        owner,
        repo,
        key,
        name,
        subPath
    }).then(()=>{
        return client.close()
    })
    // const bundle = await cacheManage.getBundle({
    //     owner:'babel',
    //     repo: 'babel',
    //     name:'',
    //     subPath:'packages/babel-generator/src/index.ts',
    //     keyL:authorization
    // })

//     const bundle = `
//     class Generator extends Printer {
//   constructor(ast, opts = {}, code) {
//     const format = normalizeOptions(code, opts);
//     const map = opts.sourceMaps ? new SourceMap(opts, code) : null;
//     super(format, map);
//     this.ast = ast;
//   }
//   ast;
//
//   /**
//    * Generate code and sourcemap from ast.
//    *
//    * Appends comments that weren't attached to any node to the end of the generated output.
//    */
//
//   generate() {
//     return super.generate(this.ast);
//   }
// }
//
// /**
//  * Turns an AST into code, maintaining sourcemaps, user preferences, and valid output.
//  * @param ast - the abstract syntax tree from which to generate output code.
//  * @param opts - used for specifying options for code generation.
//  * @param code - the original source code, used for source maps.
//  * @returns - an object containing the output code and source map.
//  */
// function generate(ast, opts, code) {
//   const gen = new Generator(ast, opts, code);
//   return gen.generate();
// }
//
// export { generate as default };
//
//
//     `
    return res.status(200)
}
