import path from 'path'
import fs from 'fs/promises'
import Git from 'nodegit'
import rollup from "@/rollup";

const expireConfig = {
    timestamp: 20000
}

async function checkFileExists(path) {
    try {
        await fs.access(path, fs.constants.F_OK);
        return true;
    } catch (err) {
        return false;
    }
}
async function deleteFileOrFolder(filePath) {
    const isExist = await checkFileExists(filePath)
    if(isExist){
        const stat = await fs.lstat(filePath);
        if (stat.isDirectory()) {
            const files = await fs.readdir(filePath);
            for (const file of files) {
                await deleteFileOrFolder(path.join(filePath, file));
            }
            await fs.rmdir(filePath);
        } else {
            await fs.unlink(filePath);
        }
    }
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

class Cache {
    resourcesFolderPath = path.join(__dirname,'../../resources2')
    expireFilePath = path.join(__dirname,'./expire.json')

    constructor() {
        const checkExpired = ()=>{
            this.deleteExpiredResource().then(async ()=>{
                await delay()
                checkExpired()
            })
        }
        checkExpired()
    }
    getRepoPath({owner,repo,key,name =''}){
        return path.join(this.resourcesFolderPath,`${key}-${owner}-${repo}` + name ? `-${name}` : '')
    }
    cloneRepo({owner,repo,key,name =''}){
        const repoPath = this.getRepoPath({
            owner,
            repo,
            name,
            key
        })
        return Git.Clone(`https://github.com/${owner}/${repo}.git` + name ? ` -b ${name}` : '', repoPath )
    }
    hasRepo({owner,repo,key,name =''}){
        const repoPath = this.getRepoPath({
            owner,
            repo,
            name,
            key
        })
        return checkFileExists(repoPath)
    }
    hasBundle({owner,repo,key,name ='',subPath = ''}){
        const repoPath = this.getRepoPath({
            owner,
            repo,
            name,
            key
        })
        return checkFileExists(
            path.join(repoPath,subPath)
        )
    }
    generateBundle({owner,repo,key,name ='',subPath = ''}){
        const repoPath = this.getRepoPath({
            owner,
            repo,
            name,
            key
        })
        return this.hasRepo({owner,repo,key,name}).then( async status=>{
            if(!status){
                await this.cloneRepo({owner,repo,key,name})
            }
            return rollup({
                entry: path.join(repoPath,subPath),
                output: path.join(repoPath,`./_bundle/${subPath}.js`)
            })
        })
    }
    getBundle({owner,repo,key,name ='',subPath = ''}){
        const repoPath = this.getRepoPath({
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
                await this.cloneRepo({owner,repo,key,name})
            }
            return this.hasBundle({owner,repo,key,name}).then(async (status2)=>{
                if(!status2){
                    await this.generateBundle({owner,repo,key,name,subPath})
                }
                this.updateFileExpireTime({
                    repoPath,
                    subPath
                })
                return fs.readFile(
                    path.join(repoPath,subPath)
                )
            })
        })
    }
    updateFileExpireTime({repoPath,subPath}){
        const filePath = path.join(repoPath,subPath)
        fs.readFile(
            this.expireFilePath,
            'utf-8'
        ).then(str=>{
            const jsonData = JSON.parse(str)
            jsonData[filePath] = Date.now() + expireConfig.timestamp
            jsonData[repoPath] = Date.now() + expireConfig.timestamp
            return fs.writeFile(this.expireFilePath, JSON.stringify(jsonData))
        })
    }
    deleteExpiredResource(){
        return fs.readFile(
            this.expireFilePath,
            'utf-8'
        ).then(async (str)=>{
            const expireData = JSON.parse(str)
            const files = await fs.readdir(this.resourcesFolderPath)
            for(let file of files){
                const fullPath = path.join(this.resourcesFolderPath, file)
                const stat = await fs.lstat(fullPath);
                if(stat.isDirectory()){
                    const folderName = path.basename(fullPath);
                    if(Date.now() > expireData[folderName]){
                        await deleteFileOrFolder(fullPath)
                    }
                    else {
                        const bundleFiles = await fs.readdir(path.join(fullPath,'_bundle'))
                        for(let bundle of bundleFiles){
                            const bundleFullPath = path.join(fullPath,'_bundle',bundle)
                            if(Date.now() > expireData[bundleFullPath]){
                                await deleteFileOrFolder(bundleFullPath)
                            }
                        }
                    }
                }
            }
        })
        // 深入文件夹删
    }
}

const cacheManage = new Cache()

async function handler(req,res){
    const {query,header} = req
    const {owner,repo,name,subPath} = query
    const {Authorization} = header
    return res.status(200).json(
        cacheManage.getBundle({
            owner,
            repo,
            key: Authorization,
            name,
            subPath
        })
    )
}
