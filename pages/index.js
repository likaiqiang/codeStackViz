import {useEffect, useRef, useState} from "react";
import {
    generateDotStr,
    getConfigByCode,
} from "cg";
import {filterJsonByEntry, generateSplicedCode} from '@/cg/common'
import Graphviz from "@/components/Graphviz";
import CodeEditor from '@/components/Editor'
import CustomPopper from "@/components/Popper";
import {useImmer} from "use-immer";
import Chat from "@/components/Chat";
import hotkeys from 'hotkeys-js';
import 'bootstrap-icons/font/bootstrap-icons.min.css'
import Settings from "@/components/Settings";
import {getRecommendBundles, getStatus} from "@/api";
import ReactDOM from "react-dom";
import PageContext from '@/context/index'
import CustomModal from "@/components/CustomModal";
import Drawer from '@mui/material/Drawer';
import { makeStyles } from '@material-ui/core/styles';
const useStyles = makeStyles({ root: { width: '25%', }, });


export default function Home(props) {

    const [code, setCode] = useImmer({
        value:'',
        type:'',
        paths:{}
    })
    const [tasks,setTasks] = useState([])
    const [recommend, setRecommend] = useState([])

    const drawerClasses = useStyles();

    const [history, setHistory] = useImmer({
        list: [],
        index: -1
    })
    const [chatDrawer,setChatDrawer] = useImmer({
        isOpen: false,
        onOpen: ()=>{}
    })
    const modalRef = useRef()

    const graphvizRef = useRef()
    const push = (id) => {
        setHistory(draft => {
            draft.index = draft.index + 1
            draft.list = [
                ...draft.list.slice(0, draft.index),
                id
            ]
        })
    }

    const clear = ()=>{
        setHistory(draft => {
            draft.index = -1
            draft.list = []
        })
    }

    const back = () => {
        const id = history.list[history.index - 1]
        setHistory(draft => {
            draft.index = Math.max(draft.index - 1, 0)
        })
        return id
    }
    const forward = () => {
        const id = history.list[history.index + 1]
        setHistory(draft => {
            draft.index = Math.min(draft.index + 1, draft.list.length - 1)
        })
        return id
    }

    const onCode = (code, beforeSend=()=>{})=>{
        const {current: chat} = chatRef
        if (code) {
            setChatDrawer(draft => {
                draft.isOpen = true
            })
            chat.send(beforeSend(code))
        }
    }

    const explainCode = (code) => {
        onCode(code,()=>{
            return "/code_explain \n" +
                "\`\`\`javascript \n" +
                code + '\n' +
                "\`\`\`"
        })
    }
    const simplifyCode= (code)=>{
        onCode(code,()=>{
            return "/code_simplify \n" +
                "\`\`\`javascript \n" +
                code + '\n' +
                "\`\`\`"
        })

    }
    const commentCode = code=>{
        onCode(code,()=>{
            return "/code_comment \n" +
                "\`\`\`javascript \n" +
                code + '\n' +
                "\`\`\`"
        })
    }

    const configRef = useRef()
    const codeEditorRef = useRef()

    const getBatchConfigByCode = ({code})=>{
        return configRef.current = getConfigByCode({code})
    }

    useEffect(() => {
        let promise = Promise.all([
            getRecommendBundles().then(res=>{
                setRecommend(res.files)
            }),
            getStatus({}).then(res=>{
                console.log('res.files',res.files);
                setTasks(res.files)
            })
        ]).then(()=>{
            modalRef.current.show()
        })
        return ()=>{
            promise = null
        }
    }, []);

    useEffect(() => {
        hotkeys('esc', back)
    }, []);

    const onSelectNodeCode = (id) => {
        const {current: config} = configRef
        const targetNode = config.nodes[id]
        const splicedCode = generateSplicedCode(targetNode)
        setCode(draft => {
            for(let key in splicedCode){
                draft[key] = splicedCode[key]
            }
        })
        setTimeout(()=>{
            codeEditorRef.current.scrollToDef(splicedCode)
        },300)
    }

    const renderFiltedSvg = ({entryFuncId}) => {
        const {current: config} = configRef
        const filteredDotJson = filterJsonByEntry({
            dotJson: config.dotJson,
            entryFuncId
        })

        const {dot, nodes} = generateDotStr({
            filteredDotJson
        })

        const {renderSvg} = graphvizRef.current

        configRef.current = {
            ...configRef.current,
            dot,
            nodes
        }
        return renderSvg(dot).then(() => ({dot, nodes}))
    }
    const renderExpDot = ()=> {
        const {clear} = graphvizRef.current
        clear()
    }
    const popperRef = useRef()
    const chatRef = useRef()
    const winWidth = document.documentElement.clientWidth
    return (
        <div className={'codeViewContainer'}>
            <PageContext.Provider value={{
                renderFiltedSvg,
                getBatchConfigByCode,
                push,
                clear,
                setCode,
                renderExpDot
            }}>
                <Graphviz
                    className={'codeSvg'}
                    popper={popperRef}
                    history={history}
                    ref={graphvizRef}
                    config={configRef.current}
                    onArrowClick={({type}) => {
                        let id = ''
                        if (type === 'back') {
                            id = back()
                        }
                        if (type === 'forward') {
                            id = forward()
                        }
                        renderFiltedSvg({
                            entryFuncId: id
                        })
                    }}
                    onNodeClick={(node) => {
                        const id = node.getAttribute("id");
                        onSelectNodeCode(id)
                    }}
                    onContextMenuItemClick={(node) => {
                        const id = node.getAttribute("id");
                        renderFiltedSvg({
                            entryFuncId: id
                        }).then(() => {
                            push(id)
                        })
                    }}
                    onSettingClick={() => {
                        modalRef.current.show()
                    }}
                />
                <div className={'codeView'}>
                    <CodeEditor
                        ref={codeEditorRef}
                        code={code}
                        onEditorAction={({type,code})=>{
                            if(type === 'explain'){
                                explainCode(code)
                            }
                            if(type === 'simplify'){
                                simplifyCode(code)
                            }
                            if(type === 'comment'){
                                commentCode(code)
                            }
                        }}
                    />
                    <i className="bi bi-chat-dots chat-icon" onClick={()=>{
                        setChatDrawer(draft => {
                            draft.isOpen = true
                        })
                    }}/>
                </div>
                {
                    ReactDOM.createPortal(
                        <CustomModal
                            ref={modalRef}
                            onRequestClose={()=>{
                                modalRef.current.hide()
                            }}

                        >
                            <Settings
                                list={recommend.concat(tasks)}
                                onRefresh={()=>{
                                    getStatus({}).then(res=>{
                                        const {files} = res
                                        setTasks(files)
                                    })
                                }}
                            />
                        </CustomModal>,
                        document.body
                    )
                }
                {
                    ReactDOM.createPortal(
                        <CustomPopper ref={popperRef}/>,
                        document.body
                    )
                }
                {
                    ReactDOM.createPortal(
                        <Drawer
                            anchor={'right'}
                            open={chatDrawer.isOpen}
                            classes={drawerClasses}
                            onClose={()=>{
                                setChatDrawer(draft => {
                                    draft.isOpen = false
                                })
                            }}
                            ModalProps={{
                                keepMounted: true
                            }}
                        >
                            <div className={'codeExplainText'} style={{width: winWidth / 4 +  'px'}}>
                                <Chat ref={chatRef}/>
                            </div>
                        </Drawer>,
                        document.body
                    )
                }
            </PageContext.Provider>
        </div>
    )
}


