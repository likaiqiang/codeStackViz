import gensync from "gensync";
import { maybeAsync, isAsync, onFirstPause, waitFor, isThenable } from "../gensync-utils/async.js";
import { isIterableIterator } from "./util.js";
const synchronize = gen => {
  return gensync(gen).sync;
};
function* genTrue() {
  return true;
}
export function makeWeakCache(handler) {
  return makeCachedFunction(WeakMap, handler);
}
export function makeWeakCacheSync(handler) {
  return synchronize(makeWeakCache(handler));
}
export function makeStrongCache(handler) {
  return makeCachedFunction(Map, handler);
}
export function makeStrongCacheSync(handler) {
  return synchronize(makeStrongCache(handler));
}
function makeCachedFunction(CallCache, handler) {
  const callCacheSync = new CallCache();
  const callCacheAsync = new CallCache();
  const futureCache = new CallCache();
  return function* cachedFunction(arg, data) {
    const asyncContext = yield* isAsync();
    const callCache = asyncContext ? callCacheAsync : callCacheSync;
    const cached = yield* getCachedValueOrWait(asyncContext, callCache, futureCache, arg, data);
    if (cached.valid) return cached.value;
    const cache = new CacheConfigurator(data);
    const handlerResult = handler(arg, cache);
    let finishLock;
    let value;
    if (isIterableIterator(handlerResult)) {
      value = yield* onFirstPause(handlerResult, () => {
        finishLock = setupAsyncLocks(cache, futureCache, arg);
      });
    } else {
      value = handlerResult;
    }
    updateFunctionCache(callCache, cache, arg, value);
    if (finishLock) {
      futureCache.delete(arg);
      finishLock.release(value);
    }
    return value;
  };
}
function* getCachedValue(cache, arg, data) {
  const cachedValue = cache.get(arg);
  if (cachedValue) {
    for (const {
      value,
      valid
    } of cachedValue) {
      if (yield* valid(data)) return {
        valid: true,
        value
      };
    }
  }
  return {
    valid: false,
    value: null
  };
}
function* getCachedValueOrWait(asyncContext, callCache, futureCache, arg, data) {
  const cached = yield* getCachedValue(callCache, arg, data);
  if (cached.valid) {
    return cached;
  }
  if (asyncContext) {
    const cached = yield* getCachedValue(futureCache, arg, data);
    if (cached.valid) {
      const value = yield* waitFor(cached.value.promise);
      return {
        valid: true,
        value
      };
    }
  }
  return {
    valid: false,
    value: null
  };
}
function setupAsyncLocks(config, futureCache, arg) {
  const finishLock = new Lock();
  updateFunctionCache(futureCache, config, arg, finishLock);
  return finishLock;
}
function updateFunctionCache(cache, config, arg, value) {
  if (!config.configured()) config.forever();
  let cachedValue = cache.get(arg);
  config.deactivate();
  switch (config.mode()) {
    case "forever":
      cachedValue = [{
        value,
        valid: genTrue
      }];
      cache.set(arg, cachedValue);
      break;
    case "invalidate":
      cachedValue = [{
        value,
        valid: config.validator()
      }];
      cache.set(arg, cachedValue);
      break;
    case "valid":
      if (cachedValue) {
        cachedValue.push({
          value,
          valid: config.validator()
        });
      } else {
        cachedValue = [{
          value,
          valid: config.validator()
        }];
        cache.set(arg, cachedValue);
      }
  }
}
class CacheConfigurator {
  _active = true;
  _never = false;
  _forever = false;
  _invalidate = false;
  _configured = false;
  _pairs = [];
  _data;
  constructor(data) {
    this._data = data;
  }
  simple() {
    return makeSimpleConfigurator(this);
  }
  mode() {
    if (this._never) return "never";
    if (this._forever) return "forever";
    if (this._invalidate) return "invalidate";
    return "valid";
  }
  forever() {
    if (!this._active) {
      throw new Error("Cannot change caching after evaluation has completed.");
    }
    if (this._never) {
      throw new Error("Caching has already been configured with .never()");
    }
    this._forever = true;
    this._configured = true;
  }
  never() {
    if (!this._active) {
      throw new Error("Cannot change caching after evaluation has completed.");
    }
    if (this._forever) {
      throw new Error("Caching has already been configured with .forever()");
    }
    this._never = true;
    this._configured = true;
  }
  using(handler) {
    if (!this._active) {
      throw new Error("Cannot change caching after evaluation has completed.");
    }
    if (this._never || this._forever) {
      throw new Error("Caching has already been configured with .never or .forever()");
    }
    this._configured = true;
    const key = handler(this._data);
    const fn = maybeAsync(handler, `You appear to be using an async cache handler, but Babel has been called synchronously`);
    if (isThenable(key)) {
      return key.then(key => {
        this._pairs.push([key, fn]);
        return key;
      });
    }
    this._pairs.push([key, fn]);
    return key;
  }
  invalidate(handler) {
    this._invalidate = true;
    return this.using(handler);
  }
  validator() {
    const pairs = this._pairs;
    return function* (data) {
      for (const [key, fn] of pairs) {
        if (key !== (yield* fn(data))) return false;
      }
      return true;
    };
  }
  deactivate() {
    this._active = false;
  }
  configured() {
    return this._configured;
  }
}
function makeSimpleConfigurator(cache) {
  function cacheFn(val) {
    if (typeof val === "boolean") {
      if (val) cache.forever();else cache.never();
      return;
    }
    return cache.using(() => assertSimpleType(val()));
  }
  cacheFn.forever = () => cache.forever();
  cacheFn.never = () => cache.never();
  cacheFn.using = cb => cache.using(() => assertSimpleType(cb()));
  cacheFn.invalidate = cb => cache.invalidate(() => assertSimpleType(cb()));
  return cacheFn;
}
export function assertSimpleType(value) {
  if (isThenable(value)) {
    throw new Error(`You appear to be using an async cache handler, ` + `which your current version of Babel does not support. ` + `We may add support for this in the future, ` + `but if you're on the most recent version of @babel/core and still ` + `seeing this error, then you'll need to synchronously handle your caching logic.`);
  }
  if (value != null && typeof value !== "string" && typeof value !== "boolean" && typeof value !== "number") {
    throw new Error("Cache keys must be either string, boolean, number, null, or undefined.");
  }
  return value;
}
class Lock {
  released = false;
  promise;
  _resolve;
  constructor() {
    this.promise = new Promise(resolve => {
      this._resolve = resolve;
    });
  }
  release(value) {
    this.released = true;
    this._resolve(value);
  }
}