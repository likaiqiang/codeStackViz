// 导入Node.js的fs和vm模块
const fs = require("fs");
const vm = require("vm");

// 读取配置文件的内容
const configContent = fs.readFileSync("webpack.config.js", "utf8");

// 创建一个新的沙箱环境
const sandbox = {
    // 定义一些可能用到的变量或函数
    path: require("path"),
    module: {},
    __dirname: __dirname,
};

// 在沙箱环境中执行配置文件的内容
vm.runInNewContext(configContent, sandbox);

// 获取配置对象
const configObject = sandbox.module.exports;

// 获取alias属性
const alias = configObject.resolve.alias;

// 打印alias属性
console.log(alias);







const path = require('path');
const configPath = path.resolve(__dirname, 'webpack.config.js');

let config = require(configPath);

// 模拟环境和配置项
const env = { production: true };
const argv = { mode: 'production', outputPath: './dist' };
// 这里不需要真实的配置，只要大概模拟，或者传空{}都可以,或者模拟一个尽可能安全的配置

// 如果webpack.config.js导出的是一个函数，调用它
if (typeof config === 'function') {
    config = config(env, argv);
}

console.log(config);




// typescript Go to Definition
const ts = require('typescript');

function createProgram(filePath, rootFileNames, options) {
    const host = ts.createCompilerHost(options);
    const program = ts.createProgram(rootFileNames, options, host);
    return program;
}

function getDefinitionAtPosition(program, filePath, line, character) {
    const sourceFile = program.getSourceFile(filePath);
    const position = ts.getPositionOfLineAndCharacter(sourceFile, line, character);
    const definitions = ts.getDefinitionAtPosition(sourceFile, position);

    if (definitions) {
        return definitions.map(def => ({
            path: def.fileName,
            line: ts.getLineAndCharacterOfPosition(sourceFile, def.textSpan.start).line,
            character: ts.getLineAndCharacterOfPosition(sourceFile, def.textSpan.start).character
        }));
    }

    return null;
}

const program = createProgram('path/to/your/file.ts', ['path/to/your/file.ts'], { target: ts.ScriptTarget.ES5 });
const definitions = getDefinitionAtPosition(program, 'path/to/your/file.ts', 10, 5);

console.log(definitions);
