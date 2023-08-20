import t from "@babel/types";

const {default: traverse} = require("@babel/traverse");

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
                name: id.name,
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
                    name: id.name,
                    path
                })
            }
        },
        // const obj = {a(){}}
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
                    name: key.name,
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
                name: key.name,
                path
            })
        }
    })
    return vertexs
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

        if (object.type === 'Identifier' && importedModules[object.node.name]) {
            return importedModules[object.node.name]
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

