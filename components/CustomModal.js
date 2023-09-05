import Modal from 'react-modal'
import {useEffect, useRef, forwardRef, useState, useImperativeHandle} from "react";
class ModalManager{
    modals = [];
    openModal(modal) {
        this.modals.push(modal);
    }
    closeModal(modal) {
        this.modals = this.modals.filter(m => m !== modal);
    }

    closeAllModals() {
        this.modals.forEach(modal => modal.current._setOpen(false));
        this.modals = [];
    }
}
export const modalManager = new ModalManager()
const CustomModal = (props,componentRef)=>{
    const [isOpen,setOpen] = useState(false)
    const show = ()=>{
        setOpen(true)
        modalManager.openModal(componentRef)
    }
    const hide = ()=>{
        setOpen(false)
        modalManager.closeModal(componentRef)
    }
    useImperativeHandle(componentRef,()=>{
        return {
            show,
            hide,
            _setOpen: setOpen        }
    })

    return (
        <Modal isOpen={isOpen}
               ariaHideApp={false}
               style={{
                   content: {
                       top: '50%',
                       left: '50%',
                       right: 'auto',
                       bottom: 'auto',
                       marginRight: '-50%',
                       transform: 'translate(-50%, -50%)',
                       width: "30%"
                   },
                   overlay: {
                       backgroundColor: 'rgba(0,0,0,.4)'
                   }
               }}
               shouldCloseOnOverlayClick={true}
               onRequestClose={props.onRequestClose}
        >
            {props.children}
        </Modal>
    )
}
export default forwardRef(CustomModal)
