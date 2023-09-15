import React, {useState, forwardRef, useImperativeHandle, useContext, useRef, useEffect} from 'react';
import {TextField, List, ListItem, ListItemText, IconButton} from '@mui/material';
import PageContext from '@/context'
import CustomModal, {modalManager} from "@/components/CustomModal";
import {generateSplicedCode} from "@/cg/common";

const SelectEntryModal = (props,ref)=>{
    const {list = []} = props
    const [searchText, setSearchText] = useState('');
    const {renderFiltedSvg,push, clear, setCode} = useContext(PageContext)
    const modalRef = useRef()

    useImperativeHandle(ref,()=>{
        return {
            show(){
                modalRef.current.show()
            },
            hide(){
                modalRef.current.hide()
            }
        }
    })
    return (
        <CustomModal
            ref={modalRef}
            onRequestClose={() => modalRef.current.hide()}
        >
            <div style={{ maxHeight: 200, overflow: 'auto' }}>
                <List>
                    {list.map(item => (
                        <ListItem button={true} key={item.id} onClick={()=>{
                            if(item.maxLevel > 1){
                                renderFiltedSvg({
                                    entryFuncId: item.id
                                }).then(()=>{
                                    modalManager.closeAllModals()
                                    clear()
                                    push(item.id)
                                    setCode('')
                                })
                            }
                            else {
                                const code = generateSplicedCode({
                                    path: item.path,
                                    npm: item.npm,
                                    npmPath: item.npmPath
                                })
                                setCode(code)
                                modalManager.closeAllModals()
                            }
                        }}>
                            <ListItemText primary={item.name + (item.maxLevel === 1 ? '【only one level】' : '')} />
                        </ListItem>
                    ))}
                </List>
            </div>
        </CustomModal>
    )
}
export default forwardRef(SelectEntryModal)
