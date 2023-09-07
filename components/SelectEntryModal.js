import React, {useState, forwardRef, useImperativeHandle, useContext, useRef} from 'react';
import { TextField, List, ListItem, ListItemText } from '@mui/material';
import PageContext from '@/context'
import CustomModal, {modalManager} from "@/components/CustomModal";


const SelectEntryModal = (props,ref)=>{
    const {list = []} = props
    const [searchText, setSearchText] = useState('');
    const {renderFiltedSvg} = useContext(PageContext)
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
            <TextField
                label="please select or search a entry function"
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                style={{'width':'100%'}}

            />
            <div style={{ maxHeight: 200, overflow: 'auto' }}>
                <List>
                    {list.map(item => (
                        <ListItem button={true} key={item[0].id} onClick={()=>{
                            renderFiltedSvg({
                                entryFuncId: item[0].id
                            }).then(()=>{
                                modalManager.closeAllModals()
                            })
                        }}>
                            <ListItemText primary={item[0].name} />
                        </ListItem>
                    ))}
                </List>
            </div>
        </CustomModal>
    )
}
export default forwardRef(SelectEntryModal)
