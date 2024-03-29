import * as d3 from "d3-graphviz";
import {selectAll,select} from "d3-selection";
import {useEffect, useMemo, useRef, forwardRef, useImperativeHandle, useState} from "react";
import ClipLoader from "react-spinners/ClipLoader";
import Whether from "@/components/Whether";
import {selectNodeConfig} from 'cg'
import DataFor from "@/components/DataFor";
import {isVertexHasNext} from "@/cg/common";

let counter = 0;
// eslint-disable-next-line no-plusplus
const getId = () => `graphviz${counter++}`;

let clickTimer = null

const Graphviz = (props,ref) => {
    const {
        className,
        onNodeClick = ()=>{},
        onContextMenuItemClick = ()=>{},
        history = {},
        onArrowClick = ()=>{},
        onSettingClick=()=>{},
        config = {}
    } = props
    const id = useMemo(getId, []);
    const eleRef = useRef()
    const graphvizRef = useRef(null)

    const [isRending,setIsRending] = useState(false)


    const actions = [
        {
            key: 'vertex',
            text: '【只看该节点】',
            onClick(e){
                onContextMenuItemClick(e.target.parentElement)
                props.popper.current.hide()
            }
        }
    ]

    const onselectNodeStyle = node=>{
        selectAll("g.node").select("path").style("stroke", "black");
        // node.select("path").style("stroke", selectNodeConfig.color);
        node.querySelector("path").style.stroke = selectNodeConfig.color
    }

    const isNode = e=>{
        const perentEle = e.target.parentElement
        return perentEle?.classList.contains('node')
    }
    const onClick = (e)=>{
        if(isNode(e)){
            onselectNodeStyle(e.target.parentElement)
            onNodeClick(e.target.parentElement)
        }
    }

    const onContextMenu = e=>{
        e.preventDefault();
        if(props.popper && isNode(e)) {
            const id = e.target.parentElement.getAttribute('id')
            if(isVertexHasNext({
                id,
                statements: config.dotJson.statements
            })){
                const content = (
                    <div className={'adm-popover-inner'}>
                        <DataFor list={actions} rowKey={item=>item.key}>
                            {
                                (item)=>{
                                    return (
                                        <a className="adm-popover-menu-item" onClick={()=>{
                                            item.onClick(e)
                                        }}>
                                            <div className="adm-popover-menu-item-text">{item.text}</div>
                                        </a>
                                    )
                                }
                            }
                        </DataFor>
                    </div>
                )
                props.popper.current.show({
                    x: e.clientX, y: e.clientY
                },content)
            }
        }
    }

    const renderSvg = (dot)=>{
        return new Promise((resolve,reject)=>{
            const {current: graphviz}  = graphvizRef
            setIsRending(true)
            try {
                graphviz.resetZoom()
            } catch (e){
                // doing
            }

            graphviz.dot(dot).render(()=>{
                setIsRending(false)
                resolve()
            })
        })

    }

    useEffect(() => {
        if(!graphvizRef.current){
            graphvizRef.current = d3.graphviz(`#${eleRef.current.id}`, {fit:true,zoom:true})
        }

        return ()=>{
            graphvizRef.current.destroy()
        }

    }, []);

    useImperativeHandle(ref,()=>{
        return {
            renderSvg,
            clear(){
                select(`#${eleRef.current.id}`).html("")
            }
        }
    })

    const disabledStyle = {
        opacity: 0.4,
        cursor: "auto"
    }
    console.log('history',history);
    return (
        <div className={className}>
            <div className="controlIcons">
                <i
                   className="bi bi-arrow-left"
                   style={history.index <= 0 ? disabledStyle : {}}
                   onClick={()=>{
                       if(history.index <=0) return
                       onArrowClick({
                           type:'back'
                       })
                   }}
                />
                <i
                    className="bi bi-arrow-right"
                    style={history.index ===history.list.length - 1 ? disabledStyle : {}}
                    onClick={()=>{
                        if(history.index ===history.list.length - 1) return
                        onArrowClick({
                            type:'forward'
                        })
                    }}
                />
            </div>
            <div
                id={id}
                ref={eleRef}
                className={'graphviz'}
                onClick={onClick}
                onContextMenu={onContextMenu}
            />
            <div className="controlPanel">
                <i className={'bi bi-gear'} onClick={onSettingClick}/>
            </div>
            <Whether value={isRending}>
                <div className="loading">
                    <ClipLoader
                        color={'rgb(54, 215, 183)'}
                        loading={isRending}
                        size={50}
                        aria-label="Loading Spinner"
                        data-testid="loader"
                    />
                </div>
            </Whether>
        </div>
    )
};

export default forwardRef(Graphviz)
