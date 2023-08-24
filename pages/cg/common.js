const {parse} = require("@babel/parser");
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
