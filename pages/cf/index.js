import {collectImportedModules, isFuncImported} from "@/pages/cf/vertex";

const {parse} = require('@babel/parser')
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default
const t = require('@babel/types')
const tern = require("tern");
const {collecVertexsByAst,getParsedParentFuncLoc} = require('./vertex')

const server = new tern.Server({
    libs: [
        "find-cache-dir@4.0.0",
        "schema-utils@4.0.0"
    ]
});

function generateRandomId() {
    return '_' + Math.random().toString(36).substr(2, 9);
}

const selectNodeConfig = {
    color:'red'
}

const getAst = ({code,filename})=>{
    const ast = parse(code,{
        sourceType:'unambiguous'
    })
    ast.attr = {
        filename
    }
    return ast
}

export const generateCode = (path)=>{
    try{
        return generate(path.node).code
    } catch (e){

    }
}

function filterNodesByEntry(options, entryFunctionId) {
    const {statements: nodes} = options
    const relatedNodes = new Set(); // 用 Set 来存储相关节点
    function findRelatedNodes(entry) {
        nodes.forEach(node => {
            if (node.head.id === entry && !relatedNodes.has(node)){
                relatedNodes.add(node);
                findRelatedNodes(node.tail.id); // 递归查找下一级相关节点
            }
        });
    }
    findRelatedNodes(entryFunctionId);

    return {
        ...options,
        statements: nodes.filter(node => relatedNodes.has(node))
    }

}


export const generateDotStr = ({ast,entryFuncId,selectNodeId,code})=>{
    const filteredDotJson = filterNodesByEntry(
        genreateDotJson(ast,code),
        entryFuncId
    )
    return parseDotJson({
        options: filteredDotJson,
        selectNodeId
    })
}

function getEntryFuncVertex({filename,funcname = 'entryFuncName'}){
    const ast = astCache[filename]
    let vertex = null
    traverse(ast,{
        FunctionDeclaration(path){
            const {id} = path.node
            const {start, end} = id
            if(id.name === funcname){
                vertex = {
                    id: `${id.name}-${start}-${end}`,
                    loc:{
                        start,
                        end
                    },
                    name: id.name
                }
            }
        }
    })
    return vertex
}

export const genreateDotStrByCode = ({code, filename,entryFuncName})=>{
    const ast =  astCache[filename] || (astCache[filename] = getAst({code,filename}))
    const entryFuncVertex = getEntryFuncVertex({filename,funcname: entryFuncName})

    return generateDotStr({
        ast,
        entryFuncId: entryFuncVertex.id,
        selectNodeId: entryFuncVertex.id,
        code
    })
}


export function parseDotJson({options,selectNodeId}){
    const {node = {},statements=[]} = options
    // node  ["fillcolor"="#eeeeee", "style"="filled,rounded", "shape"="rect"];
    let str = 'digraph G {\nrankdir=LR;'
    if(Object.keys(node).length > 0){
        str += Object.keys(node).reduce((acc,key,index)=>{
            return acc += `"${key}"="${node[key]}",`
        }, 'node [')
        str += ']'
    }
    let nodes = {}, selectNode = {}
    if(statements.length){
        const drafh = collectNodesFromEdges({
            edges: statements,
            selectNodeId
        })
        nodes = drafh.nodes
        selectNode = drafh.selectNode
        str += Object.keys(nodes).reduce((acc,key)=>{
            const attrs = nodes[key].attrs
            acc += `\n"${nodes[key].id}" [`
            for(let k in attrs){
                acc += `"${k}"="${attrs[k]}"`
            }
            return acc + ']'
        },'')

        str += statements.reduce((acc,item,index)=>{
            const {head,tail,attributes={}} = item
            let stmp = `"${head.id}" -> "${tail.id}"`
            if(Object.keys(attributes).length > 0){
                stmp += Object.keys(attributes).reduce((acc2,attr)=>{
                    return acc2 += `"${attr}"="${attributes[attr]}",`
                },' [')
                stmp += ']'
            }
            return acc += '\n' + stmp
        },'')
    }
    return {
        dot: str + '\n}',
        dotJson: options,
        nodes,
        selectNode
    }
}

export const astCache = {}


// 在JavaScript中，一个函数可以在全局被调用、可以在函数内部被调用，可以是成员函数（2种情况：普通对象与类实例化）、调用call/apply、constructor?
// 全局调用，没有parent，忽略
// 函数内部调用，parent还是函数,sign: parentName.funcName,并且继续往上查找
// 成员函数调用，parent：obj或者类实例，sign: obj.funcName,并且继续往上查找，obj的上层可能是另一个obj/类，也可能是函数
// constructor（new 操作符）， sign: 实例化对象.constructor,并且继续往上查找，与上一条差不多


function genreateDotJson(ast,code){
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
                server.request({ query }, (err, data) => {
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
                                            name: isFuncFromNpm.localName
                                        }
                                    }
                                }
                                if(callVertex && parentFuncVertex){
                                    dotJson.statements.push({
                                        head:{
                                            id: parentFuncVertex.id,
                                            path: parentFuncVertex.path,
                                            attrs:{
                                                label: parentFuncVertex.name
                                            }
                                        },
                                        tail:{
                                            id: callVertex.id,
                                            path: callVertex.path,
                                            attrs:{
                                                label: callVertex.name
                                            }
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

    return dotJson
}

function setToObject(inputSet,getKey = (value,index)=>`key${index}`) {
    const convertedObject = {};

    inputSet.forEach((value,index) => {
        const key = getKey(value,index); // 使用索引作为键
        convertedObject[key] = value;
    });

    return convertedObject;
}

function collectNodesFromEdges({edges,selectNodeId}) {
    const collectedNodes = new Set(); // 使用 Set 来避免重复添加节点
    let selectNode = null
    edges.forEach(edge => {
        collectedNodes.add(edge.head);
        collectedNodes.add(edge.tail);
    });
    const nodes = setToObject(collectedNodes,(value)=>value.id)
    for(let id in nodes){
        if(selectNodeId && id === selectNodeId){
            for(let key in selectNodeConfig){
                nodes[selectNodeId][key] = selectNodeConfig[key]
            }
            selectNode = nodes[selectNodeId]
            break
        }
    }
    return {
        nodes,
        selectNode
    }
}


