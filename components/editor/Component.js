import React, {useEffect, useImperativeHandle, useRef} from "react";
import Editor from "@monaco-editor/react";
import CustomModal from "@/components/CustomModal";
import {useImmer} from "use-immer";
import {FormControlLabel, RadioGroup, Radio} from "@mui/material";
import {createPortal} from 'react-dom'
import {useLocalStorage} from "@/utils/client";
import {aiConfig} from "@/components/chat/config";
import {emitter} from "@/mitt";

function isMemberFunction({match,editor,keyword}) {

    const lineContent = editor.getModel().getLineContent(
        match.range.startLineNumber
    )
    return lineContent.includes('{')
}

let oldDecorations = []


const EditorComponent = (props,ref)=>{
    const {code,onEditorAction = ()=>{},codeType} = props
    const [cacheConfig, setCacheConfig] = useLocalStorage('chat_config', aiConfig[0])
    const aiModalRef = useRef()
    const selectConfig = aiConfig.find(config=>config.type === cacheConfig.type) || aiConfig[0]
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
    const onActionRun = ({editor, cb=()=>{}})=>{
        const selection = editor.getSelection();
        const selectedCode = editor.getModel().getValueInRange(selection)

        if(!selectedCode) return null
        selectCodeRef.current = selectedCode
        cb(selectedCode)
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
                onActionRun({
                    editor,
                    cb(code){
                        onEditorAction({
                            type:'explain',
                            code
                        })
                    }
                })

            },
        });
        editor.addAction({
            // 动作的唯一标识符
            id: "simplify code",
            // 动作在菜单中显示的文本
            label: "simplify code",
            // 动作在菜单中显示的图标
            contextMenuGroupId: "navigation",
            // 动作执行时调用的函数
            run: async function (editor) {
                onActionRun({
                    editor,
                    cb(code){
                        onEditorAction({
                            type:'simplify',
                            code
                        })
                    }
                })

            },
        });

        editor.addAction({
            // 动作的唯一标识符
            id: "comment code",
            // 动作在菜单中显示的文本
            label: "comment code",
            // 动作在菜单中显示的图标
            contextMenuGroupId: "navigation",
            // 动作执行时调用的函数
            run: async function (editor) {
                onActionRun({
                    editor,
                    cb(code){
                        onEditorAction({
                            type:'comment',
                            code
                        })
                    }
                })

            },
        });

        editor.addAction({
            id: "choose ai engine",
            // 动作在菜单中显示的文本
            label: "choose ai engine",
            // 动作在菜单中显示的图标
            contextMenuGroupId: "navigation",
            run(){
                aiModalRef.current.show()
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
    useEffect(() => {
        props.onAiConfigChange?.(cacheConfig)
    }, [cacheConfig]);

    return (
        <>
            <Editor
                width={'100%'}
                height={'100%'}
                theme="vs-dark"
                defaultLanguage="javascript" // 编辑器的默认语言
                defaultValue={'// 点击svg图选择节点'} // 编辑器的默认值
                value={code.value}
                className={'codeEdit'}
                onMount={handleEditorDidMount}
            />
            {
                createPortal(
                    <CustomModal
                        ref={aiModalRef}
                        onRequestClose={()=>{
                            aiModalRef.current.hide()
                        }}
                    >
                        <RadioGroup
                            aria-label="options"
                            name="options"
                            value={selectConfig.type}
                            onChange={e=>{
                                const type = e.target.value
                                const newConfig = aiConfig.find(config=>config.type === type) || aiConfig[0]
                                setCacheConfig(newConfig)
                            }}
                        >
                            {
                                aiConfig.map((config)=>{
                                    return (
                                        <FormControlLabel key={config.type} value={config.type} control={<Radio />} label={config.label} />
                                    )
                                })
                            }
                        </RadioGroup>
                    </CustomModal>,
                    document.body
                )
            }
        </>
    )
}
export default React.forwardRef(EditorComponent)
