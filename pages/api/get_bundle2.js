import path from 'path'
import fs from 'fs/promises'
import {getGlobals} from 'common-es'

const {__dirname,__filename} = getGlobals(import.meta.url)

const baseResDir = path.join(__dirname,'../../resources/output')

export default async function handler(req,res){
    if (req.method.toUpperCase() !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    const {filename} = req.query
    const bundle = await fs.readFile(path.join(baseResDir,`${filename}${path.sep}bundle.js`),'utf-8')

    res.status(200).json({bundle})
}


