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
import {Autocomplete,Snackbar} from "@mui/material";
import {useMemoizedFn} from "ahooks/lib";
import {debounce} from 'lodash-es'
import {submitTask} from "@/api";
import {renderMaxLevel as defaultRenderMaxLevel} from "@/utils/client";
import SelectEntryModal from "@/components/SelectEntryModal";
import ReactDOM from "react-dom";
import PageContext from "@/context";
import {useImmer} from "use-immer";
import {RedoOutline} from "antd-mobile-icons";


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
    const {list, onRefresh=()=>{}} = props
    const [treeData,setTreeData] = useState([])
    const [options,setOptions] = useState([])
    const [loading,setLoading] = useState(false)
    const [confirmLoading,setConfirmLoading] = useState(false)
    const githubRef = useRef({})
    const [toast,setToast] = useImmer({
        isOpen: false,
        message:''
    })

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
        try {
            const headers = process.env.NEXT_PUBLIC_GIT_TOKEN ? {Authorization: `token ${process.env.NEXT_PUBLIC_GIT_TOKEN}`} : {}
            return fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${subPath}${name ? ('?ref=' + name) : ''}`,{
                headers
            }).then(res=>res.json())
        } catch (err){
            if(err.message){
                setToast(draft => {
                    draft.isOpen = true
                    draft.message = err.message
                })
            }
            return Promise.reject(err)
        }
    }

    const onSearchGh = ({language=[],keyword})=>{
        const lg = language.map(lan=> `language:${lan}`).join('+')
        const headers = process.env.NEXT_PUBLIC_GIT_TOKEN ? {Authorization: `token ${process.env.NEXT_PUBLIC_GIT_TOKEN}`} : {}
        return fetch(`https://api.github.com/search/repositories?q=${lg}+${keyword}`,{
            headers
        }).then(res=>res.json()).then((res)=>{
            if(res.message){
                setToast(draft => {
                    draft.isOpen = true
                    draft.message = res.message
                })
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


    return (
        <>
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
                    <RedoOutline onClick={onRefresh}/>
                </div>
                <Whether value={!treeData.length}>
                    <If>
                        <dl style={{maxHeight: '60vh',overflow:'auto'}}>
                            <DataFor list={list}>
                                {
                                    (item)=>{
                                        return (
                                            <>
                                                <dt style={{opacity: item[1].filter(bun=>bun.status !== 2).length === item[1].length ? '0.4' : 1}}>
                                                    {`${item[0].owner}/${item[0].repo}` + (item[0].key === '1' ? '(system)' : '')}
                                                </dt>
                                                <DataFor list={item[1]}>
                                                    {
                                                        (bundled)=>{
                                                            return (
                                                                <dd onClick={()=>{
                                                                    if(bundled.status !== 2) return

                                                                    const {displayFunc} = getBatchConfigByCode({code: atob(bundled.bundleFile)})
                                                                    let filtedDisplayFunc = displayFunc.filter(([vertex,dotJson])=>{
                                                                        return dotJson.maxLevel > defaultRenderMaxLevel
                                                                    })
                                                                    if(filtedDisplayFunc.length === 0){
                                                                        filtedDisplayFunc = displayFunc.filter(([_,dotJson])=>{
                                                                            return dotJson.statements.length > defaultRenderMaxLevel
                                                                        })
                                                                    }
                                                                    if(filtedDisplayFunc.length > 0){
                                                                        selectEntryModalRef.current.show()
                                                                        setDisplayFunc(
                                                                            filtedDisplayFunc.map(item=>{
                                                                                const {id,name,path,npm,npmPath} = item[0]
                                                                                return {
                                                                                    id,
                                                                                    name,
                                                                                    maxLevel: item[1].maxLevel,
                                                                                    path,
                                                                                    npm,
                                                                                    npmPath,
                                                                                }
                                                                            })
                                                                        )
                                                                    }
                                                                    else{
                                                                        if(displayFunc.length){
                                                                            selectEntryModalRef.current.show()
                                                                            setDisplayFunc(
                                                                                displayFunc.map(item=>{
                                                                                    const {id,name,path,npm,npmPath} = item[0]
                                                                                    return {
                                                                                        id,
                                                                                        name,
                                                                                        path,
                                                                                        npm,
                                                                                        npmPath,
                                                                                        maxLevel: item[1].maxLevel
                                                                                    }
                                                                                })
                                                                            )
                                                                            setTimeout(()=>{
                                                                                setToast(draft => {
                                                                                    draft.message = `no function with call stack greater than ${defaultRenderMaxLevel} was found, all will be shown`
                                                                                    draft.isOpen = true
                                                                                })
                                                                            },300)
                                                                        }
                                                                        else{
                                                                            setToast(draft => {
                                                                                draft.message = 'display function not found'
                                                                                draft.isOpen = true
                                                                            })
                                                                        }
                                                                    }

                                                                }}>
                                                                    <a
                                                                        onClick={e=>e.preventDefault()}
                                                                        style={{opacity: bundled.status !== 2 ? '0.4': 1, cursor: bundled.status !== 2 ? 'auto' :'pointer'}}>
                                                                        {bundled.bundleFileName}
                                                                        <Whether value={bundled.status === 4 || bundled.status ===3}>
                                                                            <span style={{color:'red'}}>(task failed)</span>
                                                                        </Whether>
                                                                        <Whether value={bundled.status === 0 || bundled.status === 1}>
                                                                            <span>  (task is working)</span>
                                                                        </Whether>
                                                                    </a>
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
                                                sx={{ maxHeight: '60vh', flexGrow: 1, maxWidth: 400, overflowY: 'auto' }}
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
                                                            setConfirmLoading(false)
                                                        }
                                                        else {
                                                            setToast(draft => {
                                                                draft.isOpen = true
                                                                draft.message = 'invalid javascript file'
                                                            })
                                                            setConfirmLoading(true)
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
                                                            setToast(draft => {
                                                                draft.isOpen = true
                                                                draft.message = 'The submission is successful, please wait for 5 minutes and check in the settings'
                                                            })
                                                        }).finally(()=>{
                                                            setConfirmLoading(false)
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
                    <SelectEntryModal ref={selectEntryModalRef} list={displayFunc} updateList={setDisplayFunc}/>,
                    document.body
                )
            }
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
        </>
    )
}
