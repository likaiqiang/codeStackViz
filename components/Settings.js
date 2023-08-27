import DataFor from "@/components/DataFor";
import { TextField } from '@mui/material'
import TreeView from '@mui/lab/TreeView';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import TreeItem from '@mui/lab/TreeItem';
import {useEffect, useRef, useState} from "react";
import Whether,{If,Else} from "@/components/Whether";
import {createDraft, finishDraft} from "immer"
import CircularProgress from '@mui/material/CircularProgress';
import { SnackbarProvider, useSnackbar } from 'notistack';
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

function isValidGitHubUrl(url) {
    const re = /^https:\/\/github.com\/[^\/]+\/[^\/]+/;
    return re.test(url);
}

function parseGitHubUrl(url) {
    const re = /^https:\/\/github\.com\/([^\/]+)\/([^\/]+)(?:\/(?:tree|releases)\/([^\/]+))?\/?(.*)/;
    const match = url.match(re);
    if (match) {
        const type = url.includes('/tree/') ? 'branch' : (url.includes('/releases/') ? 'tag' : null);
        return {
            owner: match[1],
            repo: match[2],
            type,
            name: match[3] || null,
            subPath: match[4] || null
        };
    } else {
        return null;
    }
}

function getSubPaths(subPath){
    const pathsArray = subPath.split('/')
    return pathsArray.map((_,index)=> pathsArray.slice(0,index + 1)).join('/')
}

const getUrl = ({owner,repo,name,subPath=''})=> `https://api.github.com/repos/${owner}/${repo}/contents/${subPath}${name ? ('?ref=' + name) : ''}`

export default (props)=>{
    const [treeData,setTreeData] = useState([])
    const repoInputRef = useRef()
    const [loading,setLoading] = useState(false)
    const { enqueueSnackbar } = useSnackbar();

    const fetchContent = (url)=>{
        setLoading(true)
        return fetch(url).then(res=>res.json()).then((res)=>{
            setLoading(false)
            return res
        })
    }

    // useEffect(()=>{
    //     fetch('https://api.github.com/repos/babel/babel-loader/contents/?ref=main').then(res=>res.json())
    //         .then(setTreeData)
    // },[])
    return (
        <SnackbarProvider maxSnack={3}>
            <div className={'libSearch'}>
                <div className={'libInput'}>
                    <TextField
                        size={'small'}
                        style={{width: '100%'}}
                        label="please input a javascript github repo, enter to send"
                        variant="outlined"
                        ref={repoInputRef}
                        onKeyDown={e=>{
                            if(e.keyCode === 13){
                                const value = repoInputRef.current.querySelector('input').value
                                if(isValidGitHubUrl(value)){
                                    const {owner,repo,name,subPath} = parseGitHubUrl(value)

                                    fetchContent(
                                        getUrl({owner,repo,name})
                                    ).then((res)=>{
                                      if(subPath){
                                          const subPaths = getSubPaths(subPath)
                                          debugger
                                          return Promise.all(
                                              subPaths.map(path=> {
                                                  return fetchContent(
                                                      getUrl({owner,repo,name,subPath: path})
                                                  )
                                              })
                                          ).then(nested=>{
                                              const visitedUrls = []
                                              subPaths.reduce((acc,p,i)=>{
                                                  const index = acc.findIndex(file=>file.type === 'dir' && file.url === p)
                                                  // The index here is theoretically permanent
                                                  acc[index].children = nested[i]
                                                  visitedUrls.push(acc[index].url)

                                                  acc = acc[index]
                                                  return acc
                                              },res)
                                          })
                                      }
                                      return res
                                    }).then((res)=>{
                                        setTreeData(res)
                                    })
                                }
                                else{
                                    enqueueSnackbar('not a github repo')
                                }
                            }
                        }}
                    />
                </div>
                <div className={'libFiles'}>
                    {/*defaultSelected*/}
                    <Whether value={!loading}>
                        <If>
                            <TreeView
                                aria-label="file system navigator"
                                defaultCollapseIcon={<ExpandMoreIcon />}
                                defaultExpandIcon={<ChevronRightIcon />}
                                sx={{ height: 240, flexGrow: 1, maxWidth: 400, overflowY: 'auto' }}
                                onNodeToggle={(event, nodeIds)=>{
                                    const nodeDataSet = event.target.closest('.MuiTreeItem-root').dataset;
                                    const isNodeExpand = nodeIds.includes(nodeDataSet.url)

                                    const indexArray = nodeDataSet.index.split('-')

                                    const draft = createDraft(treeData)

                                    const nodeData = indexArray.reduce((acc,item,i)=>{
                                        if(i === indexArray.length -1) return acc[parseInt(item)]
                                        return acc[parseInt(item)].children
                                    },draft)

                                    if(isNodeExpand && (!nodeData.children || nodeData.children.length === 0)){
                                        fetch(nodeData.url).then(res=>res.json()).then(res=>{
                                            nodeData.children = res
                                            setTreeData(
                                                finishDraft(draft)
                                            )
                                        })
                                    }

                                }}
                            >
                                <TreeCustomItem list={treeData}/>
                            </TreeView>
                        </If>
                        <Else>
                            <CircularProgress/>
                        </Else>
                    </Whether>
                </div>
            </div>
        </SnackbarProvider>
    )
}
