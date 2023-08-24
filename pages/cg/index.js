import {getFuncVertexs} from "@/pages/cg/vertex";

const {getAst} = require('./common')

export const selectNodeConfig = {
    color:'red'
}

export function filterJsonByEntry({dotJson,entryFuncId}) {
    const {statements: nodes} = dotJson
    const relatedNodes = new Map(); // 用 Map 来存储相关节点
    let maxLevel = 0
    function findRelatedNodes(entry,level) {
        nodes.forEach(node => {
            const key = node.head.id + '-' + node.tail.id

            if (node.head.id === entry){
                if(!relatedNodes.has(key)){
                    node.level = level
                    node.count = 1
                    relatedNodes.set(key,node);
                    maxLevel = Math.max(level,maxLevel)
                    findRelatedNodes(node.tail.id,level + 1); // 递归查找下一级相关节点
                } else {
                    const existedNode = relatedNodes.get(key)
                    if(existedNode.head.id === existedNode.tail.id){
                        existedNode.self = true
                    }
                    else{
                        existedNode.count = existedNode.count + 1
                    }
                }
            }
        });
    }
    findRelatedNodes(entryFuncId,0);

    return {
        ...dotJson,
        maxLevel,
        statements: nodes.filter(node => {
            const key = node.head.id + '-' + node.tail.id
            return relatedNodes.has(key)
        })
    }

}

export const getConfigByCode = ({code, filename})=>{
    const ast = getAst({code})
    const {dotJson,importedModules,funcDecVertexs,exportVertexs, ast: newAst} = getFuncVertexs({ast})

    cache[filename] = {
        ast:newAst,
        dotJson,
        importedModules,
        funcDecVertexs,
        exportVertexs,
        code
    }
    return cache[filename]

    // const filteredDotJson = filterJsonByEntry({
    //     dotJson,
    //     entryFuncId: entryFuncVertex.id
    // })
    //
    // return generateDotStr({
    //     filteredDotJson,
    //     selectNodeId: entryFuncVertex.id,
    // })
}


export function generateDotStr({filteredDotJson,selectNodeId}){
    const {node = {},statements=[]} = filteredDotJson
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
        nodes,
        selectNode,
        filteredDotJson
    }
}

export const cache = {}


// 在JavaScript中，一个函数可以在全局被调用、可以在函数内部被调用，可以是成员函数（2种情况：普通对象与类实例化）、调用call/apply、constructor?
// 全局调用，没有parent，忽略
// 函数内部调用，parent还是函数,sign: parentName.funcName,并且继续往上查找
// 成员函数调用，parent：obj或者类实例，sign: obj.funcName,并且继续往上查找，obj的上层可能是另一个obj/类，也可能是函数
// constructor（new 操作符）， sign: 实例化对象.constructor,并且继续往上查找，与上一条差不多


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
                nodes[selectNodeId]['attrs'][key] = selectNodeConfig[key]
            }
            selectNode = nodes[selectNodeId]
        }
        else {
            for(let key in selectNodeConfig){
                delete nodes[id]['attrs'][key]
            }
        }
    }
    return {
        nodes,
        selectNode
    }
}


