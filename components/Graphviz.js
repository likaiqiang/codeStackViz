import * as d3 from "d3-graphviz";
import {useEffect, useMemo, useRef} from "react";
import DataFor from "@/components/DataFor";

let counter = 0;
// eslint-disable-next-line no-plusplus
const getId = () => `graphviz${counter++}`;

let clickTimer = null

const Graphviz = (props) => {
    const {
        dot,
        className,
        onNodeClick = ()=>{},
        onNodeDbClick = ()=>{},
        history = {},
        onArrowClick = ()=>{},
        options = {fit:true,zoom:false}
    } = props
    const id = useMemo(getId, []);
    const ref = useRef()

    const getNodeId = (e)=>{
        const perentEle = e.target.parentElement
        if(perentEle?.classList.contains('node')){
            return perentEle.getAttribute('id')
        }
        return ''
    }

    const actions = [
        {
            key: 'action',
            text: 'action',
        }
    ]

    const onClick = (e)=>{
        clearTimeout(clickTimer)
        clickTimer = setTimeout(()=>{
            onNodeClick({
                id: getNodeId(e)
            })
        },500)
    }

    const onContextMenu = e=>{
        // e.preventDefault();
        // const perentEle = e.target.parentElement
        // if(!perentEle?.classList.contains('node')) return
        // if(props.popper) {
        //     const content = (
        //         <div className={'adm-popover-inner'}>
        //             <DataFor list={actions} rowKey={item=>item.key}>
        //                 {
        //                     (item)=>{
        //                         return (
        //                             <a className="adm-popover-menu-item adm-plain-anchor" onClick={e=>{
        //                                 console.log('item',item);
        //                             }}>
        //                                 <div className="adm-popover-menu-item-text">{item.text}</div>
        //                             </a>
        //                         )
        //                     }
        //                 }
        //             </DataFor>
        //         </div>
        //     )
        //     props.popper.current.show({
        //         x: e.clientX, y: e.clientY
        //     },content)
        // }
    }

    const onDbClick = e=>{
        clearTimeout(clickTimer);
        clickTimer = null;
        onNodeDbClick({
            id: getNodeId(e)
        })
    }

    useEffect(() => {
        d3.graphviz(`#${ref.current.id}`, options).renderDot(dot);
    }, [dot, options]);


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
                   style={history.index === 0 ? disabledStyle : {}}
                   onClick={()=>{
                       if(history.index === 0) return
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
                ref={ref}
                className={'graphviz'}
                onClick={onClick}
                onDoubleClick={onDbClick}
                onContextMenu={onContextMenu}
            />
        </div>
    )
};

export default Graphviz
