import Whether from "@/components/Whether";
import {DownlandOutline} from 'antd-mobile-icons'
import Messages from "@/components/Messages";
import TextareaAutosize from 'react-textarea-autosize';
import {useRef, useState,forwardRef,useImperativeHandle} from "react";
import {ChatOpenAI} from "langchain/chat_models/openai";
import {BufferWindowMemory } from "langchain/memory";
import {
    PromptTemplate,
    SystemMessagePromptTemplate,
    ChatPromptTemplate,
    HumanMessagePromptTemplate
} from "langchain/prompts";
import {useMemoizedFn} from "ahooks/lib";
import {ConversationChain,LLMChain} from "langchain/chains";

const memory = new BufferWindowMemory({ k: 6 });

const systemMessage = SystemMessagePromptTemplate.fromTemplate("你是一个能够处理javascript代码的助手。");
const humanMessage = HumanMessagePromptTemplate.fromTemplate("{code}");
const chatPrompt = ChatPromptTemplate.fromPromptMessages([systemMessage, humanMessage]);

const model = new ChatOpenAI({
    modelName:'gpt-3.5-turbo-0125',
    temperature: 0.7,
    frequency_penalty: 0.2,
    presence_penalty: 0.2,
    openAIApiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY
},{
    baseURL: process.env.NEXT_PUBLIC_OPENAI_BASEURL
});
const chain = new LLMChain({ llm: model, memory, prompt: chatPrompt });

const Chat = (props,ref)=>{
    const messagesEndRef = useRef()
    const [typing,setTyping] = useState(false)

    const [aiMsgs,setAiMsgs] = useState([])
    const [humanMsgs, setHumanMsgs] = useState([])

    const onKeyDown = useMemoizedFn((e)=>{
        if(e.keyCode === 13) send(e.target.value)
    })

    const signalRef = useRef()

    const send = useMemoizedFn((message)=>{
        signalRef.current = new AbortController()
        setHumanMsgs([
            ...humanMsgs,
            {
                msg: message,
                timestamp: Date.now()
            }
        ])
        setTyping(true)
        inputRef.current.value = ''
        chain.call({
            code: message,
            signal: signalRef.current?.signal
        }).then((res)=>{
            setAiMsgs([
                ...aiMsgs,
                {
                    msg: res.text,
                    timestamp: Date.now()
                }
            ])
        }).finally(()=>{
            setTyping(false)
        })
    })

    useImperativeHandle(ref,()=>{
        return {
            send,
            clear(){
                setAiMsgs([])
                setHumanMsgs([])
            }
        }
    })

    const inputRef = useRef()

    return (
        <div className="chatContainer">
            <div className="chatbox">
                <div className="top-bar">
                    <div className="name">
                        chat bot
                    </div>
                    <div style={{fontSize:'2em'}}>
                        <DownlandOutline/>
                    </div>
                </div>
                <div className="middle">
                    <div className="chat-container">
                        <Messages
                            aiMsgs={aiMsgs.map(item => { item && (item.type = 'ai'); return item })}
                            humanMsgs={humanMsgs.map(item => { item && (item.type = 'human'); return item })}
                            onReply={()=>{}}
                            isError={false}
                        />
                        <div className='chat-bottom-line' ref={messagesEndRef}></div>
                    </div>
                </div>
                <div className="bottom-bar">

                    <div className="chat">
                        <div className={'textareaContainer'}>
                            <TextareaAutosize ref={inputRef} onKeyDown={onKeyDown} placeholder={ typing ? 'loading...' : '请输入你的问题,shift+enter换行'} disabled={typing}/>
                            <Whether value={typing}>
                                <div className='cancel' onClick={()=>{
                                    signalRef.current?.abort()
                                }}>
                                    取消
                                </div>
                            </Whether>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default forwardRef(Chat)
