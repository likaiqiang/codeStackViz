import Whether from "@/components/Whether";
import {DownlandOutline} from 'antd-mobile-icons'
import Messages from "@/components/Messages";
import TextareaAutosize from 'react-textarea-autosize';
import {useRef, useState, forwardRef, useImperativeHandle, useEffect} from "react";
import {useMemoizedFn} from "ahooks/lib";
import {chain as ChatGptChain} from './openai'
import {chain as ErnieChain} from './ernie'
import ReactDOM from "react-dom";
import {Snackbar} from "@mui/material";
import {useImmer} from "use-immer";


const Chat = (props,ref)=>{
    const messagesEndRef = useRef()
    const [typing,setTyping] = useState(false)
    const [aiMsgs,setAiMsgs] = useState([])
    const [humanMsgs, setHumanMsgs] = useState([])
    const [toast, setToast] = useImmer({
        isOpen: false,
        message: '',
        duration: 3000
    })

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
        const chain = props.aiConfig.type === 'chatgpt' ? ChatGptChain: ErnieChain

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
        }).catch(()=>{
            setToast(draft => {
                draft.isOpen = true
                draft.message = 'request failed, please try again'
            })
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
                        {props.aiConfig.label}
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
                                    setTyping(false)
                                }}>
                                    cancel
                                </div>
                            </Whether>
                        </div>
                    </div>
                </div>
            </div>
            {
                ReactDOM.createPortal(
                    <Snackbar
                        anchorOrigin={{
                            vertical: 'top',
                            horizontal: 'center',
                        }}
                        open={toast.isOpen}
                        onClose={()=>{
                            setToast(draft => {
                                draft.isOpen = false
                                draft.message = ''
                            })
                        }}
                        autoHideDuration={toast.duration || 3000}
                        message={toast.message}
                    />,
                    document.body
                )
            }
        </div>
    )
}

export default forwardRef(Chat)
