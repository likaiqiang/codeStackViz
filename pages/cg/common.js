const {parse} = require("@babel/parser");
const generate = require('@babel/generator').default
export const getAst = ({code})=>{
    return parse(code,{
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
        return code + generateCode(classPath)
    }
    return code + generateCode(path)
}
