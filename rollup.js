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
const minimatch = require('minimatch')
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

function findFileUpwards({fileName = 'tsconfig.json',startFilePath}) {
    let currentDir = path.dirname(startFilePath)
    while (currentDir !== path.parse(currentDir).root) {
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


const rollupBuild = ({entry,output})=>{

    const tsConfigPathDir = findFileUpwards({
        fileName: 'tsconfig.json',
        startFilePath: entry
    })

    // const compilerOptions = tsConfigPath ? JSON.parse(fs.readFileSync(tsConfigPath,'utf-8')).compilerOptions : {}
    const tsConfig = tsConfigPathDir ?
        JSON.parse(
            fs.readFileSync(
                path.join(tsConfigPathDir,'tsconfig.json'),
                'utf-8'
            ))
        : {}
    const {compilerOptions} = tsConfig
    const {baseUrl = '.', paths = {}} = compilerOptions

    const finalBaseUrl = path.join(
        tsConfigPathDir,
        baseUrl
    )

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
                    target: "ES2021", //safe
                    module: "ESNext",
                    removeComments: false,
                    skipLibCheck: true,
                    jsx: "preserve",
                    allowJs: true,
                    paths: compilerOptions.paths,
                    baseUrl: finalBaseUrl
                },
                include: `${tsConfigPathDir}/**/*.(cts|mts|ts|tsx|js|jsx|mjs|cjs)`,
                exclude: [`${tsConfigPathDir}/node_modules/**`,`${tsConfigPathDir}/__bundle/**`]
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

// const testEntry = 'D:\\pro\\js-code-view\\public\\recommend\\vue\\src\\core\\index.ts'
// const testOp = "D:\\pro\\js-code-view\\public\\recommend\\vue\\__bundle\\src%2Fcore%2Findex.ts.js"

const testEntry = 'D:\\pro\\js-code-view\\public\\recommend\\vue\\src\\compiler\\index.ts'
const testOp = "D:\\pro\\js-code-view\\public\\recommend\\vue\\__bundle\\src%2Fcompiler%2Findex.ts.js"

rollupBuild({
    entry: testEntry,
    output: testOp
})

module.exports = rollupBuild
