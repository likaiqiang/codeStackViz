import React, {useRef} from "react";
import Editor from "@monaco-editor/react";

export default (props)=>{
    const {value,onExplainClick = ()=>{}} = props
    const selectCodeRef = useRef()
    const handleEditorDidMount = (editor, monaco)=>{
        editor.addAction({
            // 动作的唯一标识符
            id: "explain code",
            // 动作在菜单中显示的文本
            label: "explain code",
            // 动作在菜单中显示的图标
            contextMenuGroupId: "navigation",
            // 动作执行时调用的函数
            run: async function (editor) {
                const selection = editor.getSelection();
                const selectedCode = editor.getModel().getValueInRange(selection)

                if(!selectedCode) return null
                selectCodeRef.current = selectedCode

                onExplainClick(selectedCode)

            },
        });
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_X, function() {
            // 执行你的代码
            if(selectCodeRef.current){
                onExplainClick(selectCodeRef.current)
            }
        });
    }
    return (
        <Editor
            width={'100%'}
            height={'60%'}
            theme="vs-dark"
            defaultLanguage="javascript" // 编辑器的默认语言
            defaultValue={'// 点击svg图选择节点'} // 编辑器的默认值
            value={value}
            className={'codeEdit'}
            onMount={handleEditorDidMount}
        />
    )
}
