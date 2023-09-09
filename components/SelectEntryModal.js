import React, {useState, forwardRef, useImperativeHandle, useContext, useRef, useEffect} from 'react';
import {TextField, List, ListItem, ListItemText, IconButton} from '@mui/material';
import PageContext from '@/context'
import CustomModal, {modalManager} from "@/components/CustomModal";
import Whether from "@/components/Whether";

const SelectEntryModal = (props,ref)=>{
    const {list = [],updateList=()=>{}} = props
    const [searchText, setSearchText] = useState('');
    const {renderFiltedSvg,push} = useContext(PageContext)
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
                            renderFiltedSvg({
                                entryFuncId: item.id
                            }).then(()=>{
                                modalManager.closeAllModals()
                                push(item.id)
                            })
                        }}>
                            <ListItemText primary={item.name} />
                        </ListItem>
                    ))}
                </List>
            </div>
        </CustomModal>
    )
}
export default forwardRef(SelectEntryModal)
