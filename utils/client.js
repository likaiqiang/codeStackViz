import {useState} from 'react'
import {emitter} from '@/mitt/index'
export function useLocalStorage(key, initialValue) {
    // State to store our value
    // Pass initial state function to useState so logic is only executed once
    const [storedValue, setStoredValue] = useState(() => {
        if (typeof window === "undefined") {
            return initialValue;
        }
        try {
            // Get from local storage by key
            const item = window.localStorage.getItem(key);
            // Parse stored json or if none return initialValue
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            // If error also return initialValue
            console.log(error);
            return initialValue;
        }
    });
    // Return a wrapped version of useState's setter function that ...
    // ... persists the new value to localStorage.
    const setValue = (value) => {
        try {
            // Allow value to be a function so we have same API as useState
            const valueToStore =
                value instanceof Function ? value(storedValue) : value;
            // Save state
            setStoredValue(valueToStore);
            // Save to local storage
            if (typeof window !== "undefined") {
                window.localStorage.setItem(key, JSON.stringify(valueToStore));
                emitter.emit(key, valueToStore)
            }
        } catch (error) {
            // A more advanced implementation would handle the error case
            console.log(error);
        }
    };
    return [storedValue, setValue];
}
export const waitForPromise = async ({promise,timeout=1000,waitCallBack=()=>{}})=>{
    let timer = null
    const timeoutPromise = new Promise(()=>{
        timer = setTimeout(waitCallBack,timeout)
    })
    try {
        const result = await Promise.race([promise, timeoutPromise]);
        clearTimeout(timer);
        return result
    } catch (err){
        clearTimeout(timer)
        throw err
    }
}
export const renderMaxLevel = 3

