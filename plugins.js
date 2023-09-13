const path = require("path");
const fs = require("fs");
const generator = require("@babel/generator").default;
const parser = require("@babel/parser");
const traverse = require('@babel/traverse').default
const t = require('@babel/types')
const ts = require("typescript");
const {minimatch} = require('minimatch');

function tsCompile(source, options = null) {
    // 默认选项，您也可以合并或使用项目的tsconfig.json文件
    if (null === options) {
        options = {
            compilerOptions: {
                module: ts.ModuleKind.ESNext,
                target: ts.ScriptTarget.ES2020
            }
        };
    }

    // 转换代码
    let result = ts.transpileModule(source, options);

    // 返回JavaScript代码
    return result.outputText;
}

function tsconfigAlias({baseUrl,paths = []}) {
    // 定义一个空数组，用于存储转换后的别名对象
    const entries = [];

    // 遍历paths对象的键值对
    for (const [key, value] of Object.entries(paths)) {
        // 获取别名的路径数组，对每个元素，去掉开头和末尾的星号（如果有），并转换为绝对路径
        const find = value.map((v) => path.join(baseUrl, v.replace(/^\*|\*$/g, '')));

        // 创建一个别名对象，包含name和find属性，并添加到数组中
        entries.push({ name: key, find });
    }
    const extensions = ['.js', '.ts', '.jsx', '.tsx', '.json'];

    // 返回一个Rollup插件对象，包含resolveId方法
    return {
        name: 'tsconfig-alias',
        resolveId(importee,importer) {
            if (!importer || !entries.length) {
                return this.resolve(importee, importer, { skipSelf: true });
            }
            // 对每个模块路径，检查是否匹配某个别名对象的名称，如果是，就遍历该别名对象的路径数组，尝试读取文件内容并返回
            for (const entry of entries) {
                if (minimatch(importee,entry.name)) {
                    const relativePath = entry.name.endsWith('*') ? importee.slice(entry.name.length -1) : '.';

                    for (const find of entry.find) {
                        const potentialPaths = extensions.map(ext => path.resolve(find, relativePath + ext));

                        for (const potentialPath of potentialPaths) {
                            if (fs.existsSync(potentialPath)) {
                                return { id: potentialPath, moduleSideEffects: false };
                            }
                        }

                        for (const ext of extensions) {
                            const indexPath = path.join(find, `index${ext}`);

                            if (fs.existsSync(indexPath)) {
                                return { id: indexPath, moduleSideEffects: false };
                            }
                        }
                    }

                    return this.resolve(importee, importer, { skipSelf: true });
                }
            }
            return null;
        },
    };
}

function transformPublicClassFields(){
    return {
        name:'public-class-fields-plugin',
        visitor:{
            ClassDeclaration(path){
                const code = generator(path.node).code;
                const compiledCode = tsCompile(code)
                const ast = parser.parse(compiledCode);
                path.replaceWith(ast);
                path.skip();
            }
        }
    }
}


module.exports = {
    rollup:{
        tsconfigAlias
    },
    babel:{
        transformPublicClassFields
    }
}
