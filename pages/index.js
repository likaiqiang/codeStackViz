import {useEffect, useRef, useState} from "react";
import ReactDOM from "react-dom";
import {
    astCache,
    dotCache,
    generateCode, generateDotStr,
    genreateDotStr,
    genreateDotStrByAst,
    genreateDotStrByCode, genreateSelectedDotStrByAst, parseDotJson,
} from "@/pages/cf";
import Graphviz from "@/components/Graphviz";
import CodeEditor from '@/components/Editor'
import CustomPopper from "@/components/Popper";
import Whether from "@/components/Whether";
import {useImmer} from "use-immer";
import Chat from "@/components/Chat";
import hotkeys from 'hotkeys-js';
export default function Home() {

  const [dot,setDot] = useState(null)
  const [code,setCode] = useState('')
  const [explain,setExplain] = useImmer({
      loading: false,
      text:''
  })
  const dotRef = useRef({
      nodes:{},
      dotJson:{},
      filteredDotJson:{},
      importedModules:{},
      funcDecVertexs:[],
      entryFuncId:''
  })
    const selectCodeRef = useRef('')
    const renderDot = ({dot,nodes,dotJson,filteredDotJson,importedModules,funcDecVertexs,entryFuncId})=>{
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
    let promise = fetch(`/api/get_bundle?filename=${filename}`,{
      method:'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal
    }).then(res=>res.json()).then(({bundle})=>{
      return genreateDotStrByCode({code:bundle,filename, entryFuncName:'loader'})
    }).then(({dot,nodes,dotJson,filteredDotJson,importedModules,entryFuncId,selectNode})=>{
      setCode(
          generateCode(selectNode.path)
      )
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
    return ()=>{
      controller.abort()
      promise = null
    }
  }, []);

    useEffect(() => {
        hotkeys('ctrl+x',()=>{
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
        })
    }, []);

  const onExplainClick = (code)=>{
      const {current: chat} = chatRef
      selectCodeRef.current = code
      chat.send(
          "explain the following JavaScript code: \n" +
           "\`\`\`javascript \n" +
           code + '\n' +
           "\`\`\`"
      )
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
              onNodeClick={({id})=>{
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

export function getServerSideProps(){
  return {
    props:{

    }
  }
}

