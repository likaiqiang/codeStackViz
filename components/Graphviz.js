import {graphviz} from "d3-graphviz";
import {useEffect, useMemo, useRef} from "react";
import DataFor from "@/components/DataFor";

let counter = 0;
// eslint-disable-next-line no-plusplus
const getId = () => `graphviz${counter++}`;

const Graphviz = (props) => {
    const {dot, className, onNodeClick = ()=>{} ,options = {fit:true,zoom:false}} = props
    const id = useMemo(getId, []);
    const ref = useRef()

    const actions = [
        {
            key: 'action',
            text: 'action',
        }
    ]

    useEffect(() => {
        graphviz(`#${ref.current.id}`, options).renderDot(dot);
    }, [dot, options]);
    useEffect(() => {
        const dom = ref.current
        const onClick = e=>{
            const perentEle = e.target.parentElement
            if(perentEle?.classList.contains('node')){
                onNodeClick({
                    id: perentEle.getAttribute('id')
                })
            }
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
        dom.addEventListener('click',onClick)
        dom.addEventListener('contextmenu',onContextMenu)
        return ()=>{
            dom.removeEventListener('click',onClick)
            dom.removeEventListener('contextmenu',onContextMenu)
        }
    }, []);

    return <div className={className} id={id} ref={ref} />;
};

export default Graphviz
