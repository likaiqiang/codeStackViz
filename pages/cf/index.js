const {parse} = require('@babel/parser')
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default
const t = require('@babel/types')
const Viz = require('@viz-js/viz')

// const DOMParser = require('xmldom').DOMParser;
// global.DOMParser = DOMParser

// const inputFilePath = path.join(__dirname,'./bundle.js')
// const inputCode = fs.readFileSync(inputFilePath) + ''
// const ast = parse(inputCode,{
//     sourceType:'module'
// })

function generateRandomId() {
    return '_' + Math.random().toString(36).substr(2, 9);
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
    return generate(path.node).code
}



async function dotToJson(dotStr) {
    return Viz.instance().then(viz=>{
        return viz.renderString(dotStr,{format: "json0"})
    })
}

export function genreateSvg({code, filename}){
    const ast = getAst({code,filename})
    const dotJson = genreateDot(ast)
    const dotStr = parseDotJson(dotJson)
    console.log(dotStr);
    return Viz.instance().then(function(viz) {
        return {
            svg: viz.renderSVGElement(dotStr),
            dot: dotStr
        }
    })
}

export const genreateDotStr = ({code, filename})=>{
    const ast = getAst({code,filename})
    const dotJson = genreateDot(ast)
    return parseDotJson(dotJson)
}


function parseDotJson(options){
    const {node = {},statements=[]} = options
    // node  ["fillcolor"="#eeeeee", "style"="filled,rounded", "shape"="rect"];
    let str = 'digraph G {\n'
    if(Object.keys(node).length > 0){
        str += Object.keys(node).reduce((acc,key,index)=>{
            return acc += `"${key}"="${node[key]}",`
        }, 'node [')
        str += ']'
    }
    let nodes = {}
    if(statements.length){
        nodes = collectNodesFromEdges(statements)
        str += Object.keys(nodes).reduce((acc,key)=>{
            const attrs = nodes[key].attrs
            acc += `\n"${key}" [`
            for(let k in attrs){
                acc += `"${k}"="${attrs[k]}"`
            }
            return acc + ']'
        },'')

        str += statements.reduce((acc,item,index)=>{
            const {head,tail,attributes={}} = item
            let stmp = `"${head.text}" -> "${tail.text}"`
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
        nodes
    }
}


function genreateDot(ast){
    // let dot = "digraph G {\n";
    const dotJson = {
        node: {fillcolor: "#eeeeee", style: "filled,rounded", shape: "rect"},
        // styles:
        // {
        //     selected: {fillcolor: "#bbccff:#ddeeff"},
        //     depends: {label: "depends", style: "dashed", arrowhead: "open"}
        // },
        statements:[]
    }
    traverse(ast,{
        CallExpression(path){
            const callee = path.node.callee
            let callName = null, binding = null
            if(t.isIdentifier(callee)){
                callName = callee.name
                binding = path.scope.getBinding(callName)
            }
            if(t.isMemberExpression(callee)){
                const obj = callee.object.name
                const property = callee.property.name

                binding = path.scope.getBinding(obj)
                callName = obj + '.' + property

            }
            const parentFunc = path.findParent(p=>p.isFunctionDeclaration())
            if(parentFunc && binding){
                dotJson.statements.push({
                    head:{
                        text:parentFunc.node.id.name,
                        path: parentFunc
                    },
                    tail:{
                        text:callName,
                        path
                    },
                    attributes:{}
                })
                // dot += `  "${parentFunc.node.id.name}" -> "${callName}"\n`;
            }
        }
    })
    return dotJson
}

const collectNodesFromEdges = (edges = [])=>{
    return edges.reduce((acc,item)=>{
        const {head,tail} = item
        if(!(head.text in acc)){
            acc[head.text] = {node: head,attrs:{id: generateRandomId()}}
        }
        if(!(tail.text in acc)){
            acc[tail.text] = {node: tail, attrs: {id: generateRandomId()}}
        }
        return acc
    },{})
}

