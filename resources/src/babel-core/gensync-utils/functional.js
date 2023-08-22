import { isAsync, waitFor } from "./async.js";
export function once(fn) {
  let result;
  let resultP;
  return function* () {
    if (result) return result;
    if (!(yield* isAsync())) return result = yield* fn();
    if (resultP) return yield* waitFor(resultP);
    let resolve, reject;
    resultP = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    try {
      result = yield* fn();
      resultP = null;
      resolve(result);
      return result;
    } catch (error) {
      reject(error);
      throw error;
    }
  };
}