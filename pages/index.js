import {useEffect, useRef, useState} from "react";
import ReactDOM from "react-dom";
import {selectAll,select} from "d3-selection";
import {
    cache,
    filterJsonByEntry,
    generateCode, generateDotStr,
    genreateDotStrByCode, getConfigByCode, parseDotJson,
} from "@/pages/cg";
import Graphviz from "@/components/Graphviz";
import CodeEditor from '@/components/Editor'
import CustomPopper from "@/components/Popper";
import Whether from "@/components/Whether";
import {useImmer} from "use-immer";
import Chat from "@/components/Chat";
import hotkeys from 'hotkeys-js';
import 'bootstrap-icons/font/bootstrap-icons.min.css'
import Modal from 'react-modal';
import DataFor from "@/components/DataFor";
import {useLocalStorage} from "@/pages/utils";

function Settings(props){
    const {list,activeIndex,onItemClick=()=>{}} = props
    return (
        <div className={'entryFuncList'}>
            <div>请选择入口函数</div>
            <DataFor list={list} key={(item)=> item.id}>
                {
                    (item,index)=>{
                        return (
                            <div className={['entryFuncItem', activeIndex === index ? 'active' : ''].join(' ')} onClick={()=>{
                                onItemClick({
                                    id: list[index].id,
                                    index
                                })

                            }}>
                                <div>{item.name}</div>
                            </div>
                        )
                    }
                }
            </DataFor>
        </div>
    )
}
const filename = 'babel-parser'
export default function Home() {

    const [dot, setDot] = useState(null)
    const [code, setCode] = useState('')

    const [cacheEntry,setCacheEntry] = useLocalStorage('entryFuncName',{
        [filename]:''
    })

    const [history, setHistory] = useImmer({
        list: [],
        index: -1
    })
    const [modal,setModal] = useImmer({
        isOpen: false,
        index: -1,
        list: []
    })
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

    const explainCode = ()=>{
        const {current: chat} = chatRef
        const {current: code} = selectCodeRef
        if(code){
            chat.send(
                "explain the following JavaScript code: \n" +
                "\`\`\`javascript \n" +
                code + '\n' +
                "\`\`\`"
            )
        }
    }

    // const dotRef = useRef({
    //     nodes: {},
    //     filteredDotJson: {},
    //     importedModules: {},
    //     funcDecVertexs: [],
    //     dotJson:{}
    // })
    const configRef = useRef()
    const selectCodeRef = useRef('')

    useEffect(() => {
        const controller = new AbortController()
        let promise = fetch(`/api/get_bundle?filename=${filename}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            signal: controller.signal
        }).then(res => res.json()).then(({bundle}) => {
            return getConfigByCode({code: bundle, filename})
        }).then((config) => {
            console.log('config',config);
            configRef.current = config

            const {exportVertexs} = config
            if(cacheEntry[filename]){
                renderPageSvg({
                    entryFuncId: cacheEntry[filename]
                })
                setHistory(draft => {
                    draft.list.push(cacheEntry[filename])
                    draft.index = draft.index + 1
                })
                setModal(draft => {
                    draft.list = exportVertexs
                })
            }
            else {
                setModal(draft => {
                    draft.isOpen = true
                    draft.list = exportVertexs
                })
            }
        })
        return () => {
            controller.abort()
            promise = null
        }
    }, []);

    useEffect(() => {
        hotkeys('ctrl+x, cmd+x',explainCode)
        hotkeys('esc',back)

    }, []);

    const onExplainClick = (code) => {
        selectCodeRef.current = code
        explainCode()
    }

    const onFilterDotJson = ({entryFuncId,onGraphvizRenderEnd = ()=>{}}) => {
        const {current: config} = configRef
        const filteredDotJson = filterJsonByEntry({
            dotJson: config.dotJson,
            entryFuncId
        })
        const {dot} = generateDotStr({
            filteredDotJson,
            selectNodeId: entryFuncId
        })
        const {renderSvg} = graphvizRef.current
        renderSvg(dot).then(()=>{
            onGraphvizRenderEnd()
        })
    }

    const onSelectNodeCode = (id)=>{
        const {current: config} = configRef
        const targetNode = config.nodes[id]
        const code = (targetNode.npm ? generateCode(targetNode.npmPath) : '') + '\n' + generateCode(targetNode.path)
        setCode(code)
    }
    const onCloseModal = ()=>{
        if(modal.index > -1) setModal(draft => {
            draft.isOpen = false
        })
        else {
            // keeping
        }
    }

    const renderPageSvg = ({entryFuncId,renderMaxLevel = 3})=>{
        const {current: config} = configRef
        let filteredDotJson = filterJsonByEntry({
            dotJson: config.dotJson,
            entryFuncId
        })
        console.log('filteredDotJson.maxLevel',filteredDotJson.maxLevel);
        filteredDotJson = {
            ...filteredDotJson,
            statements: filteredDotJson.statements.filter(edge=>edge.level <= Math.min(renderMaxLevel, filteredDotJson.maxLevel))
        }

        const {dot,nodes} = generateDotStr({
            filteredDotJson
        })

        const {renderSvg} = graphvizRef.current

        configRef.current = {
            ...configRef.current,
            dot,
            nodes
        }

        return renderSvg(dot).then(()=>Promise.resolve({dot,nodes}))
    }

    const popperRef = useRef()
    const chatRef = useRef()
    return (
        <div className={'codeViewContainer'}>
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
                    renderPageSvg({
                        entryFuncId: id
                    })
                }}
                onNodeClick={(node) => {
                    const id = node.getAttribute("id");
                    onSelectNodeCode(id)
                }}
                onContextMenuItemClick={(node) => {
                    const id = node.getAttribute("id");
                    renderPageSvg({
                        entryFuncId: id
                    }).then(()=>{
                        push(id)
                    })
                }}
                onSettingClick={()=>{
                    setModal(draft => {
                        draft.isOpen = true
                    })
                }}
            />
            <div className={'codeView'}>
                <CodeEditor value={code} onExplainClick={onExplainClick}/>
                <div className={'codeExplainText'}>
                    <Chat ref={chatRef}/>
                </div>
            </div>
            <Modal
                isOpen={modal.isOpen}
                ariaHideApp={false}
                style={{
                    content:{
                        top: '50%',
                        left: '50%',
                        right: 'auto',
                        bottom: 'auto',
                        marginRight: '-50%',
                        transform: 'translate(-50%, -50%)',
                        width: "30%"
                    },
                    overlay: {
                        backgroundColor: 'rgba(0,0,0,.4)'
                    }
                }}
                shouldCloseOnOverlayClick={true}
                onRequestClose={onCloseModal}
            >
                <Settings list={modal.list} activeIndex={modal.index} onItemClick={({id,index})=>{
                    renderPageSvg({
                        entryFuncId: id
                    }).then(()=>{
                        setModal(draft => {
                            draft.index = index
                            draft.isOpen = false
                        })
                        setHistory(draft => {
                            draft.list = [id]
                            draft.index = 0
                        })
                        setCacheEntry({
                            ...cacheEntry,
                            [filename]: id
                        })
                    })
                }}/>
            </Modal>
            {
                ReactDOM.createPortal(
                    <CustomPopper ref={popperRef}/>,
                    document.body
                )
            }
        </div>
    )
}

export function getServerSideProps() {
    return {
        props: {}
    }
}

