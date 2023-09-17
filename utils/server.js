const fs = require("fs/promises");
const fs2 = require('fs')
const path = require("path");
const {parse} = require('envfile')

const TASKSTATUS = {
    INIT: 0,
    REPOCLONEDEND: 1,
    BUNDLED:2,
    REPOCLONEDENDERROR: 3,
    BUNDLEDERROR: 4
}

async function checkPathExists(path) {
    try {
        await fs.access(path, fs.constants.F_OK);
        return true;
    } catch (err) {
        return false;
    }
}

const getFilesByUsers = async (files, usersCollection)=>{

    const taskObj = files.reduce((acc,user)=>{
        const repoPath = getRepoPathWithoutSubPath(user)

        acc[repoPath] = (acc[repoPath] || []).concat(
            {
                bundleFilePromise: user.status === TASKSTATUS.BUNDLED ? (
                    usersCollection.findOne(
                        {_id: user._id}
                    ).then(task=> task.bundled)
                ) : null,
                bundleFileName: user.subPath,
                status: user.status,
                taskId: user._id,
                key: user.key
            }
        )
        return acc
    },{})
    return await Promise.all(
        Object.entries(taskObj).map(async ([repoPathStr, bundled]) => {
            const [_,owner, repo, name = ''] = repoPathStr.split('@')
            const key = bundled[0].key
            return [{
                key,
                owner,
                repo,
                name
            }, await Promise.all(
                bundled.map(async ({bundleFileName, bundleFilePromise,status,taskId}) => {
                    const bundleFile = status === TASKSTATUS.BUNDLED ? await bundleFilePromise : null
                    if(key !== 1 && usersCollection){
                        await usersCollection.updateOne(
                            {_id: taskId},
                            {$set: {bundle_expire: Date.now() + expireConfig.timestamp, repo_expire: Date.now() + expireConfig.timestamp}}
                        )
                    }
                    return {
                        bundleFileName,
                        bundleFile,
                        status
                    }
                })
            )]
        })
    )
}

const getRepoPathWithoutSubPath = ({owner,repo,key,name ='',type,subPath})=>{
    const resourcespath = process.env.RESOURCES_PATH || parseEnv().RESOURCES_PATH

    const folderPath = path.join(resourcespath,type === 'resource' ? 'resources' :'recommend')

    return path.join(folderPath,`${key}@${encodeURIComponent(owner)}@${encodeURIComponent(repo)}` + (!!name ? `@${encodeURIComponent(name)}` : ''))
}


const getRepoPath = ({owner,repo,key,name ='',type,subPath})=>{
    const resourcespath = process.env.RESOURCES_PATH || parseEnv().RESOURCES_PATH

    const folderPath = path.join(resourcespath,type === 'resource' ? 'resources' :'recommend')

    return path.join(folderPath,`${key}@${encodeURIComponent(owner)}@${encodeURIComponent(repo)}` + (!!name ? `@${encodeURIComponent(name)}` : '') + `@${encodeURIComponent(subPath)}`)
}

function findFileUpwards({fileName = 'tsconfig.json',startFilePath, rootDir}) {
    let currentDir = path.dirname(startFilePath)
    rootDir = rootDir ? path.join(rootDir,'..') : path.parse(currentDir).root

    while (currentDir !== rootDir) {
        const packageJsonPath = path.join(currentDir, fileName);
        if (fs2.existsSync(packageJsonPath)) {
            return currentDir
        }
        currentDir = path.join(currentDir, '..');
    }
    return null;
}

const expireConfig = {
    timestamp: 20000
}
const parseEnv = ()=>{
    return parse(
        fs2.readFileSync(
            path.join(process.cwd(),`.env.${process.env.NODE_ENV || 'development'}`),
            'utf-8'
        )
    )
}

module.exports = {
    getRepoPathWithoutSubPath,
    getRepoPath,
    getFilesByUsers,
    checkPathExists,
    TASKSTATUS,
    expireConfig,
    findFileUpwards,
    parseEnv
}
