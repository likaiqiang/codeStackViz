const resolve = require('@rollup/plugin-node-resolve'); // 用于解析 node_modules 中的模块
const commonjs = require('@rollup/plugin-commonjs'); // 用于转换 CommonJS 模块为 ES6 模块
const json = require('@rollup/plugin-json') ;
const babel = require('@rollup/plugin-babel'); // 用于编译 ES6+ 代码
const path = require('path')
// import {getGlobals} from 'common-es'
const external = require('@yelo/rollup-node-external') // 避免打包npm依赖


// const {__dirname,__filename} = getGlobals(import.meta.url)

module.exports = {
    input: path.join(__dirname,'./resources/src/url-loader/index.js'), // 入口文件
    output: {
        file: path.join(__dirname,'./resources/output/url-loader-bundle.js'), // 输出文件
        // file: path.join(__dirname,'./demo/url-loader/bundle.js'),
        format: "es", // 输出格式，支持 amd, cjs, es, iife, umd 等
        // name: "MyLibrary", // 输出的全局变量名，仅适用于 iife 和 umd 格式
        // sourcemap: true
    },
    plugins: [
        json(),
        resolve(), // 解析 node_modules 中的模块
        commonjs(), // 转换 CommonJS 模块为 ES6 模块
        // babel({
        //     presets:["@babel/preset-env"]
        // }) // 编译 ES6+ 代码
    ],
    external: external()
};
