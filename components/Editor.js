import React from "react";
import Editor from "@monaco-editor/react";
import { PromptTemplate } from "langchain/prompts";
import {OpenAI} from "langchain/llms/openai"

export default (props)=>{
    const {value,onCodeExplain = ()=>{}} = props
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

                const prompt = PromptTemplate.fromTemplate(`
                    解释以下JavaScript代码: 
                        \`\`\`javascript
                        {code}
                        \`\`\`
                `);
                try{
                    const llm = new OpenAI({
                        temperature:0.9,
                        modelName:'gpt-3.5-turbo-16k',
                        openAIApiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY
                    })

                    onCodeExplain(
                        prompt.format({
                            code: selectedCode
                        }).then(formattedPrompt=>{
                            return llm.call(formattedPrompt)
                        })
                    )
                } catch (e){
                    console.log(e);
                }

            },
        });
        // editor.updateOptions({
        //     contextmenu: false,
        // });
    }
    return (
        <Editor
            width={'50%'}
            height={'600px'}
            theme="vs-dark"
            defaultLanguage="javascript" // 编辑器的默认语言
            defaultValue={'// 请在这里输入您的代码'} // 编辑器的默认值
            value={value}
            className={'codeEdit'}
            onMount={handleEditorDidMount}
        />
    )
}
