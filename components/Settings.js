import DataFor from "@/components/DataFor";
import { TextField,Button } from '@mui/material'
import TreeView from '@mui/lab/TreeView';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import TreeItem from '@mui/lab/TreeItem';
import {useCallback, useContext, useEffect, useRef, useState} from "react";
import Whether,{If,Else} from "@/components/Whether";
import {createDraft, finishDraft} from "immer"
import CircularProgress from '@mui/material/CircularProgress';
import { SnackbarProvider, useSnackbar } from 'notistack';
import {Autocomplete} from "@mui/material";
import {useMemoizedFn} from "ahooks/lib";
import {debounce} from 'lodash-es'
import Modal from 'react-modal';
import {getBundle, getStatus, submitTask} from "@/api";
import {} from 'react'
import {renderMaxLevel as defaultRenderMaxLevel, waitForPromise} from "@/pages/utils";
import {getConfigByCode} from "@/pages/cg";
import SelectEntryModal from "@/components/SelectEntryModal";
import ReactDOM from "react-dom";
import PageContext from "@/context";


const TreeCustomItem = ({list = [],parentIndex = []})=>{
    return (
        <DataFor list={list} key={item=>item.url}>
            {
                (item,index)=>{
                    return (
                        <Whether value={item.type === 'dir'}>
                            <If>
                                <TreeItem nodeId={item.url} label={item.name} data-index={[...parentIndex,index].join('-')} data-url={item.url}>
                                    <TreeCustomItem list={item.children} parentIndex={[...parentIndex,index]}/>
                                </TreeItem>
                            </If>
                            <Else>
                                <TreeItem nodeId={item.url} label={item.name} data-index={[...parentIndex,index].join('-')} data-url={item.url}></TreeItem>
                            </Else>
                        </Whether>
                    )
                }
            }
        </DataFor>
    )
}

export default (props)=>{
    const {list, onItemClick=()=>{}} = props
    const [treeData,setTreeData] = useState([])
    const [options,setOptions] = useState([])
    const [loading,setLoading] = useState(false)
    const [confirmLoading,setConfirmLoading] = useState(false)
    const githubRef = useRef({})
    const { enqueueSnackbar } = useSnackbar();

    const handleInputChange = useMemoizedFn((event, newInputValue)=>{
        if(newInputValue){
            onSearchGh({
                language: ['javascript', 'typescript'],
                keyword: newInputValue
            }).then()
        }
    })

    const debouncedHandleInputChange = useCallback(
        debounce(handleInputChange, 300),
        []
    );

    const fetchGHContent = ({owner,repo,name,subPath=''})=>{
        githubRef.current = {
            owner,
            repo,
            name,
            subPath
        }
        return fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${subPath}${name ? ('?ref=' + name) : ''}`).then(res=>res.json())
    }

    const onSearchGh = ({language=[],keyword})=>{
        const lg = language.map(lan=> `language:${lan}`).join('+')
        return fetch(`https://api.github.com/search/repositories?q=${lg}+${keyword}`).then(res=>res.json()).then((res)=>{
            if(res.message){
                enqueueSnackbar(res.message)
            }
            else{
                setOptions(res.items)
            }
        })
    }

    const getNodeDataByEvent = (event)=>{
        const nodeDataSet = event.target.closest('.MuiTreeItem-root').dataset;

        const indexArray = nodeDataSet.index.split('-')

        const draft = createDraft(treeData)
        return {
            draft,
            nodeDataSet,
            nodeData: indexArray.reduce((acc,item,i)=>{
                if(i === indexArray.length -1) return acc[parseInt(item)]
                return acc[parseInt(item)].children
            },draft)
        }

    }
    const selectEntryModalRef = useRef()
    const [displayFunc,setDisplayFunc] = useState([])
    const {getBatchConfigByCode} = useContext(PageContext)

    useEffect(()=>{
        getStatus({}).then(res=>{
            console.log('res',res)
        })
    },[])

    return (
        <SnackbarProvider maxSnack={3}>
            <div className={'libSearch'}>
                <div className={'libInput'}>
                    <Autocomplete
                        options={options}
                        noOptionsText={'no result'}
                        getOptionLabel={(option) => option.full_name}
                        onInputChange={debouncedHandleInputChange}
                        onChange={(e,value)=>{
                            if(value){
                                const {owner,name} = value
                                setLoading(true)
                                fetchGHContent({
                                    owner: owner.login,
                                    repo: name
                                }).then(res=>{
                                    setLoading(false)
                                    setTreeData(res)
                                })
                            }
                        }}
                        renderInput={(params) => <TextField {...params} label="please input a github repo keyword" />}
                    />
                </div>
                <Whether value={!treeData.length}>
                    <If>
                        <dl>
                            <DataFor list={list}>
                                {
                                    (item)=>{
                                        return (
                                            <>
                                                <dt>{`${item[0].owner}/${item[0].repo}`}</dt>
                                                <DataFor list={item[1]}>
                                                    {
                                                        (bundled)=>{
                                                          return (
                                                              <dd onClick={()=>{
                                                                  const {displayFunc} = getBatchConfigByCode({code: bundled.bundleFile})

                                                                  let filtedDisplayFunc = displayFunc.filter(([vertex,dotJson])=>{
                                                                      return dotJson.maxLevel > defaultRenderMaxLevel
                                                                  })
                                                                  if(filtedDisplayFunc.length === 0){
                                                                      filtedDisplayFunc = displayFunc.filter(([_,dotJson])=>{
                                                                          return dotJson.statements.length > defaultRenderMaxLevel
                                                                      })
                                                                  }

                                                                  selectEntryModalRef.current.show()
                                                                  setDisplayFunc(filtedDisplayFunc)

                                                              }}>
                                                                  <a href="javascript:;">{bundled.bundleFileName}</a>
                                                              </dd>
                                                          )
                                                        }
                                                    }
                                                </DataFor>
                                            </>
                                        )
                                    }
                                }
                            </DataFor>
                        </dl>
                    </If>
                    <Else>
                        <div className={'libFiles'}>
                            {/*defaultSelected*/}
                            <Whether value={!loading}>
                                <If>
                                    <Whether value={treeData.length}>
                                        <div>
                                            <TreeView
                                                aria-label="file system navigator"
                                                defaultCollapseIcon={<ExpandMoreIcon />}
                                                defaultExpandIcon={<ChevronRightIcon />}
                                                sx={{ height: 240, flexGrow: 1, maxWidth: 400, overflowY: 'auto' }}
                                                onNodeToggle={(event, nodeIds)=>{
                                                    const {nodeData,nodeDataSet,draft} = getNodeDataByEvent(event)
                                                    const isNodeExpand = nodeIds.includes(nodeDataSet.url)

                                                    if(isNodeExpand && (!nodeData.children || nodeData.children.length === 0)){
                                                        fetchGHContent({
                                                            ...githubRef.current,
                                                            subPath: nodeData.path
                                                        }).then(res=>{
                                                            nodeData.children = res
                                                            setTreeData(
                                                                finishDraft(draft)
                                                            )
                                                        })
                                                    }

                                                }}
                                                onNodeSelect={(event)=>{
                                                    const {nodeData} = getNodeDataByEvent(event)
                                                    if(nodeData.type ==='file'){
                                                        const filePath = nodeData.path
                                                        if(filePath.endsWith('.js') || filePath.endsWith('.ts')){
                                                            githubRef.current = {
                                                                ...githubRef.current,
                                                                subPath:filePath
                                                            }
                                                        }
                                                        else {
                                                            enqueueSnackbar('invalid javascript file')
                                                        }
                                                    }
                                                }}
                                            >
                                                <TreeCustomItem list={treeData}/>
                                            </TreeView>
                                            <div className="confirmBtn">
                                                <Button
                                                    variant="contained"
                                                    color="success"
                                                    disabled={confirmLoading}
                                                    onClick={()=>{
                                                        setConfirmLoading(true)
                                                        submitTask({
                                                            params: githubRef.current
                                                        }).then(()=>{
                                                            enqueueSnackbar('the submission is successful, please check it in the settings')
                                                        })

                                                    }}
                                                >
                                                    confirm
                                                </Button>
                                            </div>
                                        </div>
                                    </Whether>
                                </If>
                                <Else>
                                    <CircularProgress/>
                                </Else>
                            </Whether>
                        </div>
                    </Else>
                </Whether>
            </div>
            {
                ReactDOM.createPortal(
                    <SelectEntryModal ref={selectEntryModalRef} list={displayFunc}/>,
                    document.body
                )
            }
        </SnackbarProvider>
    )
}
