import {useEffect, useRef, useState} from "react";
import {
    generateDotStr,
    getConfigByCode,
} from "cg";
import {filterJsonByEntry, generateSplicedCode} from '@/cg/common'
import Graphviz from "@/components/Graphviz";
import CodeEditor from '@/components/Editor'
import CustomPopper from "@/components/Popper";
import Whether from "@/components/Whether";
import {useImmer} from "use-immer";
import Chat from "@/components/Chat";
import hotkeys from 'hotkeys-js';
import 'bootstrap-icons/font/bootstrap-icons.min.css'
import {useLocalStorage,renderMaxLevel as defaultRenderMaxLevel} from "@/utils/client";
import Settings from "@/components/Settings";
import {getBundle, getRecommendBundles, getStatus} from "@/api";
import ReactDOM from "react-dom";
import PageContext from '@/context/index'
import CustomModal from "@/components/CustomModal";

const filename = 'babel-parser'

const generateCache = ({owner, repo, key, name = '', subPath = '', entryFuncId}) => {
    return `${key}@${encodeURIComponent(owner)}@${encodeURIComponent(repo)}` + (name ? `@${encodeURIComponent(name)}` : '') + (subPath ? `@${encodeURIComponent(subPath)}` : '') + `@${entryFuncId}`
}

const parseCacheStr = (str) => {
    const [owner, repo, name, subPath, entryFuncId] = str.split('@').map(s => decodeURIComponent(s))
    return {
        owner,
        repo,
        name: name || '',
        subPath,
        entryFuncId
    }
}


export default function Home(props) {

    const [code, setCode] = useState('')
    const [tasks,setTasks] = useState([])
    const [recommend, setRecommend] = useState([])

    const [history, setHistory] = useImmer({
        list: [],
        index: -1
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

    const explainCode = (code) => {
        const {current: chat} = chatRef
        if (code) {
            chat.send(
                "解释以下JavaScript代码: \n" +
                "\`\`\`javascript \n" +
                code + '\n' +
                "\`\`\`"
            )
        }
    }

    const configRef = useRef()

    const getBatchConfigByCode = ({code})=>{
        return configRef.current = getConfigByCode({code})
    }

    useEffect(() => {
        let promise = Promise.all([
            getRecommendBundles().then(res=>{
                setRecommend(res.files)
            }),
            getStatus({}).then(res=>{
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
        const code = generateSplicedCode(targetNode)
        setCode(code)
    }

    const renderFiltedSvg = ({entryFuncId, renderMaxLevel = defaultRenderMaxLevel}) => {
        const {current: config} = configRef
        let filteredDotJson = filterJsonByEntry({
            dotJson: config.dotJson,
            entryFuncId
        })
        filteredDotJson = {
            ...filteredDotJson,
            statements: filteredDotJson.statements.filter(edge => edge.level <= Math.min(renderMaxLevel, filteredDotJson.maxLevel))
        }

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

    const popperRef = useRef()
    const chatRef = useRef()
    return (
        <div className={'codeViewContainer'}>
            <PageContext.Provider value={{
                renderFiltedSvg,
                getBatchConfigByCode,
                push
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
                    <CodeEditor value={code} onExplainClick={explainCode}/>
                    <div className={'codeExplainText'}>
                        <Chat ref={chatRef}/>
                    </div>
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
                                list={tasks.concat(recommend)}
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
            </PageContext.Provider>
        </div>
    )
}


