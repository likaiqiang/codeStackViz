const resolve = require('@rollup/plugin-node-resolve'); // 用于解析 node_modules 中的模块
const json = require('@rollup/plugin-json') ;
const babel = require('@babel/core');
const {rollup} = require('rollup');
const path = require('path')
const external = require("@yelo/rollup-node-external");

module.exports = ({entry,output})=>{
    rollup({
        // input: resourceEntryFile,
        input: entry,
        plugins: [
            json(),
            resolve() // 解析 node_modules 中的模块
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
