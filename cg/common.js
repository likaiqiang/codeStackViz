// import {parse} from '@babel/parser';
import generate from '@babel/generator'
export const getAst = ({code})=>{
    return window.babelParser.parse(code,{
        sourceType:'unambiguous'
    })
}

export const isVertexHasNext = ({id,statements=[]})=>{
    const allHeadIds = []
    const allTailIds = []
    for(let edge of statements){
        allHeadIds.push(edge.head.id)
        allTailIds.push(edge.tail.id)
    }
    const filtedIds = allTailIds.filter(id=> !allHeadIds.includes(id))
    return !filtedIds.includes(id)
}

export const generateNameByPath = (path)=>{
    if(path.type === 'FunctionDeclaration' || path.type === 'VariableDeclarator'){
        const {id} = path.node
        return id.name
    }
    if(path.type === 'ObjectMethod' || path.type === 'ObjectProperty'){
        const {key} = path.node
        return key.name
    }
    if(path.type === 'ClassMethod'){
        const classPath = path.findParent((path) => path.isClassDeclaration());
        const {key} = path.node
        if (classPath) {
            return classPath.node.id.name + '.' + key.name
        }
    }
    // if(path.type === 'ReturnStatement'){
    //     const {argument} = path.node
    //     const {id} = argument
    //
    //     const parentPath = path.findParent(path=> path.isFunctionDeclaration() || path.isArrowFunctionExpression() || path.isFunctionExpression())
    //
    //     if(parentPath.type === 'FunctionDeclaration'){
    //         return (parentPath.id?.name || 'anonymous') + 'return' + (id?.name || 'anonymous')
    //     }
    //     if(parentPath.type === 'ArrowFunctionExpression' || parentPath.type === 'FunctionExpression'){
    //         const bindings = parentPath.scope.bindings;
    //         for (const [name, binding] of Object.entries(bindings)) {
    //             if (binding.path === parentPath.parentPath) {
    //                 return name + 'return' + (id?.name || 'anonymous')
    //             }
    //         }
    //     }
    // }
    return ''
}

export const generateCode = (path)=>{
    try{
        return generate(path.node).code
    } catch (e){

    }
}
export const generateSplicedCode = ({path,npm,npmPath})=>{
    const {node} = path
    let code = ''
    if(npm){
        code += generateCode(npmPath) + '\n'
    }
    if(node.type === 'ClassMethod'){
        const classPath = path.findParent((path) => path.isClassDeclaration());
        return {
            value:code + generateCode(classPath),
            type:'class',
            paths:{
                nodePath: path,
                classPath
            }
        }
    }
    return {
        value: code + generateCode(path),
        type:'',
        paths:{
            nodePath: path
        }
    }
}

export function filterJsonByEntry({dotJson,entryFuncId}) {
    const {statements: nodes} = dotJson
    const relatedNodes = new Map(); // 用 Map 来存储相关节点
    let maxLevel = 1
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
    findRelatedNodes(entryFuncId,maxLevel);

    return {
        ...dotJson,
        maxLevel,
        statements: nodes.filter(node => {
            const key = node.head.id + '-' + node.tail.id
            return relatedNodes.has(key)
        })
    }

}

