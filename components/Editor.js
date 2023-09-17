import React, {useEffect, useImperativeHandle, useRef} from "react";
import Editor from "@monaco-editor/react";

function isMemberFunction({match,editor,keyword}) {

    const lineContent = editor.getModel().getLineContent(
        match.range.startLineNumber
    )
    return lineContent.includes('{')
}

let oldDecorations = []

const EditorComponent = (props,ref)=>{
    const {code,onExplainClick = ()=>{},codeType} = props
    const selectCodeRef = useRef()
    const editorRef = useRef()

    const scrollToDef = ()=>{
        if(code.type === 'class'){
            const {current: editor} = editorRef
            const keyword = code.paths.nodePath.node.key.name
            const matches = editor.getModel().findMatches(keyword, false, false, false, null, false);
            for (let i = 0; i < matches.length; i++) {
                const match = matches[i];

                // 如果是一个成员函数，就执行后续操作
                if (isMemberFunction({match,editor,keyword})) {
                    // 获取关键字所在的行号和列号
                    const lineNumber = match.range.startLineNumber;
                    const column = match.range.startColumn;

                    console.log('lineNumber',lineNumber);

                    // 滚动到关键字所在的行，并让它居中显示
                    editor.revealLineInCenter(lineNumber);

                    // 给关键字添加样式，比如背景色为黄色
                    const decoration = {
                        range: new monaco.Range(lineNumber, column, lineNumber, column + keyword.length),
                        options: {
                            inlineClassName: 'myInlineDecoration'
                        }
                    };

                    oldDecorations = editor.deltaDecorations(oldDecorations, [decoration]);

                    // 跳出循环，只处理第一个符合条件的关键字
                    break;
                }
            }
        }
    }

    const handleEditorDidMount = (editor, monaco)=>{
        editorRef.current = editor
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
        })

    }
    useImperativeHandle(ref,()=>{
        return {
            scrollToDef
        }
    })
    useEffect(() => {
        const {current: editor} = editorRef
        if(editor && code.value){
            editor.revealLineInCenter(1)
        }
    }, [code.value]);
    return (
        <Editor
            width={'100%'}
            height={'60%'}
            theme="vs-dark"
            defaultLanguage="javascript" // 编辑器的默认语言
            defaultValue={'// 点击svg图选择节点'} // 编辑器的默认值
            value={code.value}
            className={'codeEdit'}
            onMount={handleEditorDidMount}
        />
    )
}
export default React.forwardRef(EditorComponent)
