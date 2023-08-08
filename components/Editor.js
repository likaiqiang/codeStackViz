import React from "react";
import Editor from "@monaco-editor/react";


export default (props)=>{
    const {value} = props
    return (
        <Editor
            width={'50%'}
            height={'600px'}
            theme="vs-dark"
            defaultLanguage="javascript" // 编辑器的默认语言
            defaultValue={'// 请在这里输入您的代码'} // 编辑器的默认值
            value={value}
            className={'codeEdit'}
        />
    )
}
