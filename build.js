const babel = require('@babel/core');
const path = require('path')
const fs = require('fs')
const rollup = require('./rollup')
function deleteFolderIfExists(folderPath) {
    // 检查文件夹是否存在
    if (fs.existsSync(folderPath)) {
        // 如果文件夹存在，则删除它
        fs.rmdirSync(folderPath, { recursive: true });
    }
}

function transformDir(srcDir, outDir) {
    // 遍历目录中的所有文件和子目录
    fs.readdirSync(srcDir).forEach(item => {
        // 获取文件或子目录的完整路径
        const srcPath = path.join(srcDir, item);
        // 获取输出文件或子目录的完整路径
        const parsed = path.parse(item);
        // 构造新的文件名
        const newFilename = `${parsed.name}.js`;
        // 获取输出文件或子目录的完整路径
        const outPath = path.join(outDir, newFilename);
        // 检查是否为子目录
        if (fs.statSync(srcPath).isDirectory()) {
            // 如果是子目录，则递归处理
            transformDir(srcPath, path.join(outDir,item));
        } else {
            const ext = path.extname(srcPath)
            if (!(ext === '.json' && path.basename(srcPath) === 'package.json')){
                const result = babel.transformFileSync(srcPath, {
                    plugins:[
                        ["@babel/plugin-transform-typescript",{allowDeclareFields: true}]
                    ]
                });
                // 确保输出目录存在
                fs.mkdirSync(outDir, { recursive: true });
                // 将转换结果写入输出文件
                fs.writeFileSync(outPath, result.code);
            }
        }
    });
}


const resourceName = 'babel-parser'
const entry = path.join(__dirname,`./resources/src/${resourceName}`)
const output = path.join(__dirname,`./resources/src/${resourceName}/_op`)

deleteFolderIfExists(output)

transformDir(entry,output)

const resourceEntryFile = path.join(__dirname,`./resources/src/${resourceName}/_op/index.js`)

rollup({
    entry: resourceEntryFile,
    output: path.join(__dirname,`./resources/output/${resourceName}/bundle.js`)
})
