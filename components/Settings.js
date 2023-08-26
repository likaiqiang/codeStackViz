import DataFor from "@/components/DataFor";
import { TextField } from '@mui/material'
import TreeView from '@mui/lab/TreeView';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import TreeItem from '@mui/lab/TreeItem';
import {useEffect, useRef, useState} from "react";
import Whether,{If,Else} from "@/components/Whether";
import {createDraft, finishDraft} from "immer"
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

function parseGitHubUrl(url) {
    const regex = /^https?:\/\/github\.com\/([^\/]+)\/([^\/]+)/;
    const match = url.match(regex);
    if (match) {
        const [, owner, repo] = match;
        return { owner, repo };
    } else {
        throw new Error('Invalid GitHub URL');
    }
}

export default (props)=>{
    const [treeData,setTreeData] = useState([])
    useEffect(()=>{
        fetch('https://api.github.com/repos/babel/babel-loader/contents/?ref=main').then(res=>res.json())
            .then(setTreeData)
    },[])
    return (
        <div className={'libSearch'}>
            <div className={'libInput'}>
                <TextField size={'small'} style={{width: '100%'}} label="please enter a javascript github repo, enter to send" variant="outlined" />
            </div>
            <div className={'libFiles'}>
                {/*defaultSelected*/}
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
            </div>
        </div>
    )
}
