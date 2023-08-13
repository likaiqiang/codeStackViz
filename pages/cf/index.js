const {parse} = require('@babel/parser')
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default
const t = require('@babel/types')

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
    return generate(path.node).code
}

function filterNodesByEntry(options, entryFunctionName) {
    const {statements: nodes} = options
    const relatedNodes = new Set(); // 用 Set 来存储相关节点
    function findRelatedNodes(entry) {
        nodes.forEach(node => {
            if (node.head.text === entry) {
                relatedNodes.add(node);
                findRelatedNodes(node.tail.text); // 递归查找下一级相关节点
            }
        });
    }

    findRelatedNodes(entryFunctionName);

    return {
        ...options,
        statements: nodes.filter(node => relatedNodes.has(node))
    }

}

function calculateLevels(data,entryFuncName) {
    const levels = {}; // 用于存储每个元素的层级

    function calculateElementLevel(element, currentLevel) {
        const head = element.head.text;
        const tail = element.tail.text;

        // 如果头部在 levels 中尚未记录，则初始化为当前层级
        if (!levels[head]) {
            levels[head] = currentLevel;
        }

        // 更新尾部的层级为头部层级 + 1
        levels[tail] = levels[head] + 1;

        // 递归计算下一个元素的层级
        const nextElement = data.find(e => e.head === tail);
        if (nextElement) {
            calculateElementLevel(nextElement, levels[tail]);
        }
    }

    // 找到起始元素并开始计算
    // const startingElements = data.filter(e => !data.some(el => el.tail === e.head));

    const startingElements = data.filter(e=>e.head.text === entryFuncName)

    startingElements.forEach(startingElement => {
        calculateElementLevel(startingElement, 1);
    });

    return data.map(element => ({
        ...element,
        level: levels[element.head.text] // 将计算得到的层级添加到元素对象中
    }));
}

export const generateDotStr = ({ast,entryFuncName,selectNodeText})=>{
    const filteredDotJson = filterNodesByEntry(
        genreateDot(ast),
        entryFuncName
    )
    // const levels = calculateLevels(dotJson.statements,entryFunc)
    // console.log('levels',levels);
    return parseDotJson({
        options: filteredDotJson,
        selectNodeText: selectNodeText
    })
}


export const genreateDotStrByCode = ({code, filename,entryFuncName})=>{
    const ast =  astCache[filename] || (astCache[filename] = getAst({code,filename}))

    return generateDotStr({ast,entryFuncName,selectNodeText: entryFuncName})
}


export function parseDotJson({options,selectNodeText}){
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
            selectNodeText
        })
        nodes = drafh.nodes
        selectNode = drafh.selectNode
        str += Object.keys(nodes).reduce((acc,key)=>{
            const attrs = nodes[key].attrs
            acc += `\n"${nodes[key].text}" [`
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
        nodes,
        selectNode
    }
}

export const dotCache = {}

export const astCache = {}


function genreateDot(ast){
    // let dot = "digraph G {\n";
    const dotJson = {
        node: {fillcolor: "#eeeeee", style: "filled,rounded", shape: "rect"},

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
                        path: parentFunc,
                        attrs:{}
                    },
                    tail:{
                        text:callName,
                        path: binding.path,
                        attrs:{}
                    },
                    attributes:{}
                })
                // dot += `  "${parentFunc.node.id.name}" -> "${callName}"\n`;
            }
        }
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

function collectNodesFromEdges({edges,selectNodeText}) {
    const collectedNodes = new Set(); // 使用 Set 来避免重复添加节点
    let selectNode = null
    edges.forEach(edge => {
        collectedNodes.add(edge.head);
        collectedNodes.add(edge.tail);
    });
    const nodes = setToObject(collectedNodes,(value)=>value.text)
    for(let text in nodes){
        if(selectNodeText && text === selectNodeText){
            nodes[text].attrs.color = selectNodeConfig.color
            selectNode = nodes[text]
        }
    }
    return {
        nodes,
        selectNode
    }
}

// const collectNodesFromEdges = (edges = [],selectNodeText)=>{
//     let selectNode = null
//     const nodes = edges.reduce((acc, item, i) => {
//         const {head, tail} = item
//         if (!(head.text in acc)) {
//             acc[head.text] = {node: head, attrs: {id: generateRandomId()}, index: i}
//             if(selectNodeText && head.text === selectNodeText) {
//                 acc[head.text].attrs.color = selectNodeConfig.color
//                 selectNode = head
//             }
//         }
//         if (!(tail.text in acc)) {
//             acc[tail.text] = {node: tail, attrs: {id: generateRandomId()}, index: i}
//         }
//         return acc
//     }, {})
//     return {
//         nodes,
//         selectNode
//     }
// }

