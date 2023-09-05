import path from "path";
import fs from 'fs/promises'
import {checkPathExists} from "@/pages/server_utils";

const resourcesFolderPath = path.join(process.cwd(), 'public/recommend')

export default async function handler(req, res) {
    if (req.method.toUpperCase() !== 'GET') {
        return res.status(405).json({error: 'Method not allowed'});
    }
    const bundleTasks = {}
    const files = await fs.readdir(resourcesFolderPath)
    for (let file of files) {
        const stat = await fs.stat(path.join(resourcesFolderPath, file))
        if (stat.isDirectory() && await checkPathExists(path.join(resourcesFolderPath, file, '__bundle'))) {
            const bundleDirPath = path.join(resourcesFolderPath, file, '__bundle')
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

    const bundleFiles = await Promise.all(
        Object.entries(bundleTasks).map(async ([repoPathStr, bundled]) => {
            const [owner, repo, name = ''] = repoPathStr.split('@')

            return [{
                owner,
                repo,
                name
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


    return res.status(200).json({
        files: bundleFiles
    })
}
