import FingerprintJS from "@fingerprintjs/fingerprintjs";

async function getFingerprint() {
    const fp = await FingerprintJS.load();
    const result = await fp.get();
    return result.visitorId;
}

export const submitTask = async ({params={},headers={},signal})=>{
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
    return fetch(process.env.NEXT_PUBLIC_URL  + `/api/submit_task?${queryStr}`,{
        headers:{
            Authorization: visitorId,
            ...headers
        },
        signal
    })
}

export const getStatus = async ({headers={},signal})=>{
    const visitorId = await getFingerprint()
    return fetch(process.env.NEXT_PUBLIC_URL  + '/api/query_status',{
        headers:{
            Authorization: visitorId,
            ...headers
        },
        signal
    }).then(res=>res.json())
}
export const getRecommendBundles = async ()=>{
    return fetch(process.env.URL  + '/api/get_recommend_repo').then(res=>res.json())
}
