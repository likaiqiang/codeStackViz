const resolve = require('@rollup/plugin-node-resolve'); // 用于解析 node_modules 中的模块
const json = require('@rollup/plugin-json') ;
const commonjs = require('@rollup/plugin-commonjs')
const {rollup} = require('rollup');
const path = require('path')
const external = require("@yelo/rollup-node-external");

const ts = require('typescript');
const {findFileUpwards} = require("./utils/server");
const {rollup: rollupPlugins, babel: babelPlugins} = require('./plugins')
const babel = require("@rollup/plugin-babel");
const {parse} = require('@babel/parser')
const traverse = require('@babel/traverse').default
const generateCode = require('@babel/generator').default
const fs = require('fs/promises')

const rollupBuild = ({entry,output,repoPath})=>{

    const tsConfigPathDir = findFileUpwards({
        fileName: 'tsconfig.json',
        startFilePath: entry,
        rootDir: repoPath
    })



    let tsConfig = {},
        parsedConfig = {},
        finalBaseUrl = repoPath

    if(tsConfigPathDir){
        tsConfig = ts.readConfigFile(path.join(tsConfigPathDir,'tsconfig.json'), ts.sys.readFile);
        parsedConfig = ts.parseJsonConfigFileContent(tsConfig.config, ts.sys, tsConfigPathDir);
        // const {baseUrl =  '.'} = parsedConfig.options || {}
        finalBaseUrl = parsedConfig.options.baseUrl || repoPath
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
            rollupPlugins.tsconfigAlias({
                baseUrl: finalBaseUrl,
                paths: tsConfigPathDir ? parsedConfig.options.paths :undefined
            }),
            babel({
                plugins:[
                    ["@babel/plugin-transform-typescript",{allowDeclareFields: true}],
                    // [babelPlugins.transformPublicClassFields()],
                ],
                extensions:['.js', '.jsx', '.es6', '.es', '.mjs','.ts']
            })
        ],
        external: external()

    }).then((bundle)=>{
        return bundle.write({
            file: output,
            format: "es", // 输出格式，支持 amd, cjs, es, iife, umd 等
            // name: "MyLibrary", // 输出的全局变量名，仅适用于 iife 和 umd 格式
            // sourcemap: true
        }).then(res=>{
            const {code} = res.output[0]
            const ast = parse(code,{
                sourceType:'unambiguous'
            })
            traverse(
                ast,
                babelPlugins.transformPublicClassFields().visitor
            )
            return fs.writeFile(output, generateCode(ast).code)
        })
    })
}


// const testEntry = 'D:\\pro\\js-code-view\\public\\resources\\ebdc240705d664a08f73feb098b98ecb@vuejs@vue\\src\\compiler\\index.ts'
// const testOp = 'D:\\pro\\js-code-view\\public\\resources\\ebdc240705d664a08f73feb098b98ecb@vuejs@vue\\__bundle\\src%2Fcompiler%2Findex.ts.js'
// const repoPath = "D:\\pro\\js-code-view\\public\\resources\\ebdc240705d664a08f73feb098b98ecb@vuejs@vue"
// rollupBuild({
//     entry: testEntry,
//     output: testOp,
//     repoPath
// })

module.exports = rollupBuild
