import {useEffect, useRef, useState} from "react";
import ReactDOM from "react-dom";
import {
    generateDotStr,
    getConfigByCode,
} from "@/pages/cg";
import {filterJsonByEntry, generateSplicedCode} from './cg/common'
import Graphviz from "@/components/Graphviz";
import CodeEditor from '@/components/Editor'
import CustomPopper from "@/components/Popper";
import Whether from "@/components/Whether";
import {useImmer} from "use-immer";
import Chat from "@/components/Chat";
import hotkeys from 'hotkeys-js';
import 'bootstrap-icons/font/bootstrap-icons.min.css'
import Modal from 'react-modal';
import {useLocalStorage} from "@/pages/utils";
import Settings from "@/components/Settings";
import {getBundle, getRecommentBundles} from "@/api";

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


export default function Home() {

    const [code, setCode] = useState('')

    const [cacheEntry, setCacheEntry] = useLocalStorage('entryFuncName', '')

    const [history, setHistory] = useImmer({
        list: [],
        index: -1
    })
    const [modal, setModal] = useImmer({
        isOpen: false,
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
        // let promise = null
        // const controller = new AbortController()
        // if(cacheEntry){
        //     const repoConfig = parseCacheStr(cacheEntry)
        //
        //     promise = getBundle({params: repoConfig,signal: controller.signal}).then(res => res.json()).then(({bundle}) => {
        //         return getConfigByCode({code: bundle, filename: cacheEntry})
        //     }).then(config=>{
        //         console.log('config',config);
        //         configRef.current = config
        //         const {exportVertexs} = config
        //
        //         renderFiltedSvg({
        //             entryFuncId: repoConfig.entryFuncId
        //         })
        //         setHistory(draft => {
        //             draft.list.push(repoConfig.entryFuncId)
        //             draft.index = draft.index + 1
        //         })
        //     })
        // }
        // else{
        //     setModal(draft => {
        //         draft.isOpen = true
        //     })
        // }

        // return () => {
        //     controller.abort()
        //     promise = null
        // }

        getRecommentBundles().then(res=>{
            setModal(draft => {
                draft.list = res.files
                draft.isOpen = true
            })
        })

        // getBundle({}).then(({bundle})=>{
        //     const config = getConfigByCode({code:bundle})
        //     configRef.current = config
        //     const {exportVertexs} = config
        //     renderFiltedSvg({
        //         entryFuncId: exportVertexs[0].id
        //     })
        // })
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

    const renderFiltedSvg = ({entryFuncId, renderMaxLevel = 3}) => {
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
                    setModal(draft => {
                        draft.isOpen = true
                    })
                }}
            />
            <div className={'codeView'}>
                <CodeEditor value={code} onExplainClick={explainCode}/>
                <div className={'codeExplainText'}>
                    <Chat ref={chatRef}/>
                </div>
            </div>
            <Modal
                isOpen={modal.isOpen}
                ariaHideApp={false}
                style={{
                    content: {
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
                onRequestClose={()=>{
                    setModal(draft => {
                        draft.isOpen = false
                    })
                }}
            >
                <Settings
                    list={modal.list}
                    onItemClick={(bundleFile) => {

                        const {displayFunc = []} = getBatchConfigByCode({code: bundleFile})
                        let filtedDisplayFunc = displayFunc.filter(([vertex,dotJson])=>{
                            return dotJson.maxLevel > 3
                        })
                        if(filtedDisplayFunc.length === 0){
                            filtedDisplayFunc = displayFunc.filter(([_,dotJson])=>{
                                return dotJson.statements.length > 3
                            })
                        }

                        console.log('filtedDisplayFunc',filtedDisplayFunc);
                        // renderFiltedSvg({
                        //     entryFuncId: id
                        // }).then(() => {
                        //     setModal(draft => {
                        //         draft.index = index
                        //         draft.isOpen = false
                        //     })
                        //     setHistory(draft => {
                        //         draft.list = [id]
                        //         draft.index = 0
                        //     })
                        //     setCacheEntry({
                        //         ...cacheEntry,
                        //         [filename]: id
                        //     })
                        // })
                    }}
                    onBundle={config=>{
                        configRef.current = config
                        const {exportVertexs} = config
                        if(exportVertexs.length){
                            renderFiltedSvg({
                                entryFuncId: exportVertexs[0].id
                            })
                            setHistory(draft => {
                                draft.list.push(exportVertexs[0].id)
                                draft.index = draft.index + 1
                            })
                            setModal(draft => {
                                draft.isOpen = false
                            })
                        }
                    }}
                />
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

