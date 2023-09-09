import FingerprintJS from "@fingerprintjs/fingerprintjs";

async function getFingerprint() {
    const fp = await FingerprintJS.load();
    const result = await fp.get();
    return result.visitorId;
}

export const submitTask = async ({params={},headers={},signal})=>{
    const visitorId = await getFingerprint()
    return fetch(process.env.NEXT_PUBLIC_URL  + `/api/submit_task`,{
        headers:{
            Authorization: visitorId,
            ...headers
        },
        body: JSON.stringify(params),
        signal,
        method: 'POST'
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
    return fetch(process.env.NEXT_PUBLIC_URL  + '/api/get_recommend_repo').then(res=>res.json())
}
