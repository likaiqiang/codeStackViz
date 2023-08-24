const {parse} = require("@babel/parser");
export const getAst = ({code})=>{
    return parse(code,{
        sourceType:'unambiguous'
    })
}
