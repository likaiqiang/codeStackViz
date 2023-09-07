const fs = require("fs/promises");
const path = require("path");

const TASKSTATUS = {
    INIT: 0,
    REPOCLONEDONE: 1,
    BUNDLED:2
}

async function checkPathExists(path) {
    try {
        await fs.access(path, fs.constants.F_OK);
        return true;
    } catch (err) {
        return false;
    }
}

const getBundleFiles = async (files)=>{
    const bundleTasks = {}
    for (let file of files) {
        const stat = await fs.stat(path.join(file))
        if (stat.isDirectory() && await checkPathExists(path.join(file, '__bundle'))) {
            const bundleDirPath = path.join(file, '__bundle')
            const bundleFiles = await fs.readdir(bundleDirPath)
            for (let bundleFile of bundleFiles) {
                if ((await fs.stat(path.join(bundleDirPath, bundleFile))).isFile()) {
                    const repoPathStr = path.parse(path.join(bundleDirPath, '..')).name
                    const subPath = decodeURIComponent(path.parse(bundleFile).name)
                    bundleTasks[repoPathStr] = (bundleTasks[repoPathStr] || []).concat(
                        {
                            bundleFilePromise: fs.readFile(
                                path.join(bundleDirPath, bundleFile),
                                'utf-8'
                            ),
                            bundleFileName: subPath
                        }
                    )
                }
            }
        }
    }

    return await Promise.all(
        Object.entries(bundleTasks).map(async ([repoPathStr, bundled]) => {
            const [owner, repo, name = ''] = repoPathStr.split('@')

            return [{
                owner,
                repo,
                name,
                status: TASKSTATUS.BUNDLED
            }, await Promise.all(
                bundled.map(async ({bundleFileName, bundleFilePromise}) => {
                    return {
                        bundleFileName,
                        bundleFile: await bundleFilePromise
                    }
                })
            )]
        })
    )
}
const resourcesFolderPath = path.join(process.cwd(),'public/resources')

const getRepoPath = ({owner,repo,key,name =''})=>{
    return path.join(resourcesFolderPath,`${key}@${encodeURIComponent(owner)}@${encodeURIComponent(repo)}` + (name ? `@${encodeURIComponent(name)}` : ''))
}

module.exports = {
    getRepoPath,
    resourcesFolderPath,
    getBundleFiles,
    checkPathExists,
    TASKSTATUS
}
