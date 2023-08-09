import {useEffect, useRef, useState} from "react";
import ReactDOM from "react-dom";
import {
    astCache,
    dotCache,
    generateCode, generateDotStr,
    genreateDotStr,
    genreateDotStrByAst,
    genreateDotStrByCode, genreateSelectedDotStrByAst,
} from "@/pages/cf";
import Graphviz from "@/components/Graphviz";
import CodeEditor from '@/components/Editor'
import CustomPopper from "@/components/Popper";
import Whether from "@/components/Whether";
import BeatLoader from "react-spinners/BeatLoader";
import {useImmer} from "use-immer";
import ReactMarkdown from "react-markdown";

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
      additional:{}
  })
    const renderDot = ({dot,nodes,dotJson})=>{
        console.log('dot',dot);
        setDot(dot)
        dotRef.current = {
            ...dotRef.current,
            dotJson,
            nodes
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
    }).then(({dot,nodes,dotJson,selectNode})=>{
      setCode(
          generateCode(selectNode.path)
      )
      renderDot({dot,nodes,dotJson})
    })
    return ()=>{
      controller.abort()
      promise = null
    }
  }, []);

  const onCodeExplain = (promise)=>{
    setExplain(draft => {
        draft.loading = true
    })
    promise.then((text)=>{
        setExplain(draft=>{
            draft.text = text
            draft.loading = false
        })
    })
  }

  const popperRef = useRef()
  return (
      <div className={'codeViewContainer'}>
        <Whether value={dot}>
          <Graphviz
              className={'codeSvg'}
              dot={dot}
              popper={popperRef}
              onNodeClick={({id,text})=>{
                  const targetNode = dotRef.current.nodes[text]
                  setCode(
                      generateCode(
                          targetNode.path
                      )
                  )
                  const {dot} = generateDotStr({
                      ast: astCache[filename],
                      selectNodeText: text,
                      entryFuncName:'loader'
                  })
                  setDot(dot)
              }}
          />
        </Whether>
        <div className={'codeView'}>
          <CodeEditor value={code} onCodeExplain={onCodeExplain}/>
          <div className={'codeExplainText'}>
              <ReactMarkdown>
                  {explain.text}
              </ReactMarkdown>
              <BeatLoader
                  loading={explain.loading}
                  size={50}
                  cssOverride={{
                    position:'absolute',
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%,-50%)'
                  }}
                  aria-label="Loading Spinner"
                  data-testid="loader"
              />
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

