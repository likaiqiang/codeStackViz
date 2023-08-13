import Whether, {Else, If} from "@/components/Whether";
import {PlayOutline, HeartOutline, LeftOutline, DownlandOutline} from 'antd-mobile-icons'
import Messages from "@/components/Messages";
import TextareaAutosize from 'react-textarea-autosize';
import {useRef, useState,forwardRef,useImperativeHandle} from "react";
import {ChatOpenAI} from "langchain/chat_models/openai";
import {ConversationSummaryMemory} from "langchain/memory";
import {PromptTemplate} from "langchain/prompts";
import {LLMChain} from "langchain";
import {useMemoizedFn} from "ahooks/lib";

const memory = new ConversationSummaryMemory({
    memoryKey: "chat_history",
    llm: new ChatOpenAI({ modelName: "gpt-3.5-turbo-16k", temperature: 0, openAIApiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY }),
});

const model = new ChatOpenAI({
    modelName:'gpt-3.5-turbo-16k',
    openAIApiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY
});
const prompt =
    PromptTemplate.fromTemplate(`The following is a friendly conversation between a human and an AI. The AI is talkative and provides lots of specific details from its context. If the AI does not know the answer to a question, it truthfully says it does not know.

  Current conversation:
  {chat_history}
  Human: {input}
  AI:`);
const chain = new LLMChain({ llm: model, prompt, memory });

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
        signalRef.current = new AbortController().signal
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
            input: message,
            signal: signalRef.current
        }).then(res=>{
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
            send
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
                        {/* <Input type="text" value={question} onChange={inputQuestion} onEnterPress={directChat} placeholder="开始提问吧..." enterkeyhint="done" maxLength={300} autoFocus clearable /> */}
                        {/*<TextArea antdProps={{*/}
                        {/*    placeholder:'开始提问吧...',*/}
                        {/*    value: question,*/}
                        {/*    onChange:inputQuestion,*/}
                        {/*    rows:1,*/}
                        {/*    maxLength:30000,*/}
                        {/*    autoSize:{ minRows: 1, maxRows: 20 },*/}
                        {/*    showCount: true,*/}
                        {/*    autoFocus: false*/}
                        {/*}} onKeyDown={onKeyDown}/>*/}
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
