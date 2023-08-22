import gensync from "gensync";
import loadFullConfig from "./full.js";
import { loadPartialConfig as loadPartialConfigRunner } from "./partial.js";
export { loadFullConfig as default };
import { createConfigItem as createConfigItemImpl } from "./item.js";
const loadOptionsRunner = gensync(function* (opts) {
  const config = yield* loadFullConfig(opts);
  return config?.options ?? null;
});
const createConfigItemRunner = gensync(createConfigItemImpl);
const maybeErrback = runner => (argOrCallback, maybeCallback) => {
  let arg;
  let callback;
  if (maybeCallback === undefined && typeof argOrCallback === "function") {
    callback = argOrCallback;
    arg = undefined;
  } else {
    callback = maybeCallback;
    arg = argOrCallback;
  }
  if (!callback) {
    return runner.sync(arg);
  }
  runner.errback(arg, callback);
};
export const loadPartialConfig = maybeErrback(loadPartialConfigRunner);
export const loadPartialConfigSync = loadPartialConfigRunner.sync;
export const loadPartialConfigAsync = loadPartialConfigRunner.async;
export const loadOptions = maybeErrback(loadOptionsRunner);
export const loadOptionsSync = loadOptionsRunner.sync;
export const loadOptionsAsync = loadOptionsRunner.async;
export const createConfigItemSync = createConfigItemRunner.sync;
export const createConfigItemAsync = createConfigItemRunner.async;
export function createConfigItem(target, options, callback) {
  if (callback !== undefined) {
    createConfigItemRunner.errback(target, options, callback);
  } else if (typeof options === "function") {
    createConfigItemRunner.errback(target, undefined, callback);
  } else {
    return createConfigItemRunner.sync(target, options);
  }
}