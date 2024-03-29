import React, {useState, forwardRef, useImperativeHandle, useContext, useRef, useEffect} from 'react';
import {TextField, List, ListItem, ListItemText, IconButton} from '@mui/material';
import PageContext from '@/context'
import CustomModal, {modalManager} from "@/components/CustomModal";
import {generateSplicedCode} from "@/cg/common";

const SelectEntryModal = (props,ref)=>{
    const {list = []} = props
    const [searchText, setSearchText] = useState('');
    const {renderFiltedSvg,push, clear, setCode, renderExpDot} = useContext(PageContext)
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
                                    setCode(draft=>{
                                        draft.value = ''
                                        draft.type = ''
                                        draft.paths = {}
                                    })
                                })
                            }
                            else {
                                setCode(draft=>{
                                    const splicedCode = generateSplicedCode({
                                        path: item.path,
                                        npm: item.npm,
                                        npmPath: item.npmPath
                                    })
                                    for(let key in splicedCode){
                                        draft[key] = splicedCode[key]
                                    }
                                })
                                clear()
                                renderExpDot()
                                modalManager.closeAllModals()
                            }
                        }}>
                            <ListItemText primary={item.name + (item.maxLevel === 1 ? '【only one level】' : `【level: ${item.maxLevel}】`)} />
                        </ListItem>
                    ))}
                </List>
            </div>
        </CustomModal>
    )
}
export default forwardRef(SelectEntryModal)
