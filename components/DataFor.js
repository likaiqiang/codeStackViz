import React,{Fragment} from 'react'
const DataFor = (props)=>{
    const {children,list=[],rowKey} = props
    return (
        list.map((item,index)=>{
            const key = typeof rowKey === 'function' ? rowKey(item,index) : index
            return (
                <Fragment key={key}>
                    {
                        typeof children === 'function' ? children(item,index) : React.cloneElement(children,{item,index})
                    }
                </Fragment>
            )
        })
    )
}
export default DataFor
