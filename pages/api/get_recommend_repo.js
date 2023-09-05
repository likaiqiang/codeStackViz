import path from "path";
import fs from 'fs/promises'
import {checkPathExists, getBundleFiles} from "@/pages/server_utils";

const resourcesFolderPath = path.join(process.cwd(), 'public/recommend')

export default async function handler(req, res) {
    if (req.method.toUpperCase() !== 'GET') {
        return res.status(405).json({error: 'Method not allowed'});
    }

    const files = (await fs.readdir(resourcesFolderPath)).map(file=>{
        return path.join(resourcesFolderPath,file)
    })

    return res.status(200).json({
        files: await getBundleFiles(files)
    })
}
