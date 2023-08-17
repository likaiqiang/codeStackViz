const {default: traverse} = require("@babel/traverse");

export function collecVertexsByAst(ast){
    const vertexs = []
    traverse(ast,{
        FunctionDeclaration(path){
            const {id} = path.node
            const {start, end} = id
            vertexs.push({
                id: `${id.name}-${start}-${end}`,
                loc:{
                    start,
                    end
                },
                name: id.name,
                path
            })
        },
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
                    name: id.name,
                    path
                })
            }
        },
        ObjectMethod(path){
            const {key} = path.node
            const {start, end} = key
            vertexs.push({
                id: `${key.name}-${start}-${end}`,
                loc:{
                    start,
                    end
                },
                name: key.name,
                path
            })
        },
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
                    name: key.name,
                    path
                })
            }
        },
        ClassMethod(path){
            const {key} = path.node
            const {start, end} = key
            vertexs.push({
                id: `${key.name}-${start}-${end}`,
                loc:{
                    start,
                    end
                },
                name: key.name,
                path
            })
        }
    })
    return vertexs
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

