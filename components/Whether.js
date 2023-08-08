import React, {Fragment} from 'react';

export const If = ({ children }) => <>{children}</>;
export const Else = ({ children }) => <>{children}</>;

const Whether = ({ value, children })  => {
    const elements = React.Children.toArray(children);
    if (elements.length === 1) return value ? <Fragment>{elements[0]}</Fragment> : null;
    if (elements.length === 2) {
        const [ifEle, elseEle] = elements;
        if(React.isValidElement(ifEle) && ifEle.type === If && React.isValidElement(elseEle) && elseEle.type === Else){
            return value ? ifEle : elseEle
        }
        return <Fragment>{elements}</Fragment>
    }
    return null;
};

export default Whether
