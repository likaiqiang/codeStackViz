import FingerprintJS from "@fingerprintjs/fingerprintjs";

async function getFingerprint() {
    const fp = await FingerprintJS.load();
    const result = await fp.get();
    return result.visitorId;
}

export const getBundle = async ({params={},headers={},signal})=>{
    const queryStr = Object.keys(params).reduce((acc,key,i)=>{
        if(params[key]){
            if(i === Object.keys(params).length - 1){
                return acc += `${key}=${params[key]}`
            }
            return acc += `${key}=${params[key]}&`
        }
        return acc
    },'')
    const visitorId = await getFingerprint()
    return fetch(`/api/get_bundle?${queryStr}`,{
        headers:{
            Authorization: visitorId,
            ...headers
        },
        signal
    }).then(res=>res.json())
}
