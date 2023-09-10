import * as t from "@babel/types";
import tern from "tern";
import {filterJsonByEntry, generateNameByPath, getAst} from "@/cg/common";
import generate from '@babel/generator'

import traverse from "@babel/traverse";

const server = new tern.Server({});

export function collecVertexsByAst(ast){
    const vertexs = []
    traverse(ast,{
        // function a(){}
        FunctionDeclaration(path){
            const {id} = path.node
            const {start, end} = id
            vertexs.push({
                id: `${id.name}-${start}-${end}`,
                loc:{
                    start,
                    end
                },
                isGlobal: true,
                exported:false,
                name: generateNameByPath(path),
                path
            })
        },
        // var a = ()=>{}
        VariableDeclarator(path){
            const {id,init} = path.node
            const {start, end} = id
            if(init && (init.type === 'FunctionExpression' || init.type === 'ArrowFunctionExpression')){
                vertexs.push({
                    id: `${id.name}-${start}-${end}`,
                    loc:{
                        start,
                        end
                    },
                    isGlobal: true,
                    exported:false,
                    name: generateNameByPath(path),
                    path
                })
            }
        },
        // const obj = {a(){}}
        ObjectMethod(path){
            const {key,kind} = path.node
            if(kind !== 'get'){
                const {start, end} = key
                vertexs.push({
                    id: `${key.name}-${start}-${end}`,
                    loc:{
                        start,
                        end
                    },
                    exported:false,
                    name: generateNameByPath(path),
                    path
                })
            }
        },
        // const obj = {a:()=>{}}
        ObjectProperty(path){
            const {key,value} = path.node
            if( value && (value.type === 'FunctionExpression' || value.type === 'ArrowFunctionExpression')){
                const {start, end} = key
                vertexs.push({
                    id: `${key.name}-${start}-${end}`,
                    loc:{
                        start,
                        end
                    },
                    exported:false,
                    name: generateNameByPath(path),
                    path
                })
            }
        },
        // class Foo{foo(){}}
        ClassMethod(path){
            const {key} = path.node
            const {start, end} = key
            vertexs.push({
                id: `${key.name}-${start}-${end}`,
                loc:{
                    start,
                    end
                },
                exported:false,
                name: generateNameByPath(path),
                path
            })
        },
        ReturnStatement(path){
            const {argument} = path.node
            if(argument && (argument.type === 'FunctionExpression' || argument.type === 'ArrowFunctionExpression')){
                const {start, end,id} = argument
                vertexs.push({
                    id: `${id?.name || 'anonymous'}-${start}-${end}`,
                    loc:{
                        start,
                        end
                    },
                    exported:false,
                    name: generateNameByPath(path),
                    path
                })
            }
        }
    })
    return vertexs
}

export function genreateDotJson(ast,code){
    // let dot = "digraph G {\n";
    const dotJson = {
        node: {fillcolor: "#eeeeee", style: "filled,rounded", shape: "rect"},

        statements:[]
    }

    const funcDecVertexs = collecVertexsByAst(ast)
    const importedModules = collectImportedModules(ast)
    server.addFile("example.js", code);

    server.flush(()=> {
        traverse(ast, {
            CallExpression(path) {
                const {end: calleeEnd} = path.node.callee
                const query = {
                    type: "definition",
                    file: "example.js",
                    end: calleeEnd,
                };
                server.request({ query }, (err, data = {}) => {
                    if(Object.keys(data).length){
                        const {start,end} = data
                        let callVertex = funcDecVertexs.find(vertex=> vertex.loc.start === start && vertex.loc.end === end)
                        const parentFunc = path.getFunctionParent()
                        if(parentFunc){
                            const {start: parentFuncStart ,end: parentFuncEnd} = getParsedParentFuncLoc(path)

                            if(parentFuncStart && parentFuncEnd){
                                const parentFuncVertex = funcDecVertexs.find(vertex=> vertex.loc.start === parentFuncStart && vertex.loc.end === parentFuncEnd)

                                if(!callVertex){
                                    const isFuncFromNpm = isFuncImported(path,importedModules)
                                    if(isFuncFromNpm){
                                        callVertex = {
                                            npm: true,
                                            id: isFuncFromNpm.id,
                                            loc: isFuncFromNpm.loc,
                                            name: isFuncFromNpm.localName + ' (npm)',
                                            path,
                                            npmPath: isFuncFromNpm.path
                                        }
                                    }
                                }
                                if(callVertex && parentFuncVertex){
                                    dotJson.statements.push({
                                        head:{
                                            id: parentFuncVertex.id,
                                            path: parentFuncVertex.path,
                                            attrs:{
                                                label: parentFuncVertex.name,
                                                id: parentFuncVertex.id
                                            }
                                        },
                                        tail:{
                                            id: callVertex.id,
                                            path: callVertex.path,
                                            attrs:{
                                                id: callVertex.id,
                                                label: callVertex.name
                                            },
                                            npm: !!callVertex.npm,
                                            npmPath: callVertex.npmPath
                                        },
                                        attributes:{}
                                    })
                                }

                            }
                        }
                    }

                })
            }
        })
    })

    return {
        dotJson,
        funcDecVertexs,
        importedModules
    }
}


export function getFuncVertexs({ast}){

    const exportNames = new Set()
    const exportVertexs = []
    traverse(ast,{
        ExportSpecifier(path){
            exportNames.add(path.node.local.name)
        },
        ExportDefaultDeclaration(path){
            exportNames.add(path.node.declaration.name)
        }
    })

    ast.program.body.push(
        t.functionDeclaration(
            t.identifier("jsCodeViewEntryFunc"),
            [],
            t.blockStatement(
                [...exportNames].map(name=>{
                    return t.expressionStatement(t.identifier(name))
                })
            )
        )
    )

    const code = generate(ast).code
    const newAst = getAst({code})

    const {dotJson,importedModules,funcDecVertexs} = genreateDotJson(newAst,code)

    const server = new tern.Server({})
    server.addFile("entry.js", code);

    window.code = code

    traverse(newAst,{
        FunctionDeclaration(path){
            if(path.node.id.name === 'jsCodeViewEntryFunc'){
                server.flush(()=>{
                    path.traverse({
                        Identifier(p){
                            server.request({
                                query:{
                                    type: "definition",
                                    file: "entry.js",
                                    end: p.node.end
                                }
                            },(err,data={})=>{
                                const vertex = funcDecVertexs.find(node=> node.loc.start === data.start && node.loc.end === data.end)
                                if(vertex && vertex.name !== 'jsCodeViewEntryFunc') vertex.exported = true
                            })
                        }
                    })
                })
            }
        }
    })
    traverse(newAst,{
        FunctionDeclaration(path){
            if (path.node.id.name === "jsCodeViewEntryFunc") {
                path.remove()
            }
        }
    })
    const displayFunc = funcDecVertexs.map(vertex=>{
        const filtedDotJson = filterJsonByEntry({
            dotJson,
            entryFuncId: vertex.id
        })
        return [vertex,filtedDotJson]
    }).filter(([vertex])=>{
        return vertex.isGlobal
    })
    return {
        dotJson,
        importedModules,
        funcDecVertexs,
        ast: newAst,
        displayFunc
    }
}


export const collectImportedModules = (ast)=>{
    const importedModules = {}
    traverse(ast,{
        ImportDeclaration(path){
            const source = path.node.source;
            // 获取当前节点的specifiers属性，它是一个数组，包含了导入的变量和模块
            const specifiers = path.node.specifiers;
            // 遍历specifiers数组，找到ImportDefaultSpecifier或ImportNamespaceSpecifier节点，它们表示导入了整个模块
            for (const specifier of specifiers) {
                if (specifier.type === 'ImportDefaultSpecifier' || specifier.type === 'ImportNamespaceSpecifier') {
                    // 获取导入的变量名，它是一个Identifier节点
                    const local = specifier.local;

                    importedModules[local.name] = {
                        moduleName: source.value,
                        localName: local.name,
                        loc:{
                            start: source.start,
                            end: source.end
                        },
                        id:`${local.name}-${source.start}-${source.end}`,
                        path
                    }
                } else if (specifier.type === 'ImportSpecifier') {
                    const localName = specifier.local.name;
                    const importedName = specifier.imported.name;
                    // const aliasName = specifier.local.name !== specifier.imported.name ? specifier.imported.name : null;
                    const moduleName = source.value;
                    // importedName与 localName相等表示没有as

                    // console.log(`Imported ${importedName}  as ${localName} from ${moduleName}`);
                    importedModules[localName] = {
                        moduleName,
                        localName,
                        loc:{
                            start: source.start,
                            end: source.end
                        },
                        id:`${localName}-${source.start}-${source.end}`,
                        path
                    }
                }
            }
        }
    })
    return importedModules
}

export const isFuncImported = (path,importedModules={})=>{
    const callee = path.get('callee')

    if(callee.type === 'Identifier' && importedModules[callee.node.name]) return importedModules[callee.node.name]
    if(callee.type === 'MemberExpression'){
        let {property,object} = callee.node

        while (object.type === 'MemberExpression') {
            object = object.object;
            property = object.property;
        }

        if (object.type === 'Identifier' && importedModules[object?.node?.name || object.name]) {
            return importedModules[object.node?.name || object.name]
        }
    }
    return false
}

export const getParsedParentFuncLoc = (path)=>{
    const parentFunc = path.getFunctionParent()
    if(parentFunc.node.type === 'FunctionExpression' || parentFunc.node.type === 'ArrowFunctionExpression'){
        if(!parentFunc.node.id){
            if(parentFunc.container.type ===  'ObjectProperty'){
                const {key} = parentFunc.container
                return {
                    start: key.start,
                    end: key.end
                }
            }
            if(parentFunc.container.type === 'VariableDeclarator'){
                const {id} = parentFunc.container
                return {
                    start: id.start,
                    end: id.end
                }
            }
        }
    }
    if(parentFunc.node.type === 'ObjectMethod' || parentFunc.node.type === 'ClassMethod'){
        const {start,end} = parentFunc.node.key
        return {
            start,
            end
        }
    }
    if(parentFunc.node.type === 'FunctionDeclaration'){
        const {start,end} = parentFunc.node.id
        return {
            start,
            end
        }
    }
    return {

    }
}


