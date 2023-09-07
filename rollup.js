const resolve = require('@rollup/plugin-node-resolve'); // 用于解析 node_modules 中的模块
const json = require('@rollup/plugin-json') ;
const commonjs = require('@rollup/plugin-commonjs')
const {rollup} = require('rollup');
const path = require('path')
const external = require("@yelo/rollup-node-external");
const fs = require("fs");
const babel = require("@rollup/plugin-babel");
const babelCore = require('@babel/core')
const typescript = require('@rollup/plugin-typescript')
const {minimatch} = require('minimatch');
const Hjson = require('hjson')
const ts = require('typescript');
// const { convertLogLevel, createHandler, createLogger, LogLevel } = require("typescript-paths")
// const ts = require('typescript')
// const webpack = require('webpack');



// const transformTypescriptPlugin = ()=>{
//     return {
//         name:'transformTypescriptPlugin',
//         transform(code,id){
//             if (!/\.tsx?$/.test(id)) return null;
//             const result = babelCore.transformFileSync(id, {
//                 plugins:[
//                     ["@babel/plugin-transform-typescript",{allowDeclareFields: true}]
//                 ]
//             })
//             return {
//                 code: result.code,
//                 map: result.map
//             }
//         }
//     }
// }


// function transformDir(srcDir, outDir) {
//     // 遍历目录中的所有文件和子目录
//     fs.readdirSync(srcDir).forEach(item => {
//         // 获取文件或子目录的完整路径
//         const srcPath = path.join(srcDir, item);
//         // 获取输出文件或子目录的完整路径
//         const parsed = path.parse(item);
//         // 构造新的文件名
//         const newFilename = `${parsed.name}.js`;
//         // 获取输出文件或子目录的完整路径
//         const outPath = path.join(outDir, newFilename);
//         // 检查是否为子目录
//         if (fs.statSync(srcPath).isDirectory()) {
//             // 如果是子目录，则递归处理
//             transformDir(srcPath, path.join(outDir,item));
//         } else {
//             const ext = path.extname(srcPath)
//             if (ext === '.js' || ext === '.ts'){
//                 const result = babel.transformFileSync(srcPath, {
//                     plugins:[
//                         ["@babel/plugin-transform-typescript",{allowDeclareFields: true}]
//                     ]
//                 });
//                 // 确保输出目录存在
//                 fs.mkdirSync(outDir, { recursive: true });
//                 // 将转换结果写入输出文件
//                 fs.writeFileSync(outPath, result.code);
//             }
//         }
//     });
// }

function findFileUpwards({fileName = 'tsconfig.json',startFilePath, rootDir}) {
    let currentDir = path.dirname(startFilePath)
    rootDir = rootDir ? path.join(rootDir,'..') : path.parse(currentDir).root

    while (currentDir !== rootDir) {
        const packageJsonPath = path.join(currentDir, fileName);
        if (fs.existsSync(packageJsonPath)) {
            return currentDir
        }
        currentDir = path.join(currentDir, '..');
    }
    return null;
}

function getmatchedAlias(path,aliases){
    for(let alias of Object.keys(aliases)){
        const reg = new RegExp(`^${alias.replace(/\*/g, '.*')}`)
        if(reg.test(path)) return aliases[alias]
    }
    return null
}


const rollupBuild = ({entry,output,repoPath})=>{

    const tsConfigPathDir = findFileUpwards({
        fileName: 'tsconfig.json',
        startFilePath: entry,
        rootDir: repoPath
    })

    let buildDir = findFileUpwards({
        fileName: 'package.json',
        startFilePath: entry,
        rootDir: repoPath
    })

    if(buildDir && !buildDir.endsWith(path.sep)) buildDir+=path.sep

    let tsConfig = {},
        parsedConfig = {},
        finalBaseUrl = buildDir || '.',
        finalInclude = ['{,**/}*.(cjs|mjs|js|jsx)'],
        finalExclude = ['node_modules/**',`${repoPath}/__bundle/**`]

    if(tsConfigPathDir){
        tsConfig = ts.readConfigFile(path.join(tsConfigPathDir,'tsconfig.json'), ts.sys.readFile);
        parsedConfig = ts.parseJsonConfigFileContent(tsConfig.config, ts.sys, tsConfigPathDir);
        const {baseUrl = '.'} = parsedConfig.options || {}
        finalBaseUrl = path.join(
            tsConfigPathDir,
            baseUrl
        )

        const include = Array.isArray(tsConfig.config.include) ? tsConfig.config.include : [tsConfig.config.include].filter(t=>!!t)
        const exclude = Array.isArray(tsConfig.config.exclude) ? tsConfig.config.exclude : [tsConfig.config.exclude].filter(t=>!!t)
        finalInclude = include.map(pah=>{
            return path.join(tsConfigPathDir, pah)
        }).filter(pah=>{
            let pattern = path.sep.replace(/\\/g, '\\\\');
            return minimatch(
                pah.replace(new RegExp(pattern,'g'),'/'),
                (buildDir + '**').replace(new RegExp(pattern,'g'),'/')
            )
        })
        finalExclude = exclude.map(pah=>{
            return path.join(tsConfigPathDir, pah)
        })
            .filter(pah=>{
                let pattern = path.sep.replace(/\\/g, '\\\\');
                return minimatch(
                    pah.replace(new RegExp(pattern,'g'),'/'),
                    (buildDir + '**').replace(new RegExp(pattern,'g'),'/')
                )
            }).concat(finalExclude)
    }


    return rollup({
        input: entry,
        plugins: [
            json(),
            commonjs({
                strictRequires: true
            }),
            resolve({
                extensions:['.js','.ts','.json']
            }),// 解析 node_modules 中的模块
            typescript({
                compilerOptions:{
                    target: "ES2020", //safe
                    module: "ESNext",
                    removeComments: false,
                    skipLibCheck: true,
                    allowJs: true,
                    noImplicitAny: false,
                    baseUrl: finalBaseUrl,
                    allowImportingTsExtensions:true,
                    paths: tsConfigPathDir ? parsedConfig.options.paths :undefined
                },
                include: tsConfigPathDir ? finalInclude : undefined,
                exclude: tsConfigPathDir ? finalExclude : undefined,
                typescript: ts
            }), // 之所以不用babel是因为 1. babel不能明确指定编译为某个JavaScript版本. 2. babel编译后的代码可读性不好
        ],
        external: external()

    }).then((bundle)=>{
        return bundle.write({
            file: output,
            format: "es", // 输出格式，支持 amd, cjs, es, iife, umd 等
            // name: "MyLibrary", // 输出的全局变量名，仅适用于 iife 和 umd 格式
            // sourcemap: true
        })
    })
}

// const testEntry = 'D:\\pro\\js-code-view\\public\\recommend\\vuejs@vue\\src\\core\\index.ts'
// const testOp = "D:\\pro\\js-code-view\\public\\recommend\\vuejs@vue\\__bundle\\src%2Fcore%2Findex.ts.js"

// const testEntry = 'D:\\pro\\js-code-view\\public\\recommend\\vuejs@vue\\src\\compiler\\index.ts'
// const testOp = "D:\\pro\\js-code-view\\public\\recommend\\vuejs@vue\\__bundle\\src%2Fcompiler%2Findex.ts.js"
// const repoPath = "D:\\pro\\js-code-view\\public\\recommend\\vuejs@vue"

// const testEntry = 'D:\\pro\\js-code-view\\public\\recommend\\axios@axios\\lib\\axios.js'
// const testOp = "D:\\pro\\js-code-view\\public\\recommend\\axios@axios\\__bundle\\lib%2Faxios.js.js"
// const repoPath = "D:\\pro\\js-code-view\\public\\recommend\\axios@axios"
//
// rollupBuild({
//     entry: testEntry,
//     output: testOp,
//     repoPath
// })

module.exports = rollupBuild
