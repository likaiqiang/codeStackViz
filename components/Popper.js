import { Popper } from "react-popper";
import {useState, forwardRef, useImperativeHandle, useRef, useEffect} from "react";
import Whether from "./Whether";

const CustomPopper = (props,ref)=>{
    const [isOpen, setIsOpen] = useState(false);
    const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
    const [content,changeContent] = useState(null)
    const eleRef = useRef()
    useImperativeHandle(ref,()=>{
        return {
            show(position = {x:0,y:0},content){
                setIsOpen(true)
                setMenuPosition(position)
                changeContent(content)
            },
            hide(){
                setIsOpen(false)
                setMenuPosition({x:0,y:0})
                changeContent(null)
            },
            get status(){
                return isOpen
            }
        }
    })
    useEffect(()=>{
        const onClick = (e)=>{
            if(eleRef.current && !eleRef.current.contains(e.target)){
                setIsOpen(false)
            }
        }
        document.addEventListener('click',onClick)
        return ()=>{
            document.removeEventListener('click',onClick)
        }
    },[setIsOpen])
    return (
        <Whether value={isOpen}>
            <Popper
                placement="bottom-start"
                positionFixed={true}
                referenceElement={null}
            >
                {({ ref:popperRef, style }) => (
                    <div
                        className="context-menu"
                        ref={ele=>{
                            popperRef.current = ele
                            eleRef.current = ele
                        }}
                        style={{ ...style, left: menuPosition.x, top: menuPosition.y }}
                    >
                        {content}
                    </div>
                )}
            </Popper>
        </Whether>
    )
}
export default forwardRef(CustomPopper)
