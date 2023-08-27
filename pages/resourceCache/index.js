import path from 'path'
import fs from 'fs/promises'
import {getGlobals} from 'common-es'
import Git from 'nodegit'

const rollup = require('../../rollup')

const {__dirname,__filename} = getGlobals(import.meta.url)

async function checkFileExists(file) {
    try {
        await fs.access(file, fs.constants.F_OK);
        return true;
    } catch (err) {
        return false;
    }
}

function parseGitHubUrl(url) {
    const re = /https:\/\/github.com\/([^\/]+)\/([^\/]+)\/(tree|releases)\/(.+)/;
    const match = url.match(re);
    if (match) {
        const owner = match[1];
        const repo = match[2];
        const type = match[3] === 'tree' ? 'branch' : 'tag';
        const name = match[4];
        return `${owner}/${repo}${name ? `@${name}` : ''}`;
    } else {
        return null;
    }
}

const config = {
    expireTime: 20000
}

class Cache {
    constructor() {
        this.resourcesFolderPath = path.join(__dirname,'../../resources2')
        this.resMonitorMap = new Map()
    }
    set(key,repo,filePath){

    }
    getBundle(key,repo,filePath){
        this.hasBundle(key,repo,filePath).then(status=>{
            if(!status) return this.generateBundle(key,repo,filePath)
            return fs.readFile(`${key}${path.sep}${repo}__op${path.sep}${filePath}.js`)
        })
    }
    hasBundle(key,repo,filePath){
        return checkFileExists(`${key}${path.sep}${repo}__op${path.sep}${filePath}.js`)
    }
    hasRepo(key,repo){
        return checkFileExists(`${key}${path.sep}${repo}`)
    }
    generateBundle(key,repo,filePath){
        this.hasRepo(key,repo).then((status)=>{
            if(!status){
                this.resMonitorMap.add(`${key}-${repo}`,config.expireTime)
                return Git.Clone(repo, parseGitHubUrl(filePath)).then(()=>{
                    // bundle file
                    return rollup({
                        entry: ''
                    })
                })
            }
            else {
                // generate bundle file

                return rollup({
                    entry: ''
                })
            }
        })
    }
}
