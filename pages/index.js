import {useEffect, useRef, useState} from "react";
import ReactDOM from "react-dom";
import {
    filterNodesByEntry,
    generateCode,
    genreateDotStrByCode, parseDotJson,
} from "@/pages/cf";
import Graphviz from "@/components/Graphviz";
import CodeEditor from '@/components/Editor'
import CustomPopper from "@/components/Popper";
import Whether from "@/components/Whether";
import {useImmer} from "use-immer";
import Chat from "@/components/Chat";
import hotkeys from 'hotkeys-js';
import 'bootstrap-icons/font/bootstrap-icons.min.css'

export default function Home() {

    const [dot, setDot] = useState(null)
    const [code, setCode] = useState('')
    const [explain, setExplain] = useImmer({
        loading: false,
        text: ''
    })
    const [history, setHistory] = useImmer({
        list: [],
        index: -1
    })
    const push = (id) => {
        setHistory(draft => {
            draft.index = draft.index + 1
            draft.list = [
                ...draft.list.slice(0, draft.index),
                id
            ]
        })
    }
    // const pop = ()=>{
    //     const lastId = history.list[history.list.length - 1]
    //     setHistory(draft => {
    //         draft.index = draft.index -1
    //         draft.list = draft.list.slice(0,draft.index)
    //     })
    //     return lastId
    // }
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

    const dotRef = useRef({
        nodes: {},
        dotJson: {},
        filteredDotJson: {},
        importedModules: {},
        funcDecVertexs: [],
        entryFuncId: ''
    })
    const selectCodeRef = useRef('')
    const renderDot = ({dot, nodes, dotJson, filteredDotJson, importedModules, funcDecVertexs, entryFuncId}) => {
        setDot(dot)
        dotRef.current = {
            ...dotRef.current,
            dotJson,
            nodes,
            importedModules,
            funcDecVertexs,
            entryFuncId,
            filteredDotJson
        }
    }
    const filename = 'babel-loader'
    useEffect(() => {
        const controller = new AbortController()
        let promise = fetch(`/api/get_bundle?filename=${filename}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            signal: controller.signal
        }).then(res => res.json()).then(({bundle}) => {
            return genreateDotStrByCode({code: bundle, filename, entryFuncName: 'loader'})
        }).then(({dot, nodes, dotJson, filteredDotJson, importedModules, entryFuncId, selectNode}) => {
            setCode(
                generateCode(selectNode.path)
            )
            setHistory(draft => {
                draft.list.push(selectNode.id)
                draft.index = draft.index + 1
            })
            renderDot({
                dot,
                nodes,
                dotJson,
                selectNode,
                filteredDotJson,
                importedModules,
                entryFuncId
            })
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

    const onFilterDotJson = ({entryFuncId}) => {
        const {current: dotCurrent} = dotRef
        const filteredDotJson = filterNodesByEntry({
            dotJson: dotCurrent.dotJson,
            entryFuncId
        })
        const {dot} = parseDotJson({
            filteredDotJson,
            dotJson: dotCurrent.dotJson,
            entryFuncId,
            selectNodeId: entryFuncId
        })
        setDot(dot)
    }

    const popperRef = useRef()
    const chatRef = useRef()
    return (
        <div className={'codeViewContainer'}>
            <Whether value={dot}>
                <Graphviz
                    className={'codeSvg'}
                    dot={dot}
                    popper={popperRef}
                    history={history}
                    onArrowClick={({type}) => {
                        let id = ''
                        if (type === 'back') {
                            id = back()
                        }
                        if (type === 'forward') {
                            id = forward()
                        }
                        onFilterDotJson({
                            entryFuncId: id
                        })
                    }}
                    onNodeClick={({id}) => {
                        const {current: dotCurrent} = dotRef
                        const targetNode = dotCurrent.nodes[id]
                        const code = (targetNode.npm ? generateCode(targetNode.npmPath) : '') + '\n' + generateCode(targetNode.path)
                        setCode(code)
                        const {dot} = parseDotJson({
                            filteredDotJson: dotCurrent.filteredDotJson,
                            dotJson: dotCurrent.dotJson,
                            selectNodeId: id,
                            entryFuncId: dotCurrent.entryFuncId
                        })
                        setDot(dot)
                    }}
                    onNodeDbClick={({id}) => {
                        onFilterDotJson({entryFuncId: id})
                        push(id)
                    }}
                />
            </Whether>
            <div className={'codeView'}>
                <CodeEditor value={code} onExplainClick={onExplainClick}/>
                <div className={'codeExplainText'}>
                    <Chat ref={chatRef}/>
                </div>
            </div>
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

