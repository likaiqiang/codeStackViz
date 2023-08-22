import gensync from "gensync";
const runGenerator = gensync(function* (item) {
  return yield* item;
});
export const isAsync = gensync({
  sync: () => false,
  errback: cb => cb(null, true)
});
export function maybeAsync(fn, message) {
  return gensync({
    sync(...args) {
      const result = fn.apply(this, args);
      if (isThenable(result)) throw new Error(message);
      return result;
    },
    async(...args) {
      return Promise.resolve(fn.apply(this, args));
    }
  });
}
const withKind = gensync({
  sync: cb => cb("sync"),
  async: async cb => cb("async")
});
export function forwardAsync(action, cb) {
  const g = gensync(action);
  return withKind(kind => {
    const adapted = g[kind];
    return cb(adapted);
  });
}
export const onFirstPause = gensync({
  name: "onFirstPause",
  arity: 2,
  sync: function (item) {
    return runGenerator.sync(item);
  },
  errback: function (item, firstPause, cb) {
    let completed = false;
    runGenerator.errback(item, (err, value) => {
      completed = true;
      cb(err, value);
    });
    if (!completed) {
      firstPause();
    }
  }
});
export const waitFor = gensync({
  sync: x => x,
  async: async x => x
});
export function isThenable(val) {
  return !!val && (typeof val === "object" || typeof val === "function") && !!val.then && typeof val.then === "function";
}