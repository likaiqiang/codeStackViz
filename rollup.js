const resolve = require('@rollup/plugin-node-resolve'); // 用于解析 node_modules 中的模块
const json = require('@rollup/plugin-json') ;
const {rollup} = require('rollup');
const path = require('path')
const external = require("@yelo/rollup-node-external");
const fs = require("fs");
const babel = require("@babel/core");

const transformTypescriptPlugin = ()=>{
    return {
        name:'transformTypescriptPlugin',
        transform(code,id){
            if (!/\.tsx?$/.test(id)) return null;
            const result = babel.transformFileSync(id, {
                plugins:[
                    ["@babel/plugin-transform-typescript",{allowDeclareFields: true}]
                ]
            })
            return {
                code: result.code,
                map: result.map
            }
        }
    }
}

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


function findPackageJson(filepath) {
    let currentDir = path.dirname(filepath);
    while (currentDir !== path.parse(currentDir).root) {
        const packageJsonPath = path.join(currentDir, 'package.json');
        if (fs.existsSync(packageJsonPath)) {
            return currentDir;
        }
        currentDir = path.join(currentDir, '..');
    }
    return null;
}

const rollupBuild = ({entry,output,repoPath})=>{
    // if(entry.endsWith('.ts')){
    //     const pkgRoot = findPackageJson(entry)
    //     // rimrafSync(path.join(repoPath,'__op'))
    //     // transformDir(
    //     //     pkgRoot,
    //     //     path.join(repoPath,'__op')
    //     // )
    // }

    rollup({
        // input: resourceEntryFile,
        input: entry,
        plugins: [
            json(),
            resolve({
                extensions:['.js','.ts','.json']
            }),// 解析 node_modules 中的模块
            transformTypescriptPlugin()
        ],
        external: external(),

    }).then((bundle)=>{
        return bundle.write({
            file: output,
            format: "es", // 输出格式，支持 amd, cjs, es, iife, umd 等
            // name: "MyLibrary", // 输出的全局变量名，仅适用于 iife 和 umd 格式
            // sourcemap: true
        })
    })
}


module.exports = rollupBuild
