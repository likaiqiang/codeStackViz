import * as helpers from '@babel/helpers';
import traverse, { NodePath } from '@babel/traverse';
export { default as traverse } from '@babel/traverse';
import { codeFrameColumns } from '@babel/code-frame';
import * as _t from '@babel/types';
export { _t as types };
import { getModuleName } from '@babel/helper-module-transforms';
import semver from 'semver';
import generate from '@babel/generator';
import template from '@babel/template';
export { default as template } from '@babel/template';
import path from 'path';
import gensync from 'gensync';
import fs, { realpathSync, statSync, Stats } from 'fs';
import buildDebug from 'debug';
import json5 from 'json5';
import { pathToFileURL, URL, fileURLToPath } from 'url';
import Module, { createRequire, builtinModules } from 'module';
import getTargets, { isBrowsersQueryValid, TargetNames } from '@babel/helper-compilation-targets';
import convertSourceMap from 'convert-source-map';
import { parse as parse$1, tokTypes } from '@babel/parser';
export { tokTypes } from '@babel/parser';
import remapping from '@ampproject/remapping';
import assert from 'assert';
import process$1 from 'process';
import v8 from 'v8';
import { format, inspect } from 'util';

var thisFile = /*#__PURE__*/Object.freeze({
  __proto__: null,
  get DEFAULT_EXTENSIONS () { return DEFAULT_EXTENSIONS; },
  get File () { return File; },
  get buildExternalHelpers () { return buildExternalHelpers; },
  get createConfigItem () { return createConfigItem; },
  get createConfigItemAsync () { return createConfigItemAsync; },
  get createConfigItemSync () { return createConfigItemSync; },
  get getEnv () { return getEnv; },
  get loadOptions () { return loadOptions; },
  get loadOptionsAsync () { return loadOptionsAsync; },
  get loadOptionsSync () { return loadOptionsSync; },
  get loadPartialConfig () { return loadPartialConfig; },
  get loadPartialConfigAsync () { return loadPartialConfigAsync; },
  get loadPartialConfigSync () { return loadPartialConfigSync; },
  get parse () { return parse; },
  get parseAsync () { return parseAsync; },
  get parseSync () { return parseSync; },
  get resolvePlugin () { return resolvePlugin; },
  get resolvePreset () { return resolvePreset; },
  get template () { return template; },
  get tokTypes () { return tokTypes; },
  get transform () { return transform; },
  get transformAsync () { return transformAsync; },
  get transformFile () { return transformFile; },
  get transformFileAsync () { return transformFileAsync; },
  get transformFileSync () { return transformFileSync; },
  get transformFromAst () { return transformFromAst; },
  get transformFromAstAsync () { return transformFromAstAsync; },
  get transformFromAstSync () { return transformFromAstSync; },
  get transformSync () { return transformSync; },
  get traverse () { return traverse; },
  get types () { return _t; },
  get version () { return version; }
});

const {
  cloneNode: cloneNode$1,
  interpreterDirective
} = _t;
const errorVisitor = {
  enter(path, state) {
    const loc = path.node.loc;
    if (loc) {
      state.loc = loc;
      path.stop();
    }
  }
};
class File {
  _map = new Map();
  opts;
  declarations = {};
  path;
  ast;
  scope;
  metadata = {};
  code = "";
  inputMap;
  hub = {
    file: this,
    getCode: () => this.code,
    getScope: () => this.scope,
    addHelper: this.addHelper.bind(this),
    buildError: this.buildCodeFrameError.bind(this)
  };
  constructor(options, {
    code,
    ast,
    inputMap
  }) {
    this.opts = options;
    this.code = code;
    this.ast = ast;
    this.inputMap = inputMap;
    this.path = NodePath.get({
      hub: this.hub,
      parentPath: null,
      parent: this.ast,
      container: this.ast,
      key: "program"
    }).setContext();
    this.scope = this.path.scope;
  }
  get shebang() {
    const {
      interpreter
    } = this.path.node;
    return interpreter ? interpreter.value : "";
  }
  set shebang(value) {
    if (value) {
      this.path.get("interpreter").replaceWith(interpreterDirective(value));
    } else {
      this.path.get("interpreter").remove();
    }
  }
  set(key, val) {
    if (key === "helpersNamespace") {
      throw new Error("Babel 7.0.0-beta.56 has dropped support for the 'helpersNamespace' utility." + "If you are using @babel/plugin-external-helpers you will need to use a newer " + "version than the one you currently have installed. " + "If you have your own implementation, you'll want to explore using 'helperGenerator' " + "alongside 'file.availableHelper()'.");
    }
    this._map.set(key, val);
  }
  get(key) {
    return this._map.get(key);
  }
  has(key) {
    return this._map.has(key);
  }
  getModuleName() {
    return getModuleName(this.opts, this.opts);
  }
  addImport() {
    throw new Error("This API has been removed. If you're looking for this " + "functionality in Babel 7, you should import the " + "'@babel/helper-module-imports' module and use the functions exposed " + " from that module, such as 'addNamed' or 'addDefault'.");
  }
  availableHelper(name, versionRange) {
    let minVersion;
    try {
      minVersion = helpers.minVersion(name);
    } catch (err) {
      if (err.code !== "BABEL_HELPER_UNKNOWN") throw err;
      return false;
    }
    if (typeof versionRange !== "string") return true;
    if (semver.valid(versionRange)) versionRange = `^${versionRange}`;
    return !semver.intersects(`<${minVersion}`, versionRange) && !semver.intersects(`>=8.0.0`, versionRange);
  }
  addHelper(name) {
    const declar = this.declarations[name];
    if (declar) return cloneNode$1(declar);
    const generator = this.get("helperGenerator");
    if (generator) {
      const res = generator(name);
      if (res) return res;
    }
    helpers.ensure(name, File);
    const uid = this.declarations[name] = this.scope.generateUidIdentifier(name);
    const dependencies = {};
    for (const dep of helpers.getDependencies(name)) {
      dependencies[dep] = this.addHelper(dep);
    }
    const {
      nodes,
      globals
    } = helpers.get(name, dep => dependencies[dep], uid, Object.keys(this.scope.getAllBindings()));
    globals.forEach(name => {
      if (this.path.scope.hasBinding(name, true)) {
        this.path.scope.rename(name);
      }
    });
    nodes.forEach(node => {
      node._compact = true;
    });
    this.path.unshiftContainer("body", nodes);
    this.path.get("body").forEach(path => {
      if (nodes.indexOf(path.node) === -1) return;
      if (path.isVariableDeclaration()) this.scope.registerDeclaration(path);
    });
    return uid;
  }
  addTemplateObject() {
    throw new Error("This function has been moved into the template literal transform itself.");
  }
  buildCodeFrameError(node, msg, _Error = SyntaxError) {
    let loc = node && (node.loc || node._loc);
    if (!loc && node) {
      const state = {
        loc: null
      };
      traverse(node, errorVisitor, this.scope, state);
      loc = state.loc;
      let txt = "This is an error on an internal node. Probably an internal error.";
      if (loc) txt += " Location has been estimated.";
      msg += ` (${txt})`;
    }
    if (loc) {
      const {
        highlightCode = true
      } = this.opts;
      msg += "\n" + codeFrameColumns(this.code, {
        start: {
          line: loc.start.line,
          column: loc.start.column + 1
        },
        end: loc.end && loc.start.line === loc.end.line ? {
          line: loc.end.line,
          column: loc.end.column + 1
        } : undefined
      }, {
        highlightCode
      });
    }
    return new _Error(msg);
  }
}

const {
  arrayExpression,
  assignmentExpression,
  binaryExpression,
  blockStatement,
  callExpression,
  cloneNode,
  conditionalExpression,
  exportNamedDeclaration,
  exportSpecifier,
  expressionStatement,
  functionExpression,
  identifier,
  memberExpression,
  objectExpression,
  program,
  stringLiteral,
  unaryExpression,
  variableDeclaration,
  variableDeclarator
} = _t;
const buildUmdWrapper = replacements => template.statement`
    (function (root, factory) {
      if (typeof define === "function" && define.amd) {
        define(AMD_ARGUMENTS, factory);
      } else if (typeof exports === "object") {
        factory(COMMON_ARGUMENTS);
      } else {
        factory(BROWSER_ARGUMENTS);
      }
    })(UMD_ROOT, function (FACTORY_PARAMETERS) {
      FACTORY_BODY
    });
  `(replacements);
function buildGlobal(allowlist) {
  const namespace = identifier("babelHelpers");
  const body = [];
  const container = functionExpression(null, [identifier("global")], blockStatement(body));
  const tree = program([expressionStatement(callExpression(container, [conditionalExpression(binaryExpression("===", unaryExpression("typeof", identifier("global")), stringLiteral("undefined")), identifier("self"), identifier("global"))]))]);
  body.push(variableDeclaration("var", [variableDeclarator(namespace, assignmentExpression("=", memberExpression(identifier("global"), namespace), objectExpression([])))]));
  buildHelpers(body, namespace, allowlist);
  return tree;
}
function buildModule(allowlist) {
  const body = [];
  const refs = buildHelpers(body, null, allowlist);
  body.unshift(exportNamedDeclaration(null, Object.keys(refs).map(name => {
    return exportSpecifier(cloneNode(refs[name]), identifier(name));
  })));
  return program(body, [], "module");
}
function buildUmd(allowlist) {
  const namespace = identifier("babelHelpers");
  const body = [];
  body.push(variableDeclaration("var", [variableDeclarator(namespace, identifier("global"))]));
  buildHelpers(body, namespace, allowlist);
  return program([buildUmdWrapper({
    FACTORY_PARAMETERS: identifier("global"),
    BROWSER_ARGUMENTS: assignmentExpression("=", memberExpression(identifier("root"), namespace), objectExpression([])),
    COMMON_ARGUMENTS: identifier("exports"),
    AMD_ARGUMENTS: arrayExpression([stringLiteral("exports")]),
    FACTORY_BODY: body,
    UMD_ROOT: identifier("this")
  })]);
}
function buildVar(allowlist) {
  const namespace = identifier("babelHelpers");
  const body = [];
  body.push(variableDeclaration("var", [variableDeclarator(namespace, objectExpression([]))]));
  const tree = program(body);
  buildHelpers(body, namespace, allowlist);
  body.push(expressionStatement(namespace));
  return tree;
}
function buildHelpers(body, namespace, allowlist) {
  const getHelperReference = name => {
    return namespace ? memberExpression(namespace, identifier(name)) : identifier(`_${name}`);
  };
  const refs = {};
  helpers.list.forEach(function (name) {
    if (allowlist && allowlist.indexOf(name) < 0) return;
    const ref = refs[name] = getHelperReference(name);
    helpers.ensure(name, File);
    const {
      nodes
    } = helpers.get(name, getHelperReference, ref);
    body.push(...nodes);
  });
  return refs;
}
function buildExternalHelpers (allowlist, outputType = "global") {
  let tree;
  const build = {
    global: buildGlobal,
    module: buildModule,
    umd: buildUmd,
    var: buildVar
  }[outputType];
  if (build) {
    tree = build(allowlist);
  } else {
    throw new Error(`Unsupported output type ${outputType}`);
  }
  return generate(tree).code;
}

const runGenerator = gensync(function* (item) {
  return yield* item;
});
const isAsync = gensync({
  sync: () => false,
  errback: cb => cb(null, true)
});
function maybeAsync(fn, message) {
  return gensync({
    sync(...args) {
      const result = fn.apply(this, args);
      if (isThenable$1(result)) throw new Error(message);
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
function forwardAsync(action, cb) {
  const g = gensync(action);
  return withKind(kind => {
    const adapted = g[kind];
    return cb(adapted);
  });
}
const onFirstPause = gensync({
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
const waitFor = gensync({
  sync: x => x,
  async: async x => x
});
function isThenable$1(val) {
  return !!val && (typeof val === "object" || typeof val === "function") && !!val.then && typeof val.then === "function";
}

function mergeOptions(target, source) {
  for (const k of Object.keys(source)) {
    if ((k === "parserOpts" || k === "generatorOpts" || k === "assumptions") && source[k]) {
      const parserOpts = source[k];
      const targetObj = target[k] || (target[k] = {});
      mergeDefaultFields(targetObj, parserOpts);
    } else {
      const val = source[k];
      if (val !== undefined) target[k] = val;
    }
  }
}
function mergeDefaultFields(target, source) {
  for (const k of Object.keys(source)) {
    const val = source[k];
    if (val !== undefined) target[k] = val;
  }
}
function isIterableIterator(value) {
  return !!value && typeof value.next === "function" && typeof value[Symbol.iterator] === "function";
}

const synchronize = gen => {
  return gensync(gen).sync;
};
function* genTrue() {
  return true;
}
function makeWeakCache(handler) {
  return makeCachedFunction(WeakMap, handler);
}
function makeWeakCacheSync(handler) {
  return synchronize(makeWeakCache(handler));
}
function makeStrongCache(handler) {
  return makeCachedFunction(Map, handler);
}
function makeStrongCacheSync(handler) {
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
    if (isThenable$1(key)) {
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
function assertSimpleType(value) {
  if (isThenable$1(value)) {
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

const readFile = gensync({
  sync: fs.readFileSync,
  errback: fs.readFile
});
const stat = gensync({
  sync: fs.statSync,
  errback: fs.stat
});

function makeStaticFileCache(fn) {
  return makeStrongCache(function* (filepath, cache) {
    const cached = cache.invalidate(() => fileMtime(filepath));
    if (cached === null) {
      return null;
    }
    return fn(filepath, yield* readFile(filepath, "utf8"));
  });
}
function fileMtime(filepath) {
  if (!fs.existsSync(filepath)) return null;
  try {
    return +fs.statSync(filepath).mtime;
  } catch (e) {
    if (e.code !== "ENOENT" && e.code !== "ENOTDIR") throw e;
  }
  return null;
}

const ErrorToString = Function.call.bind(Error.prototype.toString);
const SUPPORTED = !!Error.captureStackTrace && Object.getOwnPropertyDescriptor(Error, "stackTraceLimit")?.writable === true;
const START_HIDING = "startHiding - secret - don't use this - v1";
const STOP_HIDING = "stopHiding - secret - don't use this - v1";
const expectedErrors = new WeakSet();
const virtualFrames = new WeakMap();
function CallSite(filename) {
  return Object.create({
    isNative: () => false,
    isConstructor: () => false,
    isToplevel: () => true,
    getFileName: () => filename,
    getLineNumber: () => undefined,
    getColumnNumber: () => undefined,
    getFunctionName: () => undefined,
    getMethodName: () => undefined,
    getTypeName: () => undefined,
    toString: () => filename
  });
}
function injectVirtualStackFrame(error, filename) {
  if (!SUPPORTED) return;
  let frames = virtualFrames.get(error);
  if (!frames) virtualFrames.set(error, frames = []);
  frames.push(CallSite(filename));
  return error;
}
function expectedError(error) {
  if (!SUPPORTED) return;
  expectedErrors.add(error);
  return error;
}
function beginHiddenCallStack(fn) {
  if (!SUPPORTED) return fn;
  return Object.defineProperty(function (...args) {
    setupPrepareStackTrace();
    return fn(...args);
  }, "name", {
    value: STOP_HIDING
  });
}
function endHiddenCallStack(fn) {
  if (!SUPPORTED) return fn;
  return Object.defineProperty(function (...args) {
    return fn(...args);
  }, "name", {
    value: START_HIDING
  });
}
function setupPrepareStackTrace() {
  setupPrepareStackTrace = () => {};
  const {
    prepareStackTrace = defaultPrepareStackTrace
  } = Error;
  const MIN_STACK_TRACE_LIMIT = 50;
  Error.stackTraceLimit &&= Math.max(Error.stackTraceLimit, MIN_STACK_TRACE_LIMIT);
  Error.prepareStackTrace = function stackTraceRewriter(err, trace) {
    let newTrace = [];
    const isExpected = expectedErrors.has(err);
    let status = isExpected ? "hiding" : "unknown";
    for (let i = 0; i < trace.length; i++) {
      const name = trace[i].getFunctionName();
      if (name === START_HIDING) {
        status = "hiding";
      } else if (name === STOP_HIDING) {
        if (status === "hiding") {
          status = "showing";
          if (virtualFrames.has(err)) {
            newTrace.unshift(...virtualFrames.get(err));
          }
        } else if (status === "unknown") {
          newTrace = trace;
          break;
        }
      } else if (status !== "hiding") {
        newTrace.push(trace[i]);
      }
    }
    return prepareStackTrace(err, newTrace);
  };
}
function defaultPrepareStackTrace(err, trace) {
  if (trace.length === 0) return ErrorToString(err);
  return `${ErrorToString(err)}\n    at ${trace.join("\n    at ")}`;
}

class ConfigError extends Error {
  constructor(message, filename) {
    super(message);
    expectedError(this);
    if (filename) injectVirtualStackFrame(this, filename);
  }
}

const PACKAGE_FILENAME = "package.json";
const readConfigPackage = makeStaticFileCache((filepath, content) => {
  let options;
  try {
    options = JSON.parse(content);
  } catch (err) {
    throw new ConfigError(`Error while parsing JSON - ${err.message}`, filepath);
  }
  if (!options) throw new Error(`${filepath}: No config detected`);
  if (typeof options !== "object") {
    throw new ConfigError(`Config returned typeof ${typeof options}`, filepath);
  }
  if (Array.isArray(options)) {
    throw new ConfigError(`Expected config object but found array`, filepath);
  }
  return {
    filepath,
    dirname: path.dirname(filepath),
    options
  };
});
function* findPackageData(filepath) {
  let pkg = null;
  const directories = [];
  let isPackage = true;
  let dirname = path.dirname(filepath);
  while (!pkg && path.basename(dirname) !== "node_modules") {
    directories.push(dirname);
    pkg = yield* readConfigPackage(path.join(dirname, PACKAGE_FILENAME));
    const nextLoc = path.dirname(dirname);
    if (dirname === nextLoc) {
      isPackage = false;
      break;
    }
    dirname = nextLoc;
  }
  return {
    filepath,
    directories,
    pkg,
    isPackage
  };
}

function makeConfigAPI(cache) {
  const env = value => cache.using(data => {
    if (typeof value === "undefined") return data.envName;
    if (typeof value === "function") {
      return assertSimpleType(value(data.envName));
    }
    return (Array.isArray(value) ? value : [value]).some(entry => {
      if (typeof entry !== "string") {
        throw new Error("Unexpected non-string value");
      }
      return entry === data.envName;
    });
  });
  const caller = cb => cache.using(data => assertSimpleType(cb(data.caller)));
  return {
    version: version,
    cache: cache.simple(),
    env,
    async: () => false,
    caller,
    assertVersion
  };
}
function makePresetAPI(cache, externalDependencies) {
  const targets = () => JSON.parse(cache.using(data => JSON.stringify(data.targets)));
  const addExternalDependency = ref => {
    externalDependencies.push(ref);
  };
  return Object.assign({}, makeConfigAPI(cache), {
    targets,
    addExternalDependency
  });
}
function makePluginAPI(cache, externalDependencies) {
  const assumption = name => cache.using(data => data.assumptions[name]);
  return Object.assign({}, makePresetAPI(cache, externalDependencies), {
    assumption
  });
}
function assertVersion(range) {
  if (typeof range === "number") {
    if (!Number.isInteger(range)) {
      throw new Error("Expected string or integer value.");
    }
    range = `^${range}.0.0-0`;
  }
  if (typeof range !== "string") {
    throw new Error("Expected string or integer value.");
  }
  if (process.env.BABEL_8_BREAKING) {
    range += ` || ^8.0.0-0`;
  }
  if (semver.satisfies(version, range)) return;
  const limit = Error.stackTraceLimit;
  if (typeof limit === "number" && limit < 25) {
    Error.stackTraceLimit = 25;
  }
  const err = new Error(`Requires Babel "${range}", but was loaded with "${version}". ` + `If you are sure you have a compatible version of @babel/core, ` + `it is likely that something in your build process is loading the ` + `wrong version. Inspect the stack trace of this error to look for ` + `the first entry that doesn't mention "@babel/core" or "babel-core" ` + `to see what is calling Babel.`);
  if (typeof limit === "number") {
    Error.stackTraceLimit = limit;
  }
  throw Object.assign(err, {
    code: "BABEL_VERSION_UNSUPPORTED",
    version: version,
    range
  });
}

function finalize(deepArr) {
  return Object.freeze(deepArr);
}
function flattenToSet(arr) {
  const result = new Set();
  const stack = [arr];
  while (stack.length > 0) {
    for (const el of stack.pop()) {
      if (Array.isArray(el)) stack.push(el);else result.add(el);
    }
  }
  return result;
}

class Plugin {
  key;
  manipulateOptions;
  post;
  pre;
  visitor;
  parserOverride;
  generatorOverride;
  options;
  externalDependencies;
  constructor(plugin, options, key, externalDependencies = finalize([])) {
    this.key = plugin.name || key;
    this.manipulateOptions = plugin.manipulateOptions;
    this.post = plugin.post;
    this.pre = plugin.pre;
    this.visitor = plugin.visitor || {};
    this.parserOverride = plugin.parserOverride;
    this.generatorOverride = plugin.generatorOverride;
    this.options = options;
    this.externalDependencies = externalDependencies;
  }
}

function once(fn) {
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

function resolveBrowserslistConfigFile(browserslistConfigFile, configFileDir) {
  return path.resolve(configFileDir, browserslistConfigFile);
}
function resolveTargets(options, root) {
  const optTargets = options.targets;
  let targets;
  if (typeof optTargets === "string" || Array.isArray(optTargets)) {
    targets = {
      browsers: optTargets
    };
  } else if (optTargets) {
    if ("esmodules" in optTargets) {
      targets = Object.assign({}, optTargets, {
        esmodules: "intersect"
      });
    } else {
      targets = optTargets;
    }
  }
  const {
    browserslistConfigFile
  } = options;
  let configFile;
  let ignoreBrowserslistConfig = false;
  if (typeof browserslistConfigFile === "string") {
    configFile = browserslistConfigFile;
  } else {
    ignoreBrowserslistConfig = browserslistConfigFile === false;
  }
  return getTargets(targets, {
    ignoreBrowserslistConfig,
    configFile,
    configPath: root,
    browserslistEnv: options.browserslistEnv
  });
}

function isEqualDescriptor(a, b) {
  return a.name === b.name && a.value === b.value && a.options === b.options && a.dirname === b.dirname && a.alias === b.alias && a.ownPass === b.ownPass && (a.file && a.file.request) === (b.file && b.file.request) && (a.file && a.file.resolved) === (b.file && b.file.resolved);
}
function* handlerOf(value) {
  return value;
}
function optionsWithResolvedBrowserslistConfigFile(options, dirname) {
  if (typeof options.browserslistConfigFile === "string") {
    options.browserslistConfigFile = resolveBrowserslistConfigFile(options.browserslistConfigFile, dirname);
  }
  return options;
}
function createCachedDescriptors(dirname, options, alias) {
  const {
    plugins,
    presets,
    passPerPreset
  } = options;
  return {
    options: optionsWithResolvedBrowserslistConfigFile(options, dirname),
    plugins: plugins ? () => createCachedPluginDescriptors(plugins, dirname)(alias) : () => handlerOf([]),
    presets: presets ? () => createCachedPresetDescriptors(presets, dirname)(alias)(!!passPerPreset) : () => handlerOf([])
  };
}
function createUncachedDescriptors(dirname, options, alias) {
  return {
    options: optionsWithResolvedBrowserslistConfigFile(options, dirname),
    plugins: once(() => createPluginDescriptors(options.plugins || [], dirname, alias)),
    presets: once(() => createPresetDescriptors(options.presets || [], dirname, alias, !!options.passPerPreset))
  };
}
const PRESET_DESCRIPTOR_CACHE = new WeakMap();
const createCachedPresetDescriptors = makeWeakCacheSync((items, cache) => {
  const dirname = cache.using(dir => dir);
  return makeStrongCacheSync(alias => makeStrongCache(function* (passPerPreset) {
    const descriptors = yield* createPresetDescriptors(items, dirname, alias, passPerPreset);
    return descriptors.map(desc => loadCachedDescriptor(PRESET_DESCRIPTOR_CACHE, desc));
  }));
});
const PLUGIN_DESCRIPTOR_CACHE = new WeakMap();
const createCachedPluginDescriptors = makeWeakCacheSync((items, cache) => {
  const dirname = cache.using(dir => dir);
  return makeStrongCache(function* (alias) {
    const descriptors = yield* createPluginDescriptors(items, dirname, alias);
    return descriptors.map(desc => loadCachedDescriptor(PLUGIN_DESCRIPTOR_CACHE, desc));
  });
});
const DEFAULT_OPTIONS = {};
function loadCachedDescriptor(cache, desc) {
  const {
    value,
    options = DEFAULT_OPTIONS
  } = desc;
  if (options === false) return desc;
  let cacheByOptions = cache.get(value);
  if (!cacheByOptions) {
    cacheByOptions = new WeakMap();
    cache.set(value, cacheByOptions);
  }
  let possibilities = cacheByOptions.get(options);
  if (!possibilities) {
    possibilities = [];
    cacheByOptions.set(options, possibilities);
  }
  if (possibilities.indexOf(desc) === -1) {
    const matches = possibilities.filter(possibility => isEqualDescriptor(possibility, desc));
    if (matches.length > 0) {
      return matches[0];
    }
    possibilities.push(desc);
  }
  return desc;
}
function* createPresetDescriptors(items, dirname, alias, passPerPreset) {
  return yield* createDescriptors("preset", items, dirname, alias, passPerPreset);
}
function* createPluginDescriptors(items, dirname, alias) {
  return yield* createDescriptors("plugin", items, dirname, alias);
}
function* createDescriptors(type, items, dirname, alias, ownPass) {
  const descriptors = yield* gensync.all(items.map((item, index) => createDescriptor(item, dirname, {
    type,
    alias: `${alias}$${index}`,
    ownPass: !!ownPass
  })));
  assertNoDuplicates(descriptors);
  return descriptors;
}
function* createDescriptor(pair, dirname, {
  type,
  alias,
  ownPass
}) {
  const desc = getItemDescriptor(pair);
  if (desc) {
    return desc;
  }
  let name;
  let options;
  let value = pair;
  if (Array.isArray(value)) {
    if (value.length === 3) {
      [value, options, name] = value;
    } else {
      [value, options] = value;
    }
  }
  let file = undefined;
  let filepath = null;
  if (typeof value === "string") {
    if (typeof type !== "string") {
      throw new Error("To resolve a string-based item, the type of item must be given");
    }
    const resolver = type === "plugin" ? loadPlugin : loadPreset;
    const request = value;
    ({
      filepath,
      value
    } = yield* resolver(value, dirname));
    file = {
      request,
      resolved: filepath
    };
  }
  if (!value) {
    throw new Error(`Unexpected falsy value: ${String(value)}`);
  }
  if (typeof value === "object" && value.__esModule) {
    if (value.default) {
      value = value.default;
    } else {
      throw new Error("Must export a default export when using ES6 modules.");
    }
  }
  if (typeof value !== "object" && typeof value !== "function") {
    throw new Error(`Unsupported format: ${typeof value}. Expected an object or a function.`);
  }
  if (filepath !== null && typeof value === "object" && value) {
    throw new Error(`Plugin/Preset files are not allowed to export objects, only functions. In ${filepath}`);
  }
  return {
    name,
    alias: filepath || alias,
    value,
    options,
    dirname,
    ownPass,
    file
  };
}
function assertNoDuplicates(items) {
  const map = new Map();
  for (const item of items) {
    if (typeof item.value !== "function") continue;
    let nameMap = map.get(item.value);
    if (!nameMap) {
      nameMap = new Set();
      map.set(item.value, nameMap);
    }
    if (nameMap.has(item.name)) {
      const conflicts = items.filter(i => i.value === item.value);
      throw new Error([`Duplicate plugin/preset detected.`, `If you'd like to use two separate instances of a plugin,`, `they need separate names, e.g.`, ``, `  plugins: [`, `    ['some-plugin', {}],`, `    ['some-plugin', {}, 'some unique name'],`, `  ]`, ``, `Duplicates detected are:`, `${JSON.stringify(conflicts, null, 2)}`].join("\n"));
    }
    nameMap.add(item.name);
  }
}

function createItemFromDescriptor(desc) {
  return new ConfigItem(desc);
}
function* createConfigItem$1(value, {
  dirname = ".",
  type
} = {}) {
  const descriptor = yield* createDescriptor(value, path.resolve(dirname), {
    type,
    alias: "programmatic item"
  });
  return createItemFromDescriptor(descriptor);
}
const CONFIG_ITEM_BRAND = Symbol.for("@babel/core@7 - ConfigItem");
function getItemDescriptor(item) {
  if (item?.[CONFIG_ITEM_BRAND]) {
    return item._descriptor;
  }
  return undefined;
}
class ConfigItem {
  _descriptor;
  [CONFIG_ITEM_BRAND] = true;
  value;
  options;
  dirname;
  name;
  file;
  constructor(descriptor) {
    this._descriptor = descriptor;
    Object.defineProperty(this, "_descriptor", {
      enumerable: false
    });
    Object.defineProperty(this, CONFIG_ITEM_BRAND, {
      enumerable: false
    });
    this.value = this._descriptor.value;
    this.options = this._descriptor.options;
    this.dirname = this._descriptor.dirname;
    this.name = this._descriptor.name;
    this.file = this._descriptor.file ? {
      request: this._descriptor.file.request,
      resolved: this._descriptor.file.resolved
    } : undefined;
    Object.freeze(this);
  }
}
Object.freeze(ConfigItem.prototype);

var removed = {
  auxiliaryComment: {
    message: "Use `auxiliaryCommentBefore` or `auxiliaryCommentAfter`"
  },
  blacklist: {
    message: "Put the specific transforms you want in the `plugins` option"
  },
  breakConfig: {
    message: "This is not a necessary option in Babel 6"
  },
  experimental: {
    message: "Put the specific transforms you want in the `plugins` option"
  },
  externalHelpers: {
    message: "Use the `external-helpers` plugin instead. " + "Check out http://babeljs.io/docs/plugins/external-helpers/"
  },
  extra: {
    message: ""
  },
  jsxPragma: {
    message: "use the `pragma` option in the `react-jsx` plugin. " + "Check out http://babeljs.io/docs/plugins/transform-react-jsx/"
  },
  loose: {
    message: "Specify the `loose` option for the relevant plugin you are using " + "or use a preset that sets the option."
  },
  metadataUsedHelpers: {
    message: "Not required anymore as this is enabled by default"
  },
  modules: {
    message: "Use the corresponding module transform plugin in the `plugins` option. " + "Check out http://babeljs.io/docs/plugins/#modules"
  },
  nonStandard: {
    message: "Use the `react-jsx` and `flow-strip-types` plugins to support JSX and Flow. " + "Also check out the react preset http://babeljs.io/docs/plugins/preset-react/"
  },
  optional: {
    message: "Put the specific transforms you want in the `plugins` option"
  },
  sourceMapName: {
    message: "The `sourceMapName` option has been removed because it makes more sense for the " + "tooling that calls Babel to assign `map.file` themselves."
  },
  stage: {
    message: "Check out the corresponding stage-x presets http://babeljs.io/docs/plugins/#presets"
  },
  whitelist: {
    message: "Put the specific transforms you want in the `plugins` option"
  },
  resolveModuleSource: {
    version: 6,
    message: "Use `babel-plugin-module-resolver@3`'s 'resolvePath' options"
  },
  metadata: {
    version: 6,
    message: "Generated plugin metadata is always included in the output result"
  },
  sourceMapTarget: {
    version: 6,
    message: "The `sourceMapTarget` option has been removed because it makes more sense for the tooling " + "that calls Babel to assign `map.file` themselves."
  }
};

function msg(loc) {
  switch (loc.type) {
    case "root":
      return ``;
    case "env":
      return `${msg(loc.parent)}.env["${loc.name}"]`;
    case "overrides":
      return `${msg(loc.parent)}.overrides[${loc.index}]`;
    case "option":
      return `${msg(loc.parent)}.${loc.name}`;
    case "access":
      return `${msg(loc.parent)}[${JSON.stringify(loc.name)}]`;
    default:
      throw new Error(`Assertion failure: Unknown type ${loc.type}`);
  }
}
function access(loc, name) {
  return {
    type: "access",
    name,
    parent: loc
  };
}
function assertRootMode(loc, value) {
  if (value !== undefined && value !== "root" && value !== "upward" && value !== "upward-optional") {
    throw new Error(`${msg(loc)} must be a "root", "upward", "upward-optional" or undefined`);
  }
  return value;
}
function assertSourceMaps(loc, value) {
  if (value !== undefined && typeof value !== "boolean" && value !== "inline" && value !== "both") {
    throw new Error(`${msg(loc)} must be a boolean, "inline", "both", or undefined`);
  }
  return value;
}
function assertCompact(loc, value) {
  if (value !== undefined && typeof value !== "boolean" && value !== "auto") {
    throw new Error(`${msg(loc)} must be a boolean, "auto", or undefined`);
  }
  return value;
}
function assertSourceType(loc, value) {
  if (value !== undefined && value !== "module" && value !== "script" && value !== "unambiguous") {
    throw new Error(`${msg(loc)} must be "module", "script", "unambiguous", or undefined`);
  }
  return value;
}
function assertCallerMetadata(loc, value) {
  const obj = assertObject(loc, value);
  if (obj) {
    if (typeof obj.name !== "string") {
      throw new Error(`${msg(loc)} set but does not contain "name" property string`);
    }
    for (const prop of Object.keys(obj)) {
      const propLoc = access(loc, prop);
      const value = obj[prop];
      if (value != null && typeof value !== "boolean" && typeof value !== "string" && typeof value !== "number") {
        throw new Error(`${msg(propLoc)} must be null, undefined, a boolean, a string, or a number.`);
      }
    }
  }
  return value;
}
function assertInputSourceMap(loc, value) {
  if (value !== undefined && typeof value !== "boolean" && (typeof value !== "object" || !value)) {
    throw new Error(`${msg(loc)} must be a boolean, object, or undefined`);
  }
  return value;
}
function assertString(loc, value) {
  if (value !== undefined && typeof value !== "string") {
    throw new Error(`${msg(loc)} must be a string, or undefined`);
  }
  return value;
}
function assertFunction(loc, value) {
  if (value !== undefined && typeof value !== "function") {
    throw new Error(`${msg(loc)} must be a function, or undefined`);
  }
  return value;
}
function assertBoolean(loc, value) {
  if (value !== undefined && typeof value !== "boolean") {
    throw new Error(`${msg(loc)} must be a boolean, or undefined`);
  }
  return value;
}
function assertObject(loc, value) {
  if (value !== undefined && (typeof value !== "object" || Array.isArray(value) || !value)) {
    throw new Error(`${msg(loc)} must be an object, or undefined`);
  }
  return value;
}
function assertArray(loc, value) {
  if (value != null && !Array.isArray(value)) {
    throw new Error(`${msg(loc)} must be an array, or undefined`);
  }
  return value;
}
function assertIgnoreList(loc, value) {
  const arr = assertArray(loc, value);
  arr?.forEach((item, i) => assertIgnoreItem(access(loc, i), item));
  return arr;
}
function assertIgnoreItem(loc, value) {
  if (typeof value !== "string" && typeof value !== "function" && !(value instanceof RegExp)) {
    throw new Error(`${msg(loc)} must be an array of string/Function/RegExp values, or undefined`);
  }
  return value;
}
function assertConfigApplicableTest(loc, value) {
  if (value === undefined) {
    return value;
  }
  if (Array.isArray(value)) {
    value.forEach((item, i) => {
      if (!checkValidTest(item)) {
        throw new Error(`${msg(access(loc, i))} must be a string/Function/RegExp.`);
      }
    });
  } else if (!checkValidTest(value)) {
    throw new Error(`${msg(loc)} must be a string/Function/RegExp, or an array of those`);
  }
  return value;
}
function checkValidTest(value) {
  return typeof value === "string" || typeof value === "function" || value instanceof RegExp;
}
function assertConfigFileSearch(loc, value) {
  if (value !== undefined && typeof value !== "boolean" && typeof value !== "string") {
    throw new Error(`${msg(loc)} must be a undefined, a boolean, a string, ` + `got ${JSON.stringify(value)}`);
  }
  return value;
}
function assertBabelrcSearch(loc, value) {
  if (value === undefined || typeof value === "boolean") {
    return value;
  }
  if (Array.isArray(value)) {
    value.forEach((item, i) => {
      if (!checkValidTest(item)) {
        throw new Error(`${msg(access(loc, i))} must be a string/Function/RegExp.`);
      }
    });
  } else if (!checkValidTest(value)) {
    throw new Error(`${msg(loc)} must be a undefined, a boolean, a string/Function/RegExp ` + `or an array of those, got ${JSON.stringify(value)}`);
  }
  return value;
}
function assertPluginList(loc, value) {
  const arr = assertArray(loc, value);
  if (arr) {
    arr.forEach((item, i) => assertPluginItem(access(loc, i), item));
  }
  return arr;
}
function assertPluginItem(loc, value) {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      throw new Error(`${msg(loc)} must include an object`);
    }
    if (value.length > 3) {
      throw new Error(`${msg(loc)} may only be a two-tuple or three-tuple`);
    }
    assertPluginTarget(access(loc, 0), value[0]);
    if (value.length > 1) {
      const opts = value[1];
      if (opts !== undefined && opts !== false && (typeof opts !== "object" || Array.isArray(opts) || opts === null)) {
        throw new Error(`${msg(access(loc, 1))} must be an object, false, or undefined`);
      }
    }
    if (value.length === 3) {
      const name = value[2];
      if (name !== undefined && typeof name !== "string") {
        throw new Error(`${msg(access(loc, 2))} must be a string, or undefined`);
      }
    }
  } else {
    assertPluginTarget(loc, value);
  }
  return value;
}
function assertPluginTarget(loc, value) {
  if ((typeof value !== "object" || !value) && typeof value !== "string" && typeof value !== "function") {
    throw new Error(`${msg(loc)} must be a string, object, function`);
  }
  return value;
}
function assertTargets(loc, value) {
  if (isBrowsersQueryValid(value)) return value;
  if (typeof value !== "object" || !value || Array.isArray(value)) {
    throw new Error(`${msg(loc)} must be a string, an array of strings or an object`);
  }
  const browsersLoc = access(loc, "browsers");
  const esmodulesLoc = access(loc, "esmodules");
  assertBrowsersList(browsersLoc, value.browsers);
  assertBoolean(esmodulesLoc, value.esmodules);
  for (const key of Object.keys(value)) {
    const val = value[key];
    const subLoc = access(loc, key);
    if (key === "esmodules") assertBoolean(subLoc, val);else if (key === "browsers") assertBrowsersList(subLoc, val);else if (!Object.hasOwnProperty.call(TargetNames, key)) {
      const validTargets = Object.keys(TargetNames).join(", ");
      throw new Error(`${msg(subLoc)} is not a valid target. Supported targets are ${validTargets}`);
    } else assertBrowserVersion(subLoc, val);
  }
  return value;
}
function assertBrowsersList(loc, value) {
  if (value !== undefined && !isBrowsersQueryValid(value)) {
    throw new Error(`${msg(loc)} must be undefined, a string or an array of strings`);
  }
}
function assertBrowserVersion(loc, value) {
  if (typeof value === "number" && Math.round(value) === value) return;
  if (typeof value === "string") return;
  throw new Error(`${msg(loc)} must be a string or an integer number`);
}
function assertAssumptions(loc, value) {
  if (value === undefined) return;
  if (typeof value !== "object" || value === null) {
    throw new Error(`${msg(loc)} must be an object or undefined.`);
  }
  let root = loc;
  do {
    root = root.parent;
  } while (root.type !== "root");
  const inPreset = root.source === "preset";
  for (const name of Object.keys(value)) {
    const subLoc = access(loc, name);
    if (!assumptionsNames.has(name)) {
      throw new Error(`${msg(subLoc)} is not a supported assumption.`);
    }
    if (typeof value[name] !== "boolean") {
      throw new Error(`${msg(subLoc)} must be a boolean.`);
    }
    if (inPreset && value[name] === false) {
      throw new Error(`${msg(subLoc)} cannot be set to 'false' inside presets.`);
    }
  }
  return value;
}

const ROOT_VALIDATORS = {
  cwd: assertString,
  root: assertString,
  rootMode: assertRootMode,
  configFile: assertConfigFileSearch,
  caller: assertCallerMetadata,
  filename: assertString,
  filenameRelative: assertString,
  code: assertBoolean,
  ast: assertBoolean,
  cloneInputAst: assertBoolean,
  envName: assertString
};
const BABELRC_VALIDATORS = {
  babelrc: assertBoolean,
  babelrcRoots: assertBabelrcSearch
};
const NONPRESET_VALIDATORS = {
  extends: assertString,
  ignore: assertIgnoreList,
  only: assertIgnoreList,
  targets: assertTargets,
  browserslistConfigFile: assertConfigFileSearch,
  browserslistEnv: assertString
};
const COMMON_VALIDATORS = {
  inputSourceMap: assertInputSourceMap,
  presets: assertPluginList,
  plugins: assertPluginList,
  passPerPreset: assertBoolean,
  assumptions: assertAssumptions,
  env: assertEnvSet,
  overrides: assertOverridesList,
  test: assertConfigApplicableTest,
  include: assertConfigApplicableTest,
  exclude: assertConfigApplicableTest,
  retainLines: assertBoolean,
  comments: assertBoolean,
  shouldPrintComment: assertFunction,
  compact: assertCompact,
  minified: assertBoolean,
  auxiliaryCommentBefore: assertString,
  auxiliaryCommentAfter: assertString,
  sourceType: assertSourceType,
  wrapPluginVisitorMethod: assertFunction,
  highlightCode: assertBoolean,
  sourceMaps: assertSourceMaps,
  sourceMap: assertSourceMaps,
  sourceFileName: assertString,
  sourceRoot: assertString,
  parserOpts: assertObject,
  generatorOpts: assertObject
};
if (!process.env.BABEL_8_BREAKING) {
  Object.assign(COMMON_VALIDATORS, {
    getModuleId: assertFunction,
    moduleRoot: assertString,
    moduleIds: assertBoolean,
    moduleId: assertString
  });
}
const knownAssumptions = ["arrayLikeIsIterable", "constantReexports", "constantSuper", "enumerableModuleMeta", "ignoreFunctionLength", "ignoreToPrimitiveHint", "iterableIsArray", "mutableTemplateObject", "noClassCalls", "noDocumentAll", "noIncompleteNsImportDetection", "noNewArrows", "objectRestNoSymbols", "privateFieldsAsSymbols", "privateFieldsAsProperties", "pureGetters", "setClassMethods", "setComputedProperties", "setPublicClassFields", "setSpreadProperties", "skipForOfIteratorClosing", "superIsCallableConstructor"];
const assumptionsNames = new Set(knownAssumptions);
function getSource(loc) {
  return loc.type === "root" ? loc.source : getSource(loc.parent);
}
function validate(type, opts, filename) {
  try {
    return validateNested({
      type: "root",
      source: type
    }, opts);
  } catch (error) {
    const configError = new ConfigError(error.message, filename);
    if (error.code) configError.code = error.code;
    throw configError;
  }
}
function validateNested(loc, opts) {
  const type = getSource(loc);
  assertNoDuplicateSourcemap(opts);
  Object.keys(opts).forEach(key => {
    const optLoc = {
      type: "option",
      name: key,
      parent: loc
    };
    if (type === "preset" && NONPRESET_VALIDATORS[key]) {
      throw new Error(`${msg(optLoc)} is not allowed in preset options`);
    }
    if (type !== "arguments" && ROOT_VALIDATORS[key]) {
      throw new Error(`${msg(optLoc)} is only allowed in root programmatic options`);
    }
    if (type !== "arguments" && type !== "configfile" && BABELRC_VALIDATORS[key]) {
      if (type === "babelrcfile" || type === "extendsfile") {
        throw new Error(`${msg(optLoc)} is not allowed in .babelrc or "extends"ed files, only in root programmatic options, ` + `or babel.config.js/config file options`);
      }
      throw new Error(`${msg(optLoc)} is only allowed in root programmatic options, or babel.config.js/config file options`);
    }
    const validator = COMMON_VALIDATORS[key] || NONPRESET_VALIDATORS[key] || BABELRC_VALIDATORS[key] || ROOT_VALIDATORS[key] || throwUnknownError;
    validator(optLoc, opts[key]);
  });
  return opts;
}
function throwUnknownError(loc) {
  const key = loc.name;
  if (removed[key]) {
    const {
      message,
      version = 5
    } = removed[key];
    throw new Error(`Using removed Babel ${version} option: ${msg(loc)} - ${message}`);
  } else {
    const unknownOptErr = new Error(`Unknown option: ${msg(loc)}. Check out https://babeljs.io/docs/en/babel-core/#options for more information about options.`);
    unknownOptErr.code = "BABEL_UNKNOWN_OPTION";
    throw unknownOptErr;
  }
}
function has(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}
function assertNoDuplicateSourcemap(opts) {
  if (has(opts, "sourceMap") && has(opts, "sourceMaps")) {
    throw new Error(".sourceMap is an alias for .sourceMaps, cannot use both");
  }
}
function assertEnvSet(loc, value) {
  if (loc.parent.type === "env") {
    throw new Error(`${msg(loc)} is not allowed inside of another .env block`);
  }
  const parent = loc.parent;
  const obj = assertObject(loc, value);
  if (obj) {
    for (const envName of Object.keys(obj)) {
      const env = assertObject(access(loc, envName), obj[envName]);
      if (!env) continue;
      const envLoc = {
        type: "env",
        name: envName,
        parent
      };
      validateNested(envLoc, env);
    }
  }
  return obj;
}
function assertOverridesList(loc, value) {
  if (loc.parent.type === "env") {
    throw new Error(`${msg(loc)} is not allowed inside an .env block`);
  }
  if (loc.parent.type === "overrides") {
    throw new Error(`${msg(loc)} is not allowed inside an .overrides block`);
  }
  const parent = loc.parent;
  const arr = assertArray(loc, value);
  if (arr) {
    for (const [index, item] of arr.entries()) {
      const objLoc = access(loc, index);
      const env = assertObject(objLoc, item);
      if (!env) throw new Error(`${msg(objLoc)} must be an object`);
      const overridesLoc = {
        type: "overrides",
        index,
        parent
      };
      validateNested(overridesLoc, env);
    }
  }
  return arr;
}
function checkNoUnwrappedItemOptionPairs(items, index, type, e) {
  if (index === 0) return;
  const lastItem = items[index - 1];
  const thisItem = items[index];
  if (lastItem.file && lastItem.options === undefined && typeof thisItem.value === "object") {
    e.message += `\n- Maybe you meant to use\n` + `"${type}s": [\n  ["${lastItem.file.request}", ${JSON.stringify(thisItem.value, undefined, 2)}]\n]\n` + `To be a valid ${type}, its name and options should be wrapped in a pair of brackets`;
  }
}

const sep = `\\${path.sep}`;
const endSep = `(?:${sep}|$)`;
const substitution = `[^${sep}]+`;
const starPat = `(?:${substitution}${sep})`;
const starPatLast = `(?:${substitution}${endSep})`;
const starStarPat = `${starPat}*?`;
const starStarPatLast = `${starPat}*?${starPatLast}?`;
function escapeRegExp(string) {
  return string.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&");
}
function pathToPattern(pattern, dirname) {
  const parts = path.resolve(dirname, pattern).split(path.sep);
  return new RegExp(["^", ...parts.map((part, i) => {
    const last = i === parts.length - 1;
    if (part === "**") return last ? starStarPatLast : starStarPat;
    if (part === "*") return last ? starPatLast : starPat;
    if (part.indexOf("*.") === 0) {
      return substitution + escapeRegExp(part.slice(1)) + (last ? endSep : sep);
    }
    return escapeRegExp(part) + (last ? endSep : sep);
  })].join(""));
}

const ChainFormatter = {
  Programmatic: 0,
  Config: 1
};
const Formatter = {
  title(type, callerName, filepath) {
    let title = "";
    if (type === ChainFormatter.Programmatic) {
      title = "programmatic options";
      if (callerName) {
        title += " from " + callerName;
      }
    } else {
      title = "config " + filepath;
    }
    return title;
  },
  loc(index, envName) {
    let loc = "";
    if (index != null) {
      loc += `.overrides[${index}]`;
    }
    if (envName != null) {
      loc += `.env["${envName}"]`;
    }
    return loc;
  },
  *optionsAndDescriptors(opt) {
    const content = Object.assign({}, opt.options);
    delete content.overrides;
    delete content.env;
    const pluginDescriptors = [...(yield* opt.plugins())];
    if (pluginDescriptors.length) {
      content.plugins = pluginDescriptors.map(d => descriptorToConfig(d));
    }
    const presetDescriptors = [...(yield* opt.presets())];
    if (presetDescriptors.length) {
      content.presets = [...presetDescriptors].map(d => descriptorToConfig(d));
    }
    return JSON.stringify(content, undefined, 2);
  }
};
function descriptorToConfig(d) {
  let name = d.file?.request;
  if (name == null) {
    if (typeof d.value === "object") {
      name = d.value;
    } else if (typeof d.value === "function") {
      name = `[Function: ${d.value.toString().slice(0, 50)} ... ]`;
    }
  }
  if (name == null) {
    name = "[Unknown]";
  }
  if (d.options === undefined) {
    return name;
  } else if (d.name == null) {
    return [name, d.options];
  } else {
    return [name, d.options, d.name];
  }
}
class ConfigPrinter {
  _stack = [];
  configure(enabled, type, {
    callerName,
    filepath
  }) {
    if (!enabled) return () => {};
    return (content, index, envName) => {
      this._stack.push({
        type,
        callerName,
        filepath,
        content,
        index,
        envName
      });
    };
  }
  static *format(config) {
    let title = Formatter.title(config.type, config.callerName, config.filepath);
    const loc = Formatter.loc(config.index, config.envName);
    if (loc) title += ` ${loc}`;
    const content = yield* Formatter.optionsAndDescriptors(config.content);
    return `${title}\n${content}`;
  }
  *output() {
    if (this._stack.length === 0) return "";
    const configs = yield* gensync.all(this._stack.map(s => ConfigPrinter.format(s)));
    return configs.join("\n\n");
  }
}

const debug$3 = buildDebug("babel:config:config-chain");
function* buildPresetChain(arg, context) {
  const chain = yield* buildPresetChainWalker(arg, context);
  if (!chain) return null;
  return {
    plugins: dedupDescriptors(chain.plugins),
    presets: dedupDescriptors(chain.presets),
    options: chain.options.map(o => normalizeOptions$1(o)),
    files: new Set()
  };
}
const buildPresetChainWalker = makeChainWalker({
  root: preset => loadPresetDescriptors(preset),
  env: (preset, envName) => loadPresetEnvDescriptors(preset)(envName),
  overrides: (preset, index) => loadPresetOverridesDescriptors(preset)(index),
  overridesEnv: (preset, index, envName) => loadPresetOverridesEnvDescriptors(preset)(index)(envName),
  createLogger: () => () => {}
});
const loadPresetDescriptors = makeWeakCacheSync(preset => buildRootDescriptors(preset, preset.alias, createUncachedDescriptors));
const loadPresetEnvDescriptors = makeWeakCacheSync(preset => makeStrongCacheSync(envName => buildEnvDescriptors(preset, preset.alias, createUncachedDescriptors, envName)));
const loadPresetOverridesDescriptors = makeWeakCacheSync(preset => makeStrongCacheSync(index => buildOverrideDescriptors(preset, preset.alias, createUncachedDescriptors, index)));
const loadPresetOverridesEnvDescriptors = makeWeakCacheSync(preset => makeStrongCacheSync(index => makeStrongCacheSync(envName => buildOverrideEnvDescriptors(preset, preset.alias, createUncachedDescriptors, index, envName))));
function* buildRootChain(opts, context) {
  let configReport, babelRcReport;
  const programmaticLogger = new ConfigPrinter();
  const programmaticChain = yield* loadProgrammaticChain({
    options: opts,
    dirname: context.cwd
  }, context, undefined, programmaticLogger);
  if (!programmaticChain) return null;
  const programmaticReport = yield* programmaticLogger.output();
  let configFile;
  if (typeof opts.configFile === "string") {
    configFile = yield* loadConfig(opts.configFile, context.cwd, context.envName, context.caller);
  } else if (opts.configFile !== false) {
    configFile = yield* findRootConfig(context.root, context.envName, context.caller);
  }
  let {
    babelrc,
    babelrcRoots
  } = opts;
  let babelrcRootsDirectory = context.cwd;
  const configFileChain = emptyChain();
  const configFileLogger = new ConfigPrinter();
  if (configFile) {
    const validatedFile = validateConfigFile(configFile);
    const result = yield* loadFileChain(validatedFile, context, undefined, configFileLogger);
    if (!result) return null;
    configReport = yield* configFileLogger.output();
    if (babelrc === undefined) {
      babelrc = validatedFile.options.babelrc;
    }
    if (babelrcRoots === undefined) {
      babelrcRootsDirectory = validatedFile.dirname;
      babelrcRoots = validatedFile.options.babelrcRoots;
    }
    mergeChain(configFileChain, result);
  }
  let ignoreFile, babelrcFile;
  let isIgnored = false;
  const fileChain = emptyChain();
  if ((babelrc === true || babelrc === undefined) && typeof context.filename === "string") {
    const pkgData = yield* findPackageData(context.filename);
    if (pkgData && babelrcLoadEnabled(context, pkgData, babelrcRoots, babelrcRootsDirectory)) {
      ({
        ignore: ignoreFile,
        config: babelrcFile
      } = yield* findRelativeConfig(pkgData, context.envName, context.caller));
      if (ignoreFile) {
        fileChain.files.add(ignoreFile.filepath);
      }
      if (ignoreFile && shouldIgnore(context, ignoreFile.ignore, null, ignoreFile.dirname)) {
        isIgnored = true;
      }
      if (babelrcFile && !isIgnored) {
        const validatedFile = validateBabelrcFile(babelrcFile);
        const babelrcLogger = new ConfigPrinter();
        const result = yield* loadFileChain(validatedFile, context, undefined, babelrcLogger);
        if (!result) {
          isIgnored = true;
        } else {
          babelRcReport = yield* babelrcLogger.output();
          mergeChain(fileChain, result);
        }
      }
      if (babelrcFile && isIgnored) {
        fileChain.files.add(babelrcFile.filepath);
      }
    }
  }
  if (context.showConfig) {
    console.log(`Babel configs on "${context.filename}" (ascending priority):\n` + [configReport, babelRcReport, programmaticReport].filter(x => !!x).join("\n\n") + "\n-----End Babel configs-----");
  }
  const chain = mergeChain(mergeChain(mergeChain(emptyChain(), configFileChain), fileChain), programmaticChain);
  return {
    plugins: isIgnored ? [] : dedupDescriptors(chain.plugins),
    presets: isIgnored ? [] : dedupDescriptors(chain.presets),
    options: isIgnored ? [] : chain.options.map(o => normalizeOptions$1(o)),
    fileHandling: isIgnored ? "ignored" : "transpile",
    ignore: ignoreFile || undefined,
    babelrc: babelrcFile || undefined,
    config: configFile || undefined,
    files: chain.files
  };
}
function babelrcLoadEnabled(context, pkgData, babelrcRoots, babelrcRootsDirectory) {
  if (typeof babelrcRoots === "boolean") return babelrcRoots;
  const absoluteRoot = context.root;
  if (babelrcRoots === undefined) {
    return pkgData.directories.indexOf(absoluteRoot) !== -1;
  }
  let babelrcPatterns = babelrcRoots;
  if (!Array.isArray(babelrcPatterns)) {
    babelrcPatterns = [babelrcPatterns];
  }
  babelrcPatterns = babelrcPatterns.map(pat => {
    return typeof pat === "string" ? path.resolve(babelrcRootsDirectory, pat) : pat;
  });
  if (babelrcPatterns.length === 1 && babelrcPatterns[0] === absoluteRoot) {
    return pkgData.directories.indexOf(absoluteRoot) !== -1;
  }
  return babelrcPatterns.some(pat => {
    if (typeof pat === "string") {
      pat = pathToPattern(pat, babelrcRootsDirectory);
    }
    return pkgData.directories.some(directory => {
      return matchPattern(pat, babelrcRootsDirectory, directory, context);
    });
  });
}
const validateConfigFile = makeWeakCacheSync(file => ({
  filepath: file.filepath,
  dirname: file.dirname,
  options: validate("configfile", file.options, file.filepath)
}));
const validateBabelrcFile = makeWeakCacheSync(file => ({
  filepath: file.filepath,
  dirname: file.dirname,
  options: validate("babelrcfile", file.options, file.filepath)
}));
const validateExtendFile = makeWeakCacheSync(file => ({
  filepath: file.filepath,
  dirname: file.dirname,
  options: validate("extendsfile", file.options, file.filepath)
}));
const loadProgrammaticChain = makeChainWalker({
  root: input => buildRootDescriptors(input, "base", createCachedDescriptors),
  env: (input, envName) => buildEnvDescriptors(input, "base", createCachedDescriptors, envName),
  overrides: (input, index) => buildOverrideDescriptors(input, "base", createCachedDescriptors, index),
  overridesEnv: (input, index, envName) => buildOverrideEnvDescriptors(input, "base", createCachedDescriptors, index, envName),
  createLogger: (input, context, baseLogger) => buildProgrammaticLogger(input, context, baseLogger)
});
const loadFileChainWalker = makeChainWalker({
  root: file => loadFileDescriptors(file),
  env: (file, envName) => loadFileEnvDescriptors(file)(envName),
  overrides: (file, index) => loadFileOverridesDescriptors(file)(index),
  overridesEnv: (file, index, envName) => loadFileOverridesEnvDescriptors(file)(index)(envName),
  createLogger: (file, context, baseLogger) => buildFileLogger(file.filepath, context, baseLogger)
});
function* loadFileChain(input, context, files, baseLogger) {
  const chain = yield* loadFileChainWalker(input, context, files, baseLogger);
  chain?.files.add(input.filepath);
  return chain;
}
const loadFileDescriptors = makeWeakCacheSync(file => buildRootDescriptors(file, file.filepath, createUncachedDescriptors));
const loadFileEnvDescriptors = makeWeakCacheSync(file => makeStrongCacheSync(envName => buildEnvDescriptors(file, file.filepath, createUncachedDescriptors, envName)));
const loadFileOverridesDescriptors = makeWeakCacheSync(file => makeStrongCacheSync(index => buildOverrideDescriptors(file, file.filepath, createUncachedDescriptors, index)));
const loadFileOverridesEnvDescriptors = makeWeakCacheSync(file => makeStrongCacheSync(index => makeStrongCacheSync(envName => buildOverrideEnvDescriptors(file, file.filepath, createUncachedDescriptors, index, envName))));
function buildFileLogger(filepath, context, baseLogger) {
  if (!baseLogger) {
    return () => {};
  }
  return baseLogger.configure(context.showConfig, ChainFormatter.Config, {
    filepath
  });
}
function buildRootDescriptors({
  dirname,
  options
}, alias, descriptors) {
  return descriptors(dirname, options, alias);
}
function buildProgrammaticLogger(_, context, baseLogger) {
  if (!baseLogger) {
    return () => {};
  }
  return baseLogger.configure(context.showConfig, ChainFormatter.Programmatic, {
    callerName: context.caller?.name
  });
}
function buildEnvDescriptors({
  dirname,
  options
}, alias, descriptors, envName) {
  const opts = options.env && options.env[envName];
  return opts ? descriptors(dirname, opts, `${alias}.env["${envName}"]`) : null;
}
function buildOverrideDescriptors({
  dirname,
  options
}, alias, descriptors, index) {
  const opts = options.overrides && options.overrides[index];
  if (!opts) throw new Error("Assertion failure - missing override");
  return descriptors(dirname, opts, `${alias}.overrides[${index}]`);
}
function buildOverrideEnvDescriptors({
  dirname,
  options
}, alias, descriptors, index, envName) {
  const override = options.overrides && options.overrides[index];
  if (!override) throw new Error("Assertion failure - missing override");
  const opts = override.env && override.env[envName];
  return opts ? descriptors(dirname, opts, `${alias}.overrides[${index}].env["${envName}"]`) : null;
}
function makeChainWalker({
  root,
  env,
  overrides,
  overridesEnv,
  createLogger
}) {
  return function* chainWalker(input, context, files = new Set(), baseLogger) {
    const {
      dirname
    } = input;
    const flattenedConfigs = [];
    const rootOpts = root(input);
    if (configIsApplicable(rootOpts, dirname, context, input.filepath)) {
      flattenedConfigs.push({
        config: rootOpts,
        envName: undefined,
        index: undefined
      });
      const envOpts = env(input, context.envName);
      if (envOpts && configIsApplicable(envOpts, dirname, context, input.filepath)) {
        flattenedConfigs.push({
          config: envOpts,
          envName: context.envName,
          index: undefined
        });
      }
      (rootOpts.options.overrides || []).forEach((_, index) => {
        const overrideOps = overrides(input, index);
        if (configIsApplicable(overrideOps, dirname, context, input.filepath)) {
          flattenedConfigs.push({
            config: overrideOps,
            index,
            envName: undefined
          });
          const overrideEnvOpts = overridesEnv(input, index, context.envName);
          if (overrideEnvOpts && configIsApplicable(overrideEnvOpts, dirname, context, input.filepath)) {
            flattenedConfigs.push({
              config: overrideEnvOpts,
              index,
              envName: context.envName
            });
          }
        }
      });
    }
    if (flattenedConfigs.some(({
      config: {
        options: {
          ignore,
          only
        }
      }
    }) => shouldIgnore(context, ignore, only, dirname))) {
      return null;
    }
    const chain = emptyChain();
    const logger = createLogger(input, context, baseLogger);
    for (const {
      config,
      index,
      envName
    } of flattenedConfigs) {
      if (!(yield* mergeExtendsChain(chain, config.options, dirname, context, files, baseLogger))) {
        return null;
      }
      logger(config, index, envName);
      yield* mergeChainOpts(chain, config);
    }
    return chain;
  };
}
function* mergeExtendsChain(chain, opts, dirname, context, files, baseLogger) {
  if (opts.extends === undefined) return true;
  const file = yield* loadConfig(opts.extends, dirname, context.envName, context.caller);
  if (files.has(file)) {
    throw new Error(`Configuration cycle detected loading ${file.filepath}.\n` + `File already loaded following the config chain:\n` + Array.from(files, file => ` - ${file.filepath}`).join("\n"));
  }
  files.add(file);
  const fileChain = yield* loadFileChain(validateExtendFile(file), context, files, baseLogger);
  files.delete(file);
  if (!fileChain) return false;
  mergeChain(chain, fileChain);
  return true;
}
function mergeChain(target, source) {
  target.options.push(...source.options);
  target.plugins.push(...source.plugins);
  target.presets.push(...source.presets);
  for (const file of source.files) {
    target.files.add(file);
  }
  return target;
}
function* mergeChainOpts(target, {
  options,
  plugins,
  presets
}) {
  target.options.push(options);
  target.plugins.push(...(yield* plugins()));
  target.presets.push(...(yield* presets()));
  return target;
}
function emptyChain() {
  return {
    options: [],
    presets: [],
    plugins: [],
    files: new Set()
  };
}
function normalizeOptions$1(opts) {
  const options = Object.assign({}, opts);
  delete options.extends;
  delete options.env;
  delete options.overrides;
  delete options.plugins;
  delete options.presets;
  delete options.passPerPreset;
  delete options.ignore;
  delete options.only;
  delete options.test;
  delete options.include;
  delete options.exclude;
  if (Object.prototype.hasOwnProperty.call(options, "sourceMap")) {
    options.sourceMaps = options.sourceMap;
    delete options.sourceMap;
  }
  return options;
}
function dedupDescriptors(items) {
  const map = new Map();
  const descriptors = [];
  for (const item of items) {
    if (typeof item.value === "function") {
      const fnKey = item.value;
      let nameMap = map.get(fnKey);
      if (!nameMap) {
        nameMap = new Map();
        map.set(fnKey, nameMap);
      }
      let desc = nameMap.get(item.name);
      if (!desc) {
        desc = {
          value: item
        };
        descriptors.push(desc);
        if (!item.ownPass) nameMap.set(item.name, desc);
      } else {
        desc.value = item;
      }
    } else {
      descriptors.push({
        value: item
      });
    }
  }
  return descriptors.reduce((acc, desc) => {
    acc.push(desc.value);
    return acc;
  }, []);
}
function configIsApplicable({
  options
}, dirname, context, configName) {
  return (options.test === undefined || configFieldIsApplicable(context, options.test, dirname, configName)) && (options.include === undefined || configFieldIsApplicable(context, options.include, dirname, configName)) && (options.exclude === undefined || !configFieldIsApplicable(context, options.exclude, dirname, configName));
}
function configFieldIsApplicable(context, test, dirname, configName) {
  const patterns = Array.isArray(test) ? test : [test];
  return matchesPatterns(context, patterns, dirname, configName);
}
function ignoreListReplacer(_key, value) {
  if (value instanceof RegExp) {
    return String(value);
  }
  return value;
}
function shouldIgnore(context, ignore, only, dirname) {
  if (ignore && matchesPatterns(context, ignore, dirname)) {
    const message = `No config is applied to "${context.filename ?? "(unknown)"}" because it matches one of \`ignore: ${JSON.stringify(ignore, ignoreListReplacer)}\` from "${dirname}"`;
    debug$3(message);
    if (context.showConfig) {
      console.log(message);
    }
    return true;
  }
  if (only && !matchesPatterns(context, only, dirname)) {
    const message = `No config is applied to "${context.filename ?? "(unknown)"}" because it fails to match one of \`only: ${JSON.stringify(only, ignoreListReplacer)}\` from "${dirname}"`;
    debug$3(message);
    if (context.showConfig) {
      console.log(message);
    }
    return true;
  }
  return false;
}
function matchesPatterns(context, patterns, dirname, configName) {
  return patterns.some(pattern => matchPattern(pattern, dirname, context.filename, context, configName));
}
function matchPattern(pattern, dirname, pathToTest, context, configName) {
  if (typeof pattern === "function") {
    return !!endHiddenCallStack(pattern)(pathToTest, {
      dirname,
      envName: context.envName,
      caller: context.caller
    });
  }
  if (typeof pathToTest !== "string") {
    throw new ConfigError(`Configuration contains string/RegExp pattern, but no filename was passed to Babel`, configName);
  }
  if (typeof pattern === "string") {
    pattern = pathToPattern(pattern, dirname);
  }
  return pattern.test(pathToTest);
}

const VALIDATORS = {
  name: assertString,
  manipulateOptions: assertFunction,
  pre: assertFunction,
  post: assertFunction,
  inherits: assertFunction,
  visitor: assertVisitorMap,
  parserOverride: assertFunction,
  generatorOverride: assertFunction
};
function assertVisitorMap(loc, value) {
  const obj = assertObject(loc, value);
  if (obj) {
    Object.keys(obj).forEach(prop => {
      if (prop !== "_exploded" && prop !== "_verified") {
        assertVisitorHandler(prop, obj[prop]);
      }
    });
    if (obj.enter || obj.exit) {
      throw new Error(`${msg(loc)} cannot contain catch-all "enter" or "exit" handlers. Please target individual nodes.`);
    }
  }
  return obj;
}
function assertVisitorHandler(key, value) {
  if (value && typeof value === "object") {
    Object.keys(value).forEach(handler => {
      if (handler !== "enter" && handler !== "exit") {
        throw new Error(`.visitor["${key}"] may only have .enter and/or .exit handlers.`);
      }
    });
  } else if (typeof value !== "function") {
    throw new Error(`.visitor["${key}"] must be a function`);
  }
}
function validatePluginObject(obj) {
  const rootPath = {
    type: "root",
    source: "plugin"
  };
  Object.keys(obj).forEach(key => {
    const validator = VALIDATORS[key];
    if (validator) {
      const optLoc = {
        type: "option",
        name: key,
        parent: rootPath
      };
      validator(optLoc, obj[key]);
    } else {
      const invalidPluginPropertyError = new Error(`.${key} is not a valid Plugin property`);
      invalidPluginPropertyError.code = "BABEL_UNKNOWN_PLUGIN_PROPERTY";
      throw invalidPluginPropertyError;
    }
  });
  return obj;
}

function getEnv(defaultValue = "development") {
  return process.env.BABEL_ENV || process.env.NODE_ENV || defaultValue;
}

const _excluded = ["showIgnoredFiles"];
function _objectWithoutPropertiesLoose(source, excluded) {
  if (source == null) return {};
  var target = {};
  var sourceKeys = Object.keys(source);
  var key, i;
  for (i = 0; i < sourceKeys.length; i++) {
    key = sourceKeys[i];
    if (excluded.indexOf(key) >= 0) continue;
    target[key] = source[key];
  }
  return target;
}
function resolveRootMode(rootDir, rootMode) {
  switch (rootMode) {
    case "root":
      return rootDir;
    case "upward-optional":
      {
        const upwardRootDir = findConfigUpwards(rootDir);
        return upwardRootDir === null ? rootDir : upwardRootDir;
      }
    case "upward":
      {
        const upwardRootDir = findConfigUpwards(rootDir);
        if (upwardRootDir !== null) return upwardRootDir;
        throw Object.assign(new Error(`Babel was run with rootMode:"upward" but a root could not ` + `be found when searching upward from "${rootDir}".\n` + `One of the following config files must be in the directory tree: ` + `"${ROOT_CONFIG_FILENAMES.join(", ")}".`), {
          code: "BABEL_ROOT_NOT_FOUND",
          dirname: rootDir
        });
      }
    default:
      throw new Error(`Assertion failure - unknown rootMode value.`);
  }
}
function* loadPrivatePartialConfig(inputOpts) {
  if (inputOpts != null && (typeof inputOpts !== "object" || Array.isArray(inputOpts))) {
    throw new Error("Babel options must be an object, null, or undefined");
  }
  const args = inputOpts ? validate("arguments", inputOpts) : {};
  const {
    envName = getEnv(),
    cwd = ".",
    root: rootDir = ".",
    rootMode = "root",
    caller,
    cloneInputAst = true
  } = args;
  const absoluteCwd = path.resolve(cwd);
  const absoluteRootDir = resolveRootMode(path.resolve(absoluteCwd, rootDir), rootMode);
  const filename = typeof args.filename === "string" ? path.resolve(cwd, args.filename) : undefined;
  const showConfigPath = yield* resolveShowConfigPath(absoluteCwd);
  const context = {
    filename,
    cwd: absoluteCwd,
    root: absoluteRootDir,
    envName,
    caller,
    showConfig: showConfigPath === filename
  };
  const configChain = yield* buildRootChain(args, context);
  if (!configChain) return null;
  const merged = {
    assumptions: {}
  };
  configChain.options.forEach(opts => {
    mergeOptions(merged, opts);
  });
  const options = Object.assign({}, merged, {
    targets: resolveTargets(merged, absoluteRootDir),
    cloneInputAst,
    babelrc: false,
    configFile: false,
    browserslistConfigFile: false,
    passPerPreset: false,
    envName: context.envName,
    cwd: context.cwd,
    root: context.root,
    rootMode: "root",
    filename: typeof context.filename === "string" ? context.filename : undefined,
    plugins: configChain.plugins.map(descriptor => createItemFromDescriptor(descriptor)),
    presets: configChain.presets.map(descriptor => createItemFromDescriptor(descriptor))
  });
  return {
    options,
    context,
    fileHandling: configChain.fileHandling,
    ignore: configChain.ignore,
    babelrc: configChain.babelrc,
    config: configChain.config,
    files: configChain.files
  };
}
const loadPartialConfig$1 = gensync(function* (opts) {
  let showIgnoredFiles = false;
  if (typeof opts === "object" && opts !== null && !Array.isArray(opts)) {
    var _opts = opts;
    ({
      showIgnoredFiles
    } = _opts);
    opts = _objectWithoutPropertiesLoose(_opts, _excluded);
  }
  const result = yield* loadPrivatePartialConfig(opts);
  if (!result) return null;
  const {
    options,
    babelrc,
    ignore,
    config,
    fileHandling,
    files
  } = result;
  if (fileHandling === "ignored" && !showIgnoredFiles) {
    return null;
  }
  (options.plugins || []).forEach(item => {
    if (item.value instanceof Plugin) {
      throw new Error("Passing cached plugin instances is not supported in " + "babel.loadPartialConfig()");
    }
  });
  return new PartialConfig(options, babelrc ? babelrc.filepath : undefined, ignore ? ignore.filepath : undefined, config ? config.filepath : undefined, fileHandling, files);
});
class PartialConfig {
  options;
  babelrc;
  babelignore;
  config;
  fileHandling;
  files;
  constructor(options, babelrc, ignore, config, fileHandling, files) {
    this.options = options;
    this.babelignore = ignore;
    this.babelrc = babelrc;
    this.config = config;
    this.fileHandling = fileHandling;
    this.files = files;
    Object.freeze(this);
  }
  hasFilesystemConfig() {
    return this.babelrc !== undefined || this.config !== undefined;
  }
}
Object.freeze(PartialConfig.prototype);

var loadConfig$1 = gensync(function* loadFullConfig(inputOpts) {
  const result = yield* loadPrivatePartialConfig(inputOpts);
  if (!result) {
    return null;
  }
  const {
    options,
    context,
    fileHandling
  } = result;
  if (fileHandling === "ignored") {
    return null;
  }
  const optionDefaults = {};
  const {
    plugins,
    presets
  } = options;
  if (!plugins || !presets) {
    throw new Error("Assertion failure - plugins and presets exist");
  }
  const presetContext = Object.assign({}, context, {
    targets: options.targets
  });
  const toDescriptor = item => {
    const desc = getItemDescriptor(item);
    if (!desc) {
      throw new Error("Assertion failure - must be config item");
    }
    return desc;
  };
  const presetsDescriptors = presets.map(toDescriptor);
  const initialPluginsDescriptors = plugins.map(toDescriptor);
  const pluginDescriptorsByPass = [[]];
  const passes = [];
  const externalDependencies = [];
  const ignored = yield* enhanceError(context, function* recursePresetDescriptors(rawPresets, pluginDescriptorsPass) {
    const presets = [];
    for (let i = 0; i < rawPresets.length; i++) {
      const descriptor = rawPresets[i];
      if (descriptor.options !== false) {
        try {
          var preset = yield* loadPresetDescriptor(descriptor, presetContext);
        } catch (e) {
          if (e.code === "BABEL_UNKNOWN_OPTION") {
            checkNoUnwrappedItemOptionPairs(rawPresets, i, "preset", e);
          }
          throw e;
        }
        externalDependencies.push(preset.externalDependencies);
        if (descriptor.ownPass) {
          presets.push({
            preset: preset.chain,
            pass: []
          });
        } else {
          presets.unshift({
            preset: preset.chain,
            pass: pluginDescriptorsPass
          });
        }
      }
    }
    if (presets.length > 0) {
      pluginDescriptorsByPass.splice(1, 0, ...presets.map(o => o.pass).filter(p => p !== pluginDescriptorsPass));
      for (const {
        preset,
        pass
      } of presets) {
        if (!preset) return true;
        pass.push(...preset.plugins);
        const ignored = yield* recursePresetDescriptors(preset.presets, pass);
        if (ignored) return true;
        preset.options.forEach(opts => {
          mergeOptions(optionDefaults, opts);
        });
      }
    }
  })(presetsDescriptors, pluginDescriptorsByPass[0]);
  if (ignored) return null;
  const opts = optionDefaults;
  mergeOptions(opts, options);
  const pluginContext = Object.assign({}, presetContext, {
    assumptions: opts.assumptions ?? {}
  });
  yield* enhanceError(context, function* loadPluginDescriptors() {
    pluginDescriptorsByPass[0].unshift(...initialPluginsDescriptors);
    for (const descs of pluginDescriptorsByPass) {
      const pass = [];
      passes.push(pass);
      for (let i = 0; i < descs.length; i++) {
        const descriptor = descs[i];
        if (descriptor.options !== false) {
          try {
            var plugin = yield* loadPluginDescriptor(descriptor, pluginContext);
          } catch (e) {
            if (e.code === "BABEL_UNKNOWN_PLUGIN_PROPERTY") {
              checkNoUnwrappedItemOptionPairs(descs, i, "plugin", e);
            }
            throw e;
          }
          pass.push(plugin);
          externalDependencies.push(plugin.externalDependencies);
        }
      }
    }
  })();
  opts.plugins = passes[0];
  opts.presets = passes.slice(1).filter(plugins => plugins.length > 0).map(plugins => ({
    plugins
  }));
  opts.passPerPreset = opts.presets.length > 0;
  return {
    options: opts,
    passes: passes,
    externalDependencies: finalize(externalDependencies)
  };
});
function enhanceError(context, fn) {
  return function* (arg1, arg2) {
    try {
      return yield* fn(arg1, arg2);
    } catch (e) {
      if (!/^\[BABEL\]/.test(e.message)) {
        e.message = `[BABEL] ${context.filename ?? "unknown file"}: ${e.message}`;
      }
      throw e;
    }
  };
}
const makeDescriptorLoader = apiFactory => makeWeakCache(function* ({
  value,
  options,
  dirname,
  alias
}, cache) {
  if (options === false) throw new Error("Assertion failure");
  options = options || {};
  const externalDependencies = [];
  let item = value;
  if (typeof value === "function") {
    const factory = maybeAsync(value, `You appear to be using an async plugin/preset, but Babel has been called synchronously`);
    const api = Object.assign({}, thisFile, apiFactory(cache, externalDependencies));
    try {
      item = yield* factory(api, options, dirname);
    } catch (e) {
      if (alias) {
        e.message += ` (While processing: ${JSON.stringify(alias)})`;
      }
      throw e;
    }
  }
  if (!item || typeof item !== "object") {
    throw new Error("Plugin/Preset did not return an object.");
  }
  if (isThenable$1(item)) {
    yield* [];
    throw new Error(`You appear to be using a promise as a plugin, ` + `which your current version of Babel does not support. ` + `If you're using a published plugin, ` + `you may need to upgrade your @babel/core version. ` + `As an alternative, you can prefix the promise with "await". ` + `(While processing: ${JSON.stringify(alias)})`);
  }
  if (externalDependencies.length > 0 && (!cache.configured() || cache.mode() === "forever")) {
    let error = `A plugin/preset has external untracked dependencies ` + `(${externalDependencies[0]}), but the cache `;
    if (!cache.configured()) {
      error += `has not been configured to be invalidated when the external dependencies change. `;
    } else {
      error += ` has been configured to never be invalidated. `;
    }
    error += `Plugins/presets should configure their cache to be invalidated when the external ` + `dependencies change, for example using \`api.cache.invalidate(() => ` + `statSync(filepath).mtimeMs)\` or \`api.cache.never()\`\n` + `(While processing: ${JSON.stringify(alias)})`;
    throw new Error(error);
  }
  return {
    value: item,
    options,
    dirname,
    alias,
    externalDependencies: finalize(externalDependencies)
  };
});
const pluginDescriptorLoader = makeDescriptorLoader(makePluginAPI);
const presetDescriptorLoader = makeDescriptorLoader(makePresetAPI);
const instantiatePlugin = makeWeakCache(function* ({
  value,
  options,
  dirname,
  alias,
  externalDependencies
}, cache) {
  const pluginObj = validatePluginObject(value);
  const plugin = Object.assign({}, pluginObj);
  if (plugin.visitor) {
    plugin.visitor = traverse.explode(Object.assign({}, plugin.visitor));
  }
  if (plugin.inherits) {
    const inheritsDescriptor = {
      name: undefined,
      alias: `${alias}$inherits`,
      value: plugin.inherits,
      options,
      dirname
    };
    const inherits = yield* forwardAsync(loadPluginDescriptor, run => {
      return cache.invalidate(data => run(inheritsDescriptor, data));
    });
    plugin.pre = chain(inherits.pre, plugin.pre);
    plugin.post = chain(inherits.post, plugin.post);
    plugin.manipulateOptions = chain(inherits.manipulateOptions, plugin.manipulateOptions);
    plugin.visitor = traverse.visitors.merge([inherits.visitor || {}, plugin.visitor || {}]);
    if (inherits.externalDependencies.length > 0) {
      if (externalDependencies.length === 0) {
        externalDependencies = inherits.externalDependencies;
      } else {
        externalDependencies = finalize([externalDependencies, inherits.externalDependencies]);
      }
    }
  }
  return new Plugin(plugin, options, alias, externalDependencies);
});
function* loadPluginDescriptor(descriptor, context) {
  if (descriptor.value instanceof Plugin) {
    if (descriptor.options) {
      throw new Error("Passed options to an existing Plugin instance will not work.");
    }
    return descriptor.value;
  }
  return yield* instantiatePlugin(yield* pluginDescriptorLoader(descriptor, context), context);
}
const needsFilename = val => val && typeof val !== "function";
const validateIfOptionNeedsFilename = (options, descriptor) => {
  if (needsFilename(options.test) || needsFilename(options.include) || needsFilename(options.exclude)) {
    const formattedPresetName = descriptor.name ? `"${descriptor.name}"` : "/* your preset */";
    throw new ConfigError([`Preset ${formattedPresetName} requires a filename to be set when babel is called directly,`, `\`\`\``, `babel.transformSync(code, { filename: 'file.ts', presets: [${formattedPresetName}] });`, `\`\`\``, `See https://babeljs.io/docs/en/options#filename for more information.`].join("\n"));
  }
};
const validatePreset = (preset, context, descriptor) => {
  if (!context.filename) {
    const {
      options
    } = preset;
    validateIfOptionNeedsFilename(options, descriptor);
    options.overrides?.forEach(overrideOptions => validateIfOptionNeedsFilename(overrideOptions, descriptor));
  }
};
const instantiatePreset = makeWeakCacheSync(({
  value,
  dirname,
  alias,
  externalDependencies
}) => {
  return {
    options: validate("preset", value),
    alias,
    dirname,
    externalDependencies
  };
});
function* loadPresetDescriptor(descriptor, context) {
  const preset = instantiatePreset(yield* presetDescriptorLoader(descriptor, context));
  validatePreset(preset, context, descriptor);
  return {
    chain: yield* buildPresetChain(preset, context),
    externalDependencies: preset.externalDependencies
  };
}
function chain(a, b) {
  const fns = [a, b].filter(Boolean);
  if (fns.length <= 1) return fns[0];
  return function (...args) {
    for (const fn of fns) {
      fn.apply(this, args);
    }
  };
}

const loadOptionsRunner = gensync(function* (opts) {
  const config = yield* loadConfig$1(opts);
  return config?.options ?? null;
});
const createConfigItemRunner = gensync(createConfigItem$1);
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
const loadPartialConfig = maybeErrback(loadPartialConfig$1);
const loadPartialConfigSync = loadPartialConfig$1.sync;
const loadPartialConfigAsync = loadPartialConfig$1.async;
const loadOptions = maybeErrback(loadOptionsRunner);
const loadOptionsSync = loadOptionsRunner.sync;
const loadOptionsAsync = loadOptionsRunner.async;
const createConfigItemSync = createConfigItemRunner.sync;
const createConfigItemAsync = createConfigItemRunner.async;
function createConfigItem(target, options, callback) {
  if (callback !== undefined) {
    createConfigItemRunner.errback(target, options, callback);
  } else if (typeof options === "function") {
    createConfigItemRunner.errback(target, undefined, callback);
  } else {
    return createConfigItemRunner.sync(target, options);
  }
}

class PluginPass {
  _map = new Map();
  key;
  file;
  opts;
  cwd;
  filename;
  constructor(file, key, options) {
    this.key = key;
    this.file = file;
    this.opts = options || {};
    this.cwd = file.opts.cwd;
    this.filename = file.opts.filename;
  }
  set(key, val) {
    this._map.set(key, val);
  }
  get(key) {
    return this._map.get(key);
  }
  availableHelper(name, versionRange) {
    return this.file.availableHelper(name, versionRange);
  }
  addHelper(name) {
    return this.file.addHelper(name);
  }
  buildCodeFrameError(node, msg, _Error) {
    return this.file.buildCodeFrameError(node, msg, _Error);
  }
}
if (!process.env.BABEL_8_BREAKING) {
  PluginPass.prototype.getModuleName = function getModuleName() {
    return this.file.getModuleName();
  };
  PluginPass.prototype.addImport = function addImport() {
    this.file.addImport();
  };
}

let LOADED_PLUGIN;
const blockHoistPlugin = {
  name: "internal.blockHoist",
  visitor: {
    Block: {
      exit({
        node
      }) {
        const {
          body
        } = node;
        let max = 2 ** 30 - 1;
        let hasChange = false;
        for (let i = 0; i < body.length; i++) {
          const n = body[i];
          const p = priority(n);
          if (p > max) {
            hasChange = true;
            break;
          }
          max = p;
        }
        if (!hasChange) return;
        node.body = stableSort(body.slice());
      }
    }
  }
};
function loadBlockHoistPlugin() {
  if (!LOADED_PLUGIN) {
    LOADED_PLUGIN = new Plugin(Object.assign({}, blockHoistPlugin, {
      visitor: traverse.explode(blockHoistPlugin.visitor)
    }), {});
  }
  return LOADED_PLUGIN;
}
function priority(bodyNode) {
  const priority = bodyNode?._blockHoist;
  if (priority == null) return 1;
  if (priority === true) return 2;
  return priority;
}
function stableSort(body) {
  const buckets = Object.create(null);
  for (let i = 0; i < body.length; i++) {
    const n = body[i];
    const p = priority(n);
    const bucket = buckets[p] || (buckets[p] = []);
    bucket.push(n);
  }
  const keys = Object.keys(buckets).map(k => +k).sort((a, b) => b - a);
  let index = 0;
  for (const key of keys) {
    const bucket = buckets[key];
    for (const n of bucket) {
      body[index++] = n;
    }
  }
  return body;
}

function normalizeOptions(config) {
  const {
    filename,
    cwd,
    filenameRelative = typeof filename === "string" ? path.relative(cwd, filename) : "unknown",
    sourceType = "module",
    inputSourceMap,
    sourceMaps = !!inputSourceMap,
    sourceRoot = process.env.BABEL_8_BREAKING ? undefined : config.options.moduleRoot,
    sourceFileName = path.basename(filenameRelative),
    comments = true,
    compact = "auto"
  } = config.options;
  const opts = config.options;
  const options = Object.assign({}, opts, {
    parserOpts: Object.assign({
      sourceType: path.extname(filenameRelative) === ".mjs" ? "module" : sourceType,
      sourceFileName: filename,
      plugins: []
    }, opts.parserOpts),
    generatorOpts: Object.assign({
      filename,
      auxiliaryCommentBefore: opts.auxiliaryCommentBefore,
      auxiliaryCommentAfter: opts.auxiliaryCommentAfter,
      retainLines: opts.retainLines,
      comments,
      shouldPrintComment: opts.shouldPrintComment,
      compact,
      minified: opts.minified,
      sourceMaps,
      sourceRoot,
      sourceFileName
    }, opts.generatorOpts)
  });
  for (const plugins of config.passes) {
    for (const plugin of plugins) {
      if (plugin.manipulateOptions) {
        plugin.manipulateOptions(options, options.parserOpts);
      }
    }
  }
  return options;
}

const pluginNameMap = {
  asyncDoExpressions: {
    syntax: {
      name: "@babel/plugin-syntax-async-do-expressions",
      url: "https://github.com/babel/babel/tree/main/packages/babel-plugin-syntax-async-do-expressions"
    }
  },
  decimal: {
    syntax: {
      name: "@babel/plugin-syntax-decimal",
      url: "https://github.com/babel/babel/tree/main/packages/babel-plugin-syntax-decimal"
    }
  },
  decorators: {
    syntax: {
      name: "@babel/plugin-syntax-decorators",
      url: "https://github.com/babel/babel/tree/main/packages/babel-plugin-syntax-decorators"
    },
    transform: {
      name: "@babel/plugin-proposal-decorators",
      url: "https://github.com/babel/babel/tree/main/packages/babel-plugin-proposal-decorators"
    }
  },
  doExpressions: {
    syntax: {
      name: "@babel/plugin-syntax-do-expressions",
      url: "https://github.com/babel/babel/tree/main/packages/babel-plugin-syntax-do-expressions"
    },
    transform: {
      name: "@babel/plugin-proposal-do-expressions",
      url: "https://github.com/babel/babel/tree/main/packages/babel-plugin-proposal-do-expressions"
    }
  },
  exportDefaultFrom: {
    syntax: {
      name: "@babel/plugin-syntax-export-default-from",
      url: "https://github.com/babel/babel/tree/main/packages/babel-plugin-syntax-export-default-from"
    },
    transform: {
      name: "@babel/plugin-proposal-export-default-from",
      url: "https://github.com/babel/babel/tree/main/packages/babel-plugin-proposal-export-default-from"
    }
  },
  flow: {
    syntax: {
      name: "@babel/plugin-syntax-flow",
      url: "https://github.com/babel/babel/tree/main/packages/babel-plugin-syntax-flow"
    },
    transform: {
      name: "@babel/preset-flow",
      url: "https://github.com/babel/babel/tree/main/packages/babel-preset-flow"
    }
  },
  functionBind: {
    syntax: {
      name: "@babel/plugin-syntax-function-bind",
      url: "https://github.com/babel/babel/tree/main/packages/babel-plugin-syntax-function-bind"
    },
    transform: {
      name: "@babel/plugin-proposal-function-bind",
      url: "https://github.com/babel/babel/tree/main/packages/babel-plugin-proposal-function-bind"
    }
  },
  functionSent: {
    syntax: {
      name: "@babel/plugin-syntax-function-sent",
      url: "https://github.com/babel/babel/tree/main/packages/babel-plugin-syntax-function-sent"
    },
    transform: {
      name: "@babel/plugin-proposal-function-sent",
      url: "https://github.com/babel/babel/tree/main/packages/babel-plugin-proposal-function-sent"
    }
  },
  jsx: {
    syntax: {
      name: "@babel/plugin-syntax-jsx",
      url: "https://github.com/babel/babel/tree/main/packages/babel-plugin-syntax-jsx"
    },
    transform: {
      name: "@babel/preset-react",
      url: "https://github.com/babel/babel/tree/main/packages/babel-preset-react"
    }
  },
  importAttributes: {
    syntax: {
      name: "@babel/plugin-syntax-import-attributes",
      url: "https://github.com/babel/babel/tree/main/packages/babel-plugin-syntax-import-attributes"
    }
  },
  pipelineOperator: {
    syntax: {
      name: "@babel/plugin-syntax-pipeline-operator",
      url: "https://github.com/babel/babel/tree/main/packages/babel-plugin-syntax-pipeline-operator"
    },
    transform: {
      name: "@babel/plugin-proposal-pipeline-operator",
      url: "https://github.com/babel/babel/tree/main/packages/babel-plugin-proposal-pipeline-operator"
    }
  },
  recordAndTuple: {
    syntax: {
      name: "@babel/plugin-syntax-record-and-tuple",
      url: "https://github.com/babel/babel/tree/main/packages/babel-plugin-syntax-record-and-tuple"
    }
  },
  throwExpressions: {
    syntax: {
      name: "@babel/plugin-syntax-throw-expressions",
      url: "https://github.com/babel/babel/tree/main/packages/babel-plugin-syntax-throw-expressions"
    },
    transform: {
      name: "@babel/plugin-proposal-throw-expressions",
      url: "https://github.com/babel/babel/tree/main/packages/babel-plugin-proposal-throw-expressions"
    }
  },
  typescript: {
    syntax: {
      name: "@babel/plugin-syntax-typescript",
      url: "https://github.com/babel/babel/tree/main/packages/babel-plugin-syntax-typescript"
    },
    transform: {
      name: "@babel/preset-typescript",
      url: "https://github.com/babel/babel/tree/main/packages/babel-preset-typescript"
    }
  }
};
if (!process.env.BABEL_8_BREAKING) {
  Object.assign(pluginNameMap, {
    asyncGenerators: {
      syntax: {
        name: "@babel/plugin-syntax-async-generators",
        url: "https://github.com/babel/babel/tree/main/packages/babel-plugin-syntax-async-generators"
      },
      transform: {
        name: "@babel/plugin-transform-async-generator-functions",
        url: "https://github.com/babel/babel/tree/main/packages/babel-plugin-transform-async-generator-functions"
      }
    },
    classProperties: {
      syntax: {
        name: "@babel/plugin-syntax-class-properties",
        url: "https://github.com/babel/babel/tree/main/packages/babel-plugin-syntax-class-properties"
      },
      transform: {
        name: "@babel/plugin-transform-class-properties",
        url: "https://github.com/babel/babel/tree/main/packages/babel-plugin-transform-class-properties"
      }
    },
    classPrivateProperties: {
      syntax: {
        name: "@babel/plugin-syntax-class-properties",
        url: "https://github.com/babel/babel/tree/main/packages/babel-plugin-syntax-class-properties"
      },
      transform: {
        name: "@babel/plugin-transform-class-properties",
        url: "https://github.com/babel/babel/tree/main/packages/babel-plugin-transform-class-properties"
      }
    },
    classPrivateMethods: {
      syntax: {
        name: "@babel/plugin-syntax-class-properties",
        url: "https://github.com/babel/babel/tree/main/packages/babel-plugin-syntax-class-properties"
      },
      transform: {
        name: "@babel/plugin-transform-private-methods",
        url: "https://github.com/babel/babel/tree/main/packages/babel-plugin-transform-private-methods"
      }
    },
    classStaticBlock: {
      syntax: {
        name: "@babel/plugin-syntax-class-static-block",
        url: "https://github.com/babel/babel/tree/HEAD/packages/babel-plugin-syntax-class-static-block"
      },
      transform: {
        name: "@babel/plugin-transform-class-static-block",
        url: "https://github.com/babel/babel/tree/HEAD/packages/babel-plugin-transform-class-static-block"
      }
    },
    dynamicImport: {
      syntax: {
        name: "@babel/plugin-syntax-dynamic-import",
        url: "https://github.com/babel/babel/tree/main/packages/babel-plugin-syntax-dynamic-import"
      }
    },
    exportNamespaceFrom: {
      syntax: {
        name: "@babel/plugin-syntax-export-namespace-from",
        url: "https://github.com/babel/babel/tree/main/packages/babel-plugin-syntax-export-namespace-from"
      },
      transform: {
        name: "@babel/plugin-transform-export-namespace-from",
        url: "https://github.com/babel/babel/tree/main/packages/babel-plugin-transform-export-namespace-from"
      }
    },
    importAssertions: {
      syntax: {
        name: "@babel/plugin-syntax-import-assertions",
        url: "https://github.com/babel/babel/tree/main/packages/babel-plugin-syntax-import-assertions"
      }
    },
    importMeta: {
      syntax: {
        name: "@babel/plugin-syntax-import-meta",
        url: "https://github.com/babel/babel/tree/main/packages/babel-plugin-syntax-import-meta"
      }
    },
    logicalAssignment: {
      syntax: {
        name: "@babel/plugin-syntax-logical-assignment-operators",
        url: "https://github.com/babel/babel/tree/main/packages/babel-plugin-syntax-logical-assignment-operators"
      },
      transform: {
        name: "@babel/plugin-transform-logical-assignment-operators",
        url: "https://github.com/babel/babel/tree/main/packages/babel-plugin-transform-logical-assignment-operators"
      }
    },
    moduleStringNames: {
      syntax: {
        name: "@babel/plugin-syntax-module-string-names",
        url: "https://github.com/babel/babel/tree/main/packages/babel-plugin-syntax-module-string-names"
      }
    },
    numericSeparator: {
      syntax: {
        name: "@babel/plugin-syntax-numeric-separator",
        url: "https://github.com/babel/babel/tree/main/packages/babel-plugin-syntax-numeric-separator"
      },
      transform: {
        name: "@babel/plugin-transform-numeric-separator",
        url: "https://github.com/babel/babel/tree/main/packages/babel-plugin-transform-numeric-separator"
      }
    },
    nullishCoalescingOperator: {
      syntax: {
        name: "@babel/plugin-syntax-nullish-coalescing-operator",
        url: "https://github.com/babel/babel/tree/main/packages/babel-plugin-syntax-nullish-coalescing-operator"
      },
      transform: {
        name: "@babel/plugin-transform-nullish-coalescing-operator",
        url: "https://github.com/babel/babel/tree/main/packages/babel-plugin-transform-nullish-coalescing-opearator"
      }
    },
    objectRestSpread: {
      syntax: {
        name: "@babel/plugin-syntax-object-rest-spread",
        url: "https://github.com/babel/babel/tree/main/packages/babel-plugin-syntax-object-rest-spread"
      },
      transform: {
        name: "@babel/plugin-transform-object-rest-spread",
        url: "https://github.com/babel/babel/tree/main/packages/babel-plugin-transform-object-rest-spread"
      }
    },
    optionalCatchBinding: {
      syntax: {
        name: "@babel/plugin-syntax-optional-catch-binding",
        url: "https://github.com/babel/babel/tree/main/packages/babel-plugin-syntax-optional-catch-binding"
      },
      transform: {
        name: "@babel/plugin-transform-optional-catch-binding",
        url: "https://github.com/babel/babel/tree/main/packages/babel-plugin-transform-optional-catch-binding"
      }
    },
    optionalChaining: {
      syntax: {
        name: "@babel/plugin-syntax-optional-chaining",
        url: "https://github.com/babel/babel/tree/main/packages/babel-plugin-syntax-optional-chaining"
      },
      transform: {
        name: "@babel/plugin-transform-optional-chaining",
        url: "https://github.com/babel/babel/tree/main/packages/babel-plugin-transform-optional-chaining"
      }
    },
    privateIn: {
      syntax: {
        name: "@babel/plugin-syntax-private-property-in-object",
        url: "https://github.com/babel/babel/tree/main/packages/babel-plugin-syntax-private-property-in-object"
      },
      transform: {
        name: "@babel/plugin-transform-private-property-in-object",
        url: "https://github.com/babel/babel/tree/main/packages/babel-plugin-transform-private-property-in-object"
      }
    },
    regexpUnicodeSets: {
      syntax: {
        name: "@babel/plugin-syntax-unicode-sets-regex",
        url: "https://github.com/babel/babel/blob/main/packages/babel-plugin-syntax-unicode-sets-regex/README.md"
      },
      transform: {
        name: "@babel/plugin-transform-unicode-sets-regex",
        url: "https://github.com/babel/babel/blob/main/packages/babel-plugin-proposalunicode-sets-regex/README.md"
      }
    }
  });
}
const getNameURLCombination = ({
  name,
  url
}) => `${name} (${url})`;
function generateMissingPluginMessage(missingPluginName, loc, codeFrame) {
  let helpMessage = `Support for the experimental syntax '${missingPluginName}' isn't currently enabled ` + `(${loc.line}:${loc.column + 1}):\n\n` + codeFrame;
  const pluginInfo = pluginNameMap[missingPluginName];
  if (pluginInfo) {
    const {
      syntax: syntaxPlugin,
      transform: transformPlugin
    } = pluginInfo;
    if (syntaxPlugin) {
      const syntaxPluginInfo = getNameURLCombination(syntaxPlugin);
      if (transformPlugin) {
        const transformPluginInfo = getNameURLCombination(transformPlugin);
        const sectionType = transformPlugin.name.startsWith("@babel/plugin") ? "plugins" : "presets";
        helpMessage += `\n\nAdd ${transformPluginInfo} to the '${sectionType}' section of your Babel config to enable transformation.
If you want to leave it as-is, add ${syntaxPluginInfo} to the 'plugins' section to enable parsing.`;
      } else {
        helpMessage += `\n\nAdd ${syntaxPluginInfo} to the 'plugins' section of your Babel config ` + `to enable parsing.`;
      }
    }
  }
  return helpMessage;
}

function* parser(pluginPasses, {
  parserOpts,
  highlightCode = true,
  filename = "unknown"
}, code) {
  try {
    const results = [];
    for (const plugins of pluginPasses) {
      for (const plugin of plugins) {
        const {
          parserOverride
        } = plugin;
        if (parserOverride) {
          const ast = parserOverride(code, parserOpts, parse$1);
          if (ast !== undefined) results.push(ast);
        }
      }
    }
    if (results.length === 0) {
      return parse$1(code, parserOpts);
    } else if (results.length === 1) {
      yield* [];
      if (typeof results[0].then === "function") {
        throw new Error(`You appear to be using an async parser plugin, ` + `which your current version of Babel does not support. ` + `If you're using a published plugin, you may need to upgrade ` + `your @babel/core version.`);
      }
      return results[0];
    }
    throw new Error("More than one plugin attempted to override parsing.");
  } catch (err) {
    if (err.code === "BABEL_PARSER_SOURCETYPE_MODULE_REQUIRED") {
      err.message += "\nConsider renaming the file to '.mjs', or setting sourceType:module " + "or sourceType:unambiguous in your Babel config for this file.";
    }
    const {
      loc,
      missingPlugin
    } = err;
    if (loc) {
      const codeFrame = codeFrameColumns(code, {
        start: {
          line: loc.line,
          column: loc.column + 1
        }
      }, {
        highlightCode
      });
      if (missingPlugin) {
        err.message = `${filename}: ` + generateMissingPluginMessage(missingPlugin[0], loc, codeFrame);
      } else {
        err.message = `${filename}: ${err.message}\n\n` + codeFrame;
      }
      err.code = "BABEL_PARSE_ERROR";
    }
    throw err;
  }
}

function deepClone(value, cache) {
  if (value !== null) {
    if (cache.has(value)) return cache.get(value);
    let cloned;
    if (Array.isArray(value)) {
      cloned = new Array(value.length);
      cache.set(value, cloned);
      for (let i = 0; i < value.length; i++) {
        cloned[i] = typeof value[i] !== "object" ? value[i] : deepClone(value[i], cache);
      }
    } else {
      cloned = {};
      cache.set(value, cloned);
      const keys = Object.keys(value);
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        cloned[key] = typeof value[key] !== "object" ? value[key] : deepClone(value[key], cache);
      }
    }
    return cloned;
  }
  return value;
}
function cloneDeep (value) {
  if (typeof value !== "object") return value;
  return deepClone(value, new Map());
}

const {
  file,
  traverseFast
} = _t;
const debug$2 = buildDebug("babel:transform:file");
const INLINE_SOURCEMAP_REGEX = /^[@#]\s+sourceMappingURL=data:(?:application|text)\/json;(?:charset[:=]\S+?;)?base64,(?:.*)$/;
const EXTERNAL_SOURCEMAP_REGEX = /^[@#][ \t]+sourceMappingURL=([^\s'"`]+)[ \t]*$/;
function* normalizeFile(pluginPasses, options, code, ast) {
  code = `${code || ""}`;
  if (ast) {
    if (ast.type === "Program") {
      ast = file(ast, [], []);
    } else if (ast.type !== "File") {
      throw new Error("AST root must be a Program or File node");
    }
    if (options.cloneInputAst) {
      ast = cloneDeep(ast);
    }
  } else {
    ast = yield* parser(pluginPasses, options, code);
  }
  let inputMap = null;
  if (options.inputSourceMap !== false) {
    if (typeof options.inputSourceMap === "object") {
      inputMap = convertSourceMap.fromObject(options.inputSourceMap);
    }
    if (!inputMap) {
      const lastComment = extractComments(INLINE_SOURCEMAP_REGEX, ast);
      if (lastComment) {
        try {
          inputMap = convertSourceMap.fromComment(lastComment);
        } catch (err) {
          debug$2("discarding unknown inline input sourcemap", err);
        }
      }
    }
    if (!inputMap) {
      const lastComment = extractComments(EXTERNAL_SOURCEMAP_REGEX, ast);
      if (typeof options.filename === "string" && lastComment) {
        try {
          const match = EXTERNAL_SOURCEMAP_REGEX.exec(lastComment);
          const inputMapContent = fs.readFileSync(path.resolve(path.dirname(options.filename), match[1]), "utf8");
          inputMap = convertSourceMap.fromJSON(inputMapContent);
        } catch (err) {
          debug$2("discarding unknown file input sourcemap", err);
        }
      } else if (lastComment) {
        debug$2("discarding un-loadable file input sourcemap");
      }
    }
  }
  return new File(options, {
    code,
    ast: ast,
    inputMap
  });
}
function extractCommentsFromList(regex, comments, lastComment) {
  if (comments) {
    comments = comments.filter(({
      value
    }) => {
      if (regex.test(value)) {
        lastComment = value;
        return false;
      }
      return true;
    });
  }
  return [comments, lastComment];
}
function extractComments(regex, ast) {
  let lastComment = null;
  traverseFast(ast, node => {
    [node.leadingComments, lastComment] = extractCommentsFromList(regex, node.leadingComments, lastComment);
    [node.innerComments, lastComment] = extractCommentsFromList(regex, node.innerComments, lastComment);
    [node.trailingComments, lastComment] = extractCommentsFromList(regex, node.trailingComments, lastComment);
  });
  return lastComment;
}

function mergeSourceMap(inputMap, map, sourceFileName) {
  const source = sourceFileName.replace(/\\/g, "/");
  let found = false;
  const result = remapping(rootless(map), (s, ctx) => {
    if (s === source && !found) {
      found = true;
      ctx.source = "";
      return rootless(inputMap);
    }
    return null;
  });
  if (typeof inputMap.sourceRoot === "string") {
    result.sourceRoot = inputMap.sourceRoot;
  }
  return Object.assign({}, result);
}
function rootless(map) {
  return Object.assign({}, map, {
    sourceRoot: null
  });
}

function generateCode(pluginPasses, file) {
  const {
    opts,
    ast,
    code,
    inputMap
  } = file;
  const {
    generatorOpts
  } = opts;
  generatorOpts.inputSourceMap = inputMap?.toObject();
  const results = [];
  for (const plugins of pluginPasses) {
    for (const plugin of plugins) {
      const {
        generatorOverride
      } = plugin;
      if (generatorOverride) {
        const result = generatorOverride(ast, generatorOpts, code, generate);
        if (result !== undefined) results.push(result);
      }
    }
  }
  let result;
  if (results.length === 0) {
    result = generate(ast, generatorOpts, code);
  } else if (results.length === 1) {
    result = results[0];
    if (typeof result.then === "function") {
      throw new Error(`You appear to be using an async codegen plugin, ` + `which your current version of Babel does not support. ` + `If you're using a published plugin, ` + `you may need to upgrade your @babel/core version.`);
    }
  } else {
    throw new Error("More than one plugin attempted to override codegen.");
  }
  let {
    code: outputCode,
    decodedMap: outputMap = result.map
  } = result;
  if (result.__mergedMap) {
    outputMap = Object.assign({}, result.map);
  } else {
    if (outputMap) {
      if (inputMap) {
        outputMap = mergeSourceMap(inputMap.toObject(), outputMap, generatorOpts.sourceFileName);
      } else {
        outputMap = result.map;
      }
    }
  }
  if (opts.sourceMaps === "inline" || opts.sourceMaps === "both") {
    outputCode += "\n" + convertSourceMap.fromObject(outputMap).toComment();
  }
  if (opts.sourceMaps === "inline") {
    outputMap = null;
  }
  return {
    outputCode,
    outputMap
  };
}

function* run(config, code, ast) {
  const file = yield* normalizeFile(config.passes, normalizeOptions(config), code, ast);
  const opts = file.opts;
  try {
    yield* transformFile$1(file, config.passes);
  } catch (e) {
    e.message = `${opts.filename ?? "unknown file"}: ${e.message}`;
    if (!e.code) {
      e.code = "BABEL_TRANSFORM_ERROR";
    }
    throw e;
  }
  let outputCode, outputMap;
  try {
    if (opts.code !== false) {
      ({
        outputCode,
        outputMap
      } = generateCode(config.passes, file));
    }
  } catch (e) {
    e.message = `${opts.filename ?? "unknown file"}: ${e.message}`;
    if (!e.code) {
      e.code = "BABEL_GENERATE_ERROR";
    }
    throw e;
  }
  return {
    metadata: file.metadata,
    options: opts,
    ast: opts.ast === true ? file.ast : null,
    code: outputCode === undefined ? null : outputCode,
    map: outputMap === undefined ? null : outputMap,
    sourceType: file.ast.program.sourceType,
    externalDependencies: flattenToSet(config.externalDependencies)
  };
}
function* transformFile$1(file, pluginPasses) {
  for (const pluginPairs of pluginPasses) {
    const passPairs = [];
    const passes = [];
    const visitors = [];
    for (const plugin of pluginPairs.concat([loadBlockHoistPlugin()])) {
      const pass = new PluginPass(file, plugin.key, plugin.options);
      passPairs.push([plugin, pass]);
      passes.push(pass);
      visitors.push(plugin.visitor);
    }
    for (const [plugin, pass] of passPairs) {
      const fn = plugin.pre;
      if (fn) {
        const result = fn.call(pass, file);
        yield* [];
        if (isThenable(result)) {
          throw new Error(`You appear to be using an plugin with an async .pre, ` + `which your current version of Babel does not support. ` + `If you're using a published plugin, you may need to upgrade ` + `your @babel/core version.`);
        }
      }
    }
    const visitor = traverse.visitors.merge(visitors, passes, file.opts.wrapPluginVisitorMethod);
    traverse(file.ast, visitor, file.scope);
    for (const [plugin, pass] of passPairs) {
      const fn = plugin.post;
      if (fn) {
        const result = fn.call(pass, file);
        yield* [];
        if (isThenable(result)) {
          throw new Error(`You appear to be using an plugin with an async .post, ` + `which your current version of Babel does not support. ` + `If you're using a published plugin, you may need to upgrade ` + `your @babel/core version.`);
        }
      }
    }
  }
}
function isThenable(val) {
  return !!val && (typeof val === "object" || typeof val === "function") && !!val.then && typeof val.then === "function";
}

const transformFileRunner = gensync(function* (filename, opts) {
  const options = Object.assign({}, opts, {
    filename
  });
  const config = yield* loadConfig$1(options);
  if (config === null) return null;
  const code = yield* readFile(filename, "utf8");
  return yield* run(config, code);
});
function transformFile(...args) {
  transformFileRunner.errback(...args);
}
function transformFileSync(...args) {
  return transformFileRunner.sync(...args); // TODO 待测试
}
function transformFileAsync(...args) {
  return transformFileRunner.async(...args);
}

const require$2 = createRequire(import.meta.url);
let import_;
try {
  import_ = require$2("./import.cjs");
} catch {}
const supportsESM = semver.satisfies(process.versions.node, "^12.17 || >=13.2");
function* loadCodeDefault(filepath, asyncError) {
  switch (path.extname(filepath)) {
    case ".cjs":
      if (process.env.BABEL_8_BREAKING) {
        return loadCjsDefault(filepath);
      } else {
        return loadCjsDefault(filepath, arguments[2]);
      }
    case ".mjs":
      break;
    case ".cts":
      return loadCtsDefault(filepath);
    default:
      try {
        if (process.env.BABEL_8_BREAKING) {
          return loadCjsDefault(filepath);
        } else {
          return loadCjsDefault(filepath, arguments[2]);
        }
      } catch (e) {
        if (e.code !== "ERR_REQUIRE_ESM") throw e;
      }
  }
  if (yield* isAsync()) {
    return yield* waitFor(loadMjsDefault(filepath));
  }
  throw new ConfigError(asyncError, filepath);
}
function loadCtsDefault(filepath) {
  const ext = ".cts";
  const hasTsSupport = !!(require$2.extensions[".ts"] || require$2.extensions[".cts"] || require$2.extensions[".mts"]);
  let handler;
  if (!hasTsSupport) {
    const opts = {
      babelrc: false,
      configFile: false,
      sourceType: "unambiguous",
      sourceMaps: "inline",
      sourceFileName: path.basename(filepath),
      presets: [[getTSPreset(filepath), Object.assign({
        onlyRemoveTypeImports: true,
        optimizeConstEnums: true
      }, process.env.BABEL_8_BREAKING ? {} : {
        allowDeclareFields: true
      })]]
    };
    handler = function (m, filename) {
      if (handler && filename.endsWith(ext)) {
        try {
          return m._compile(transformFileSync(filename, Object.assign({}, opts, {
            filename
          })).code, filename);
        } catch (error) {
          if (!hasTsSupport) {
            const packageJson = require$2("@babel/preset-typescript/package.json");
            if (semver.lt(packageJson.version, "7.21.4")) {
              console.error("`.cts` configuration file failed to load, please try to update `@babel/preset-typescript`.");
            }
          }
          throw error;
        }
      }
      return require$2.extensions[".js"](m, filename);
    };
    require$2.extensions[ext] = handler;
  }
  try {
    const module = endHiddenCallStack(require$2)(filepath);
    return module?.__esModule ? module.default : module;
  } finally {
    if (!hasTsSupport) {
      if (require$2.extensions[ext] === handler) delete require$2.extensions[ext];
      handler = undefined;
    }
  }
}
function loadCjsDefault(filepath) {
  const module = endHiddenCallStack(require$2)(filepath);
  if (process.env.BABEL_8_BREAKING) {
    return module?.__esModule ? module.default : module;
  } else {
    return module?.__esModule ? module.default || (arguments[1] ? module : undefined) : module;
  }
}
async function loadMjsDefault(filepath) {
  if (!import_) {
    throw new ConfigError("Internal error: Native ECMAScript modules aren't supported by this platform.\n", filepath);
  }
  const module = await endHiddenCallStack(import_)(pathToFileURL(filepath));
  return module.default;
}
function getTSPreset(filepath) {
  try {
    return require$2("@babel/preset-typescript");
  } catch (error) {
    if (error.code !== "MODULE_NOT_FOUND") throw error;
    let message = "You appear to be using a .cts file as Babel configuration, but the `@babel/preset-typescript` package was not found: please install it!";
    if (!process.env.BABEL_8_BREAKING) {
      if (process.versions.pnp) {
        message += `
If you are using Yarn Plug'n'Play, you may also need to add the following configuration to your .yarnrc.yml file:

packageExtensions:
\t"@babel/core@*":
\t\tpeerDependencies:
\t\t\t"@babel/preset-typescript": "*"
`;
      }
    }
    throw new ConfigError(message, filepath);
  }
}

const require$1 = createRequire(import.meta.url);
const debug$1 = buildDebug("babel:config:loading:files:configuration");
const ROOT_CONFIG_FILENAMES = ["babel.config.js", "babel.config.cjs", "babel.config.mjs", "babel.config.json", "babel.config.cts"];
const RELATIVE_CONFIG_FILENAMES = [".babelrc", ".babelrc.js", ".babelrc.cjs", ".babelrc.mjs", ".babelrc.json", ".babelrc.cts"];
const BABELIGNORE_FILENAME = ".babelignore";
const LOADING_CONFIGS = new Set();
const readConfigCode = makeStrongCache(function* readConfigCode(filepath, cache) {
  if (!fs.existsSync(filepath)) {
    cache.never();
    return null;
  }
  if (LOADING_CONFIGS.has(filepath)) {
    cache.never();
    debug$1("Auto-ignoring usage of config %o.", filepath);
    return {
      filepath,
      dirname: path.dirname(filepath),
      options: {}
    };
  }
  let options;
  try {
    LOADING_CONFIGS.add(filepath);
    options = yield* loadCodeDefault(filepath, "You appear to be using a native ECMAScript module configuration " + "file, which is only supported when running Babel asynchronously.");
  } finally {
    LOADING_CONFIGS.delete(filepath);
  }
  let assertCache = false;
  if (typeof options === "function") {
    yield* [];
    options = endHiddenCallStack(options)(makeConfigAPI(cache));
    assertCache = true;
  }
  if (!options || typeof options !== "object" || Array.isArray(options)) {
    throw new ConfigError(`Configuration should be an exported JavaScript object.`, filepath);
  }
  if (typeof options.then === "function") {
    throw new ConfigError(`You appear to be using an async configuration, ` + `which your current version of Babel does not support. ` + `We may add support for this in the future, ` + `but if you're on the most recent version of @babel/core and still ` + `seeing this error, then you'll need to synchronously return your config.`, filepath);
  }
  if (assertCache && !cache.configured()) throwConfigError(filepath);
  return {
    filepath,
    dirname: path.dirname(filepath),
    options
  };
});
const packageToBabelConfig = makeWeakCacheSync(file => {
  const babel = file.options["babel"];
  if (typeof babel === "undefined") return null;
  if (typeof babel !== "object" || Array.isArray(babel) || babel === null) {
    throw new ConfigError(`.babel property must be an object`, file.filepath);
  }
  return {
    filepath: file.filepath,
    dirname: file.dirname,
    options: babel
  };
});
const readConfigJSON5 = makeStaticFileCache((filepath, content) => {
  let options;
  try {
    options = json5.parse(content);
  } catch (err) {
    throw new ConfigError(`Error while parsing config - ${err.message}`, filepath);
  }
  if (!options) throw new ConfigError(`No config detected`, filepath);
  if (typeof options !== "object") {
    throw new ConfigError(`Config returned typeof ${typeof options}`, filepath);
  }
  if (Array.isArray(options)) {
    throw new ConfigError(`Expected config object but found array`, filepath);
  }
  delete options["$schema"];
  return {
    filepath,
    dirname: path.dirname(filepath),
    options
  };
});
const readIgnoreConfig = makeStaticFileCache((filepath, content) => {
  const ignoreDir = path.dirname(filepath);
  const ignorePatterns = content.split("\n").map(line => line.replace(/#(.*?)$/, "").trim()).filter(line => !!line);
  for (const pattern of ignorePatterns) {
    if (pattern[0] === "!") {
      throw new ConfigError(`Negation of file paths is not supported.`, filepath);
    }
  }
  return {
    filepath,
    dirname: path.dirname(filepath),
    ignore: ignorePatterns.map(pattern => pathToPattern(pattern, ignoreDir))
  };
});
function findConfigUpwards(rootDir) {
  let dirname = rootDir;
  for (;;) {
    for (const filename of ROOT_CONFIG_FILENAMES) {
      if (fs.existsSync(path.join(dirname, filename))) {
        return dirname;
      }
    }
    const nextDir = path.dirname(dirname);
    if (dirname === nextDir) break;
    dirname = nextDir;
  }
  return null;
}
function* findRelativeConfig(packageData, envName, caller) {
  let config = null;
  let ignore = null;
  const dirname = path.dirname(packageData.filepath);
  for (const loc of packageData.directories) {
    if (!config) {
      config = yield* loadOneConfig(RELATIVE_CONFIG_FILENAMES, loc, envName, caller, packageData.pkg?.dirname === loc ? packageToBabelConfig(packageData.pkg) : null);
    }
    if (!ignore) {
      const ignoreLoc = path.join(loc, BABELIGNORE_FILENAME);
      ignore = yield* readIgnoreConfig(ignoreLoc);
      if (ignore) {
        debug$1("Found ignore %o from %o.", ignore.filepath, dirname);
      }
    }
  }
  return {
    config,
    ignore
  };
}
function findRootConfig(dirname, envName, caller) {
  return loadOneConfig(ROOT_CONFIG_FILENAMES, dirname, envName, caller);
}
function* loadOneConfig(names, dirname, envName, caller, previousConfig = null) {
  const configs = yield* gensync.all(names.map(filename => readConfig(path.join(dirname, filename), envName, caller)));
  const config = configs.reduce((previousConfig, config) => {
    if (config && previousConfig) {
      throw new ConfigError(`Multiple configuration files found. Please remove one:\n` + ` - ${path.basename(previousConfig.filepath)}\n` + ` - ${config.filepath}\n` + `from ${dirname}`);
    }
    return config || previousConfig;
  }, previousConfig);
  if (config) {
    debug$1("Found configuration %o from %o.", config.filepath, dirname);
  }
  return config;
}
function* loadConfig(name, dirname, envName, caller) {
  const filepath = require$1.resolve(name, {
    paths: [dirname]
  });
  const conf = yield* readConfig(filepath, envName, caller);
  if (!conf) {
    throw new ConfigError(`Config file contains no configuration data`, filepath);
  }
  debug$1("Loaded config %o from %o.", name, dirname);
  return conf;
}
function readConfig(filepath, envName, caller) {
  const ext = path.extname(filepath);
  switch (ext) {
    case ".js":
    case ".cjs":
    case ".mjs":
    case ".cts":
      return readConfigCode(filepath, {
        envName,
        caller
      });
    default:
      return readConfigJSON5(filepath);
  }
}
function* resolveShowConfigPath(dirname) {
  const targetPath = process.env.BABEL_SHOW_CONFIG_FOR;
  if (targetPath != null) {
    const absolutePath = path.resolve(dirname, targetPath);
    const stats = yield* stat(absolutePath);
    if (!stats.isFile()) {
      throw new Error(`${absolutePath}: BABEL_SHOW_CONFIG_FOR must refer to a regular file, directories are not supported.`);
    }
    return absolutePath;
  }
  return null;
}
function throwConfigError(filepath) {
  throw new ConfigError(`\
Caching was left unconfigured. Babel's plugins, presets, and .babelrc.js files can be configured
for various types of caching, using the first param of their handler functions:

module.exports = function(api) {
  // The API exposes the following:

  // Cache the returned value forever and don't call this function again.
  api.cache(true);

  // Don't cache at all. Not recommended because it will be very slow.
  api.cache(false);

  // Cached based on the value of some function. If this function returns a value different from
  // a previously-encountered value, the plugins will re-evaluate.
  var env = api.cache(() => process.env.NODE_ENV);

  // If testing for a specific env, we recommend specifics to avoid instantiating a plugin for
  // any possible NODE_ENV value that might come up during plugin execution.
  var isProd = api.cache(() => process.env.NODE_ENV === "production");

  // .cache(fn) will perform a linear search though instances to find the matching plugin based
  // based on previous instantiated plugins. If you want to recreate the plugin and discard the
  // previous instance whenever something changes, you may use:
  var isProd = api.cache.invalidate(() => process.env.NODE_ENV === "production");

  // Note, we also expose the following more-verbose versions of the above examples:
  api.cache.forever(); // api.cache(true)
  api.cache.never();   // api.cache(false)
  api.cache.using(fn); // api.cache(fn)

  // Return the value that will be cached.
  return { };
};`, filepath);
}

const isWindows = process$1.platform === 'win32';
const own$1 = {}.hasOwnProperty;
const classRegExp = /^([A-Z][a-z\d]*)+$/;
const kTypes = new Set(['string', 'function', 'number', 'object', 'Function', 'Object', 'boolean', 'bigint', 'symbol']);
const codes = {};
function formatList(array, type = 'and') {
  return array.length < 3 ? array.join(` ${type} `) : `${array.slice(0, -1).join(', ')}, ${type} ${array[array.length - 1]}`;
}
const messages = new Map();
const nodeInternalPrefix = '__node_internal_';
let userStackTraceLimit;
codes.ERR_INVALID_ARG_TYPE = createError('ERR_INVALID_ARG_TYPE', (name, expected, actual) => {
  assert(typeof name === 'string', "'name' must be a string");
  if (!Array.isArray(expected)) {
    expected = [expected];
  }
  let message = 'The ';
  if (name.endsWith(' argument')) {
    message += `${name} `;
  } else {
    const type = name.includes('.') ? 'property' : 'argument';
    message += `"${name}" ${type} `;
  }
  message += 'must be ';
  const types = [];
  const instances = [];
  const other = [];
  for (const value of expected) {
    assert(typeof value === 'string', 'All expected entries have to be of type string');
    if (kTypes.has(value)) {
      types.push(value.toLowerCase());
    } else if (classRegExp.exec(value) === null) {
      assert(value !== 'object', 'The value "object" should be written as "Object"');
      other.push(value);
    } else {
      instances.push(value);
    }
  }
  if (instances.length > 0) {
    const pos = types.indexOf('object');
    if (pos !== -1) {
      types.slice(pos, 1);
      instances.push('Object');
    }
  }
  if (types.length > 0) {
    message += `${types.length > 1 ? 'one of type' : 'of type'} ${formatList(types, 'or')}`;
    if (instances.length > 0 || other.length > 0) message += ' or ';
  }
  if (instances.length > 0) {
    message += `an instance of ${formatList(instances, 'or')}`;
    if (other.length > 0) message += ' or ';
  }
  if (other.length > 0) {
    if (other.length > 1) {
      message += `one of ${formatList(other, 'or')}`;
    } else {
      if (other[0].toLowerCase() !== other[0]) message += 'an ';
      message += `${other[0]}`;
    }
  }
  message += `. Received ${determineSpecificType(actual)}`;
  return message;
}, TypeError);
codes.ERR_INVALID_MODULE_SPECIFIER = createError('ERR_INVALID_MODULE_SPECIFIER', (request, reason, base = undefined) => {
  return `Invalid module "${request}" ${reason}${base ? ` imported from ${base}` : ''}`;
}, TypeError);
codes.ERR_INVALID_PACKAGE_CONFIG = createError('ERR_INVALID_PACKAGE_CONFIG', (path, base, message) => {
  return `Invalid package config ${path}${base ? ` while importing ${base}` : ''}${message ? `. ${message}` : ''}`;
}, Error);
codes.ERR_INVALID_PACKAGE_TARGET = createError('ERR_INVALID_PACKAGE_TARGET', (pkgPath, key, target, isImport = false, base = undefined) => {
  const relError = typeof target === 'string' && !isImport && target.length > 0 && !target.startsWith('./');
  if (key === '.') {
    assert(isImport === false);
    return `Invalid "exports" main target ${JSON.stringify(target)} defined ` + `in the package config ${pkgPath}package.json${base ? ` imported from ${base}` : ''}${relError ? '; targets must start with "./"' : ''}`;
  }
  return `Invalid "${isImport ? 'imports' : 'exports'}" target ${JSON.stringify(target)} defined for '${key}' in the package config ${pkgPath}package.json${base ? ` imported from ${base}` : ''}${relError ? '; targets must start with "./"' : ''}`;
}, Error);
codes.ERR_MODULE_NOT_FOUND = createError('ERR_MODULE_NOT_FOUND', (path, base, type = 'package') => {
  return `Cannot find ${type} '${path}' imported from ${base}`;
}, Error);
codes.ERR_NETWORK_IMPORT_DISALLOWED = createError('ERR_NETWORK_IMPORT_DISALLOWED', "import of '%s' by %s is not supported: %s", Error);
codes.ERR_PACKAGE_IMPORT_NOT_DEFINED = createError('ERR_PACKAGE_IMPORT_NOT_DEFINED', (specifier, packagePath, base) => {
  return `Package import specifier "${specifier}" is not defined${packagePath ? ` in package ${packagePath}package.json` : ''} imported from ${base}`;
}, TypeError);
codes.ERR_PACKAGE_PATH_NOT_EXPORTED = createError('ERR_PACKAGE_PATH_NOT_EXPORTED', (pkgPath, subpath, base = undefined) => {
  if (subpath === '.') return `No "exports" main defined in ${pkgPath}package.json${base ? ` imported from ${base}` : ''}`;
  return `Package subpath '${subpath}' is not defined by "exports" in ${pkgPath}package.json${base ? ` imported from ${base}` : ''}`;
}, Error);
codes.ERR_UNSUPPORTED_DIR_IMPORT = createError('ERR_UNSUPPORTED_DIR_IMPORT', "Directory import '%s' is not supported " + 'resolving ES modules imported from %s', Error);
codes.ERR_UNKNOWN_FILE_EXTENSION = createError('ERR_UNKNOWN_FILE_EXTENSION', (ext, path) => {
  return `Unknown file extension "${ext}" for ${path}`;
}, TypeError);
codes.ERR_INVALID_ARG_VALUE = createError('ERR_INVALID_ARG_VALUE', (name, value, reason = 'is invalid') => {
  let inspected = inspect(value);
  if (inspected.length > 128) {
    inspected = `${inspected.slice(0, 128)}...`;
  }
  const type = name.includes('.') ? 'property' : 'argument';
  return `The ${type} '${name}' ${reason}. Received ${inspected}`;
}, TypeError);
codes.ERR_UNSUPPORTED_ESM_URL_SCHEME = createError('ERR_UNSUPPORTED_ESM_URL_SCHEME', (url, supported) => {
  let message = `Only URLs with a scheme in: ${formatList(supported)} are supported by the default ESM loader`;
  if (isWindows && url.protocol.length === 2) {
    message += '. On Windows, absolute paths must be valid file:// URLs';
  }
  message += `. Received protocol '${url.protocol}'`;
  return message;
}, Error);
function createError(sym, value, def) {
  messages.set(sym, value);
  return makeNodeErrorWithCode(def, sym);
}
function makeNodeErrorWithCode(Base, key) {
  return NodeError;
  function NodeError(...args) {
    const limit = Error.stackTraceLimit;
    if (isErrorStackTraceLimitWritable()) Error.stackTraceLimit = 0;
    const error = new Base();
    if (isErrorStackTraceLimitWritable()) Error.stackTraceLimit = limit;
    const message = getMessage(key, args, error);
    Object.defineProperties(error, {
      message: {
        value: message,
        enumerable: false,
        writable: true,
        configurable: true
      },
      toString: {
        value() {
          return `${this.name} [${key}]: ${this.message}`;
        },
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
    captureLargerStackTrace(error);
    error.code = key;
    return error;
  }
}
function isErrorStackTraceLimitWritable() {
  try {
    if (v8.startupSnapshot.isBuildingSnapshot()) {
      return false;
    }
  } catch {}
  const desc = Object.getOwnPropertyDescriptor(Error, 'stackTraceLimit');
  if (desc === undefined) {
    return Object.isExtensible(Error);
  }
  return own$1.call(desc, 'writable') && desc.writable !== undefined ? desc.writable : desc.set !== undefined;
}
function hideStackFrames(fn) {
  const hidden = nodeInternalPrefix + fn.name;
  Object.defineProperty(fn, 'name', {
    value: hidden
  });
  return fn;
}
const captureLargerStackTrace = hideStackFrames(function (error) {
  const stackTraceLimitIsWritable = isErrorStackTraceLimitWritable();
  if (stackTraceLimitIsWritable) {
    userStackTraceLimit = Error.stackTraceLimit;
    Error.stackTraceLimit = Number.POSITIVE_INFINITY;
  }
  Error.captureStackTrace(error);
  if (stackTraceLimitIsWritable) Error.stackTraceLimit = userStackTraceLimit;
  return error;
});
function getMessage(key, args, self) {
  const message = messages.get(key);
  assert(message !== undefined, 'expected `message` to be found');
  if (typeof message === 'function') {
    assert(message.length <= args.length, `Code: ${key}; The provided arguments length (${args.length}) does not ` + `match the required ones (${message.length}).`);
    return Reflect.apply(message, self, args);
  }
  const regex = /%[dfijoOs]/g;
  let expectedLength = 0;
  while (regex.exec(message) !== null) expectedLength++;
  assert(expectedLength === args.length, `Code: ${key}; The provided arguments length (${args.length}) does not ` + `match the required ones (${expectedLength}).`);
  if (args.length === 0) return message;
  args.unshift(message);
  return Reflect.apply(format, null, args);
}
function determineSpecificType(value) {
  if (value === null || value === undefined) {
    return String(value);
  }
  if (typeof value === 'function' && value.name) {
    return `function ${value.name}`;
  }
  if (typeof value === 'object') {
    if (value.constructor && value.constructor.name) {
      return `an instance of ${value.constructor.name}`;
    }
    return `${inspect(value, {
      depth: -1
    })}`;
  }
  let inspected = inspect(value, {
    colors: false
  });
  if (inspected.length > 28) {
    inspected = `${inspected.slice(0, 25)}...`;
  }
  return `type ${typeof value} (${inspected})`;
}
const reader = {
  read
};
var packageJsonReader = reader;
function read(jsonPath) {
  try {
    const string = fs.readFileSync(path.toNamespacedPath(path.join(path.dirname(jsonPath), 'package.json')), 'utf8');
    return {
      string
    };
  } catch (error) {
    const exception = error;
    if (exception.code === 'ENOENT') {
      return {
        string: undefined
      };
    }
    throw exception;
  }
}
const {
  ERR_INVALID_PACKAGE_CONFIG: ERR_INVALID_PACKAGE_CONFIG$1
} = codes;
const packageJsonCache = new Map();
function getPackageConfig(path, specifier, base) {
  const existing = packageJsonCache.get(path);
  if (existing !== undefined) {
    return existing;
  }
  const source = packageJsonReader.read(path).string;
  if (source === undefined) {
    const packageConfig = {
      pjsonPath: path,
      exists: false,
      main: undefined,
      name: undefined,
      type: 'none',
      exports: undefined,
      imports: undefined
    };
    packageJsonCache.set(path, packageConfig);
    return packageConfig;
  }
  let packageJson;
  try {
    packageJson = JSON.parse(source);
  } catch (error) {
    const exception = error;
    throw new ERR_INVALID_PACKAGE_CONFIG$1(path, (base ? `"${specifier}" from ` : '') + fileURLToPath(base || specifier), exception.message);
  }
  const {
    exports,
    imports,
    main,
    name,
    type
  } = packageJson;
  const packageConfig = {
    pjsonPath: path,
    exists: true,
    main: typeof main === 'string' ? main : undefined,
    name: typeof name === 'string' ? name : undefined,
    type: type === 'module' || type === 'commonjs' ? type : 'none',
    exports,
    imports: imports && typeof imports === 'object' ? imports : undefined
  };
  packageJsonCache.set(path, packageConfig);
  return packageConfig;
}
function getPackageScopeConfig(resolved) {
  let packageJsonUrl = new URL('package.json', resolved);
  while (true) {
    const packageJsonPath = packageJsonUrl.pathname;
    if (packageJsonPath.endsWith('node_modules/package.json')) break;
    const packageConfig = getPackageConfig(fileURLToPath(packageJsonUrl), resolved);
    if (packageConfig.exists) return packageConfig;
    const lastPackageJsonUrl = packageJsonUrl;
    packageJsonUrl = new URL('../package.json', packageJsonUrl);
    if (packageJsonUrl.pathname === lastPackageJsonUrl.pathname) break;
  }
  const packageJsonPath = fileURLToPath(packageJsonUrl);
  const packageConfig = {
    pjsonPath: packageJsonPath,
    exists: false,
    main: undefined,
    name: undefined,
    type: 'none',
    exports: undefined,
    imports: undefined
  };
  packageJsonCache.set(packageJsonPath, packageConfig);
  return packageConfig;
}
function getPackageType(url) {
  const packageConfig = getPackageScopeConfig(url);
  return packageConfig.type;
}
const {
  ERR_UNKNOWN_FILE_EXTENSION
} = codes;
const hasOwnProperty = {}.hasOwnProperty;
const extensionFormatMap = {
  __proto__: null,
  '.cjs': 'commonjs',
  '.js': 'module',
  '.json': 'json',
  '.mjs': 'module'
};
function mimeToFormat(mime) {
  if (mime && /\s*(text|application)\/javascript\s*(;\s*charset=utf-?8\s*)?/i.test(mime)) return 'module';
  if (mime === 'application/json') return 'json';
  return null;
}
const protocolHandlers = {
  __proto__: null,
  'data:': getDataProtocolModuleFormat,
  'file:': getFileProtocolModuleFormat,
  'http:': getHttpProtocolModuleFormat,
  'https:': getHttpProtocolModuleFormat,
  'node:'() {
    return 'builtin';
  }
};
function getDataProtocolModuleFormat(parsed) {
  const {
    1: mime
  } = /^([^/]+\/[^;,]+)[^,]*?(;base64)?,/.exec(parsed.pathname) || [null, null, null];
  return mimeToFormat(mime);
}
function extname(url) {
  const pathname = url.pathname;
  let index = pathname.length;
  while (index--) {
    const code = pathname.codePointAt(index);
    if (code === 47) {
      return '';
    }
    if (code === 46) {
      return pathname.codePointAt(index - 1) === 47 ? '' : pathname.slice(index);
    }
  }
  return '';
}
function getFileProtocolModuleFormat(url, _context, ignoreErrors) {
  const ext = extname(url);
  if (ext === '.js') {
    return getPackageType(url) === 'module' ? 'module' : 'commonjs';
  }
  const format = extensionFormatMap[ext];
  if (format) return format;
  if (ignoreErrors) {
    return undefined;
  }
  const filepath = fileURLToPath(url);
  throw new ERR_UNKNOWN_FILE_EXTENSION(ext, filepath);
}
function getHttpProtocolModuleFormat() {}
function defaultGetFormatWithoutErrors(url, context) {
  if (!hasOwnProperty.call(protocolHandlers, url.protocol)) {
    return null;
  }
  return protocolHandlers[url.protocol](url, context, true) || null;
}
const {
  ERR_INVALID_ARG_VALUE
} = codes;
const DEFAULT_CONDITIONS = Object.freeze(['node', 'import']);
const DEFAULT_CONDITIONS_SET = new Set(DEFAULT_CONDITIONS);
function getDefaultConditions() {
  return DEFAULT_CONDITIONS;
}
function getDefaultConditionsSet() {
  return DEFAULT_CONDITIONS_SET;
}
function getConditionsSet(conditions) {
  if (conditions !== undefined && conditions !== getDefaultConditions()) {
    if (!Array.isArray(conditions)) {
      throw new ERR_INVALID_ARG_VALUE('conditions', conditions, 'expected an array');
    }
    return new Set(conditions);
  }
  return getDefaultConditionsSet();
}
const RegExpPrototypeSymbolReplace = RegExp.prototype[Symbol.replace];
const experimentalNetworkImports = false;
const {
  ERR_NETWORK_IMPORT_DISALLOWED,
  ERR_INVALID_MODULE_SPECIFIER,
  ERR_INVALID_PACKAGE_CONFIG,
  ERR_INVALID_PACKAGE_TARGET,
  ERR_MODULE_NOT_FOUND,
  ERR_PACKAGE_IMPORT_NOT_DEFINED,
  ERR_PACKAGE_PATH_NOT_EXPORTED,
  ERR_UNSUPPORTED_DIR_IMPORT,
  ERR_UNSUPPORTED_ESM_URL_SCHEME
} = codes;
const own = {}.hasOwnProperty;
const invalidSegmentRegEx = /(^|\\|\/)((\.|%2e)(\.|%2e)?|(n|%6e|%4e)(o|%6f|%4f)(d|%64|%44)(e|%65|%45)(_|%5f)(m|%6d|%4d)(o|%6f|%4f)(d|%64|%44)(u|%75|%55)(l|%6c|%4c)(e|%65|%45)(s|%73|%53))?(\\|\/|$)/i;
const deprecatedInvalidSegmentRegEx = /(^|\\|\/)((\.|%2e)(\.|%2e)?|(n|%6e|%4e)(o|%6f|%4f)(d|%64|%44)(e|%65|%45)(_|%5f)(m|%6d|%4d)(o|%6f|%4f)(d|%64|%44)(u|%75|%55)(l|%6c|%4c)(e|%65|%45)(s|%73|%53))(\\|\/|$)/i;
const invalidPackageNameRegEx = /^\.|%|\\/;
const patternRegEx = /\*/g;
const encodedSepRegEx = /%2f|%5c/i;
const emittedPackageWarnings = new Set();
const doubleSlashRegEx = /[/\\]{2}/;
function emitInvalidSegmentDeprecation(target, request, match, packageJsonUrl, internal, base, isTarget) {
  const pjsonPath = fileURLToPath(packageJsonUrl);
  const double = doubleSlashRegEx.exec(isTarget ? target : request) !== null;
  process$1.emitWarning(`Use of deprecated ${double ? 'double slash' : 'leading or trailing slash matching'} resolving "${target}" for module ` + `request "${request}" ${request === match ? '' : `matched to "${match}" `}in the "${internal ? 'imports' : 'exports'}" field module resolution of the package at ${pjsonPath}${base ? ` imported from ${fileURLToPath(base)}` : ''}.`, 'DeprecationWarning', 'DEP0166');
}
function emitLegacyIndexDeprecation(url, packageJsonUrl, base, main) {
  const format = defaultGetFormatWithoutErrors(url, {
    parentURL: base.href
  });
  if (format !== 'module') return;
  const path = fileURLToPath(url.href);
  const pkgPath = fileURLToPath(new URL('.', packageJsonUrl));
  const basePath = fileURLToPath(base);
  if (main) process$1.emitWarning(`Package ${pkgPath} has a "main" field set to ${JSON.stringify(main)}, ` + `excluding the full filename and extension to the resolved file at "${path.slice(pkgPath.length)}", imported from ${basePath}.\n Automatic extension resolution of the "main" field is` + 'deprecated for ES modules.', 'DeprecationWarning', 'DEP0151');else process$1.emitWarning(`No "main" or "exports" field defined in the package.json for ${pkgPath} resolving the main entry point "${path.slice(pkgPath.length)}", imported from ${basePath}.\nDefault "index" lookups for the main are deprecated for ES modules.`, 'DeprecationWarning', 'DEP0151');
}
function tryStatSync(path) {
  try {
    return statSync(path);
  } catch {
    return new Stats();
  }
}
function fileExists(url) {
  const stats = statSync(url, {
    throwIfNoEntry: false
  });
  const isFile = stats ? stats.isFile() : undefined;
  return isFile === null || isFile === undefined ? false : isFile;
}
function legacyMainResolve(packageJsonUrl, packageConfig, base) {
  let guess;
  if (packageConfig.main !== undefined) {
    guess = new URL(packageConfig.main, packageJsonUrl);
    if (fileExists(guess)) return guess;
    const tries = [`./${packageConfig.main}.js`, `./${packageConfig.main}.json`, `./${packageConfig.main}.node`, `./${packageConfig.main}/index.js`, `./${packageConfig.main}/index.json`, `./${packageConfig.main}/index.node`];
    let i = -1;
    while (++i < tries.length) {
      guess = new URL(tries[i], packageJsonUrl);
      if (fileExists(guess)) break;
      guess = undefined;
    }
    if (guess) {
      emitLegacyIndexDeprecation(guess, packageJsonUrl, base, packageConfig.main);
      return guess;
    }
  }
  const tries = ['./index.js', './index.json', './index.node'];
  let i = -1;
  while (++i < tries.length) {
    guess = new URL(tries[i], packageJsonUrl);
    if (fileExists(guess)) break;
    guess = undefined;
  }
  if (guess) {
    emitLegacyIndexDeprecation(guess, packageJsonUrl, base, packageConfig.main);
    return guess;
  }
  throw new ERR_MODULE_NOT_FOUND(fileURLToPath(new URL('.', packageJsonUrl)), fileURLToPath(base));
}
function finalizeResolution(resolved, base, preserveSymlinks) {
  if (encodedSepRegEx.exec(resolved.pathname) !== null) throw new ERR_INVALID_MODULE_SPECIFIER(resolved.pathname, 'must not include encoded "/" or "\\" characters', fileURLToPath(base));
  const filePath = fileURLToPath(resolved);
  const stats = tryStatSync(filePath.endsWith('/') ? filePath.slice(-1) : filePath);
  if (stats.isDirectory()) {
    const error = new ERR_UNSUPPORTED_DIR_IMPORT(filePath, fileURLToPath(base));
    error.url = String(resolved);
    throw error;
  }
  if (!stats.isFile()) {
    throw new ERR_MODULE_NOT_FOUND(filePath || resolved.pathname, base && fileURLToPath(base), 'module');
  }
  if (!preserveSymlinks) {
    const real = realpathSync(filePath);
    const {
      search,
      hash
    } = resolved;
    resolved = pathToFileURL(real + (filePath.endsWith(path.sep) ? '/' : ''));
    resolved.search = search;
    resolved.hash = hash;
  }
  return resolved;
}
function importNotDefined(specifier, packageJsonUrl, base) {
  return new ERR_PACKAGE_IMPORT_NOT_DEFINED(specifier, packageJsonUrl && fileURLToPath(new URL('.', packageJsonUrl)), fileURLToPath(base));
}
function exportsNotFound(subpath, packageJsonUrl, base) {
  return new ERR_PACKAGE_PATH_NOT_EXPORTED(fileURLToPath(new URL('.', packageJsonUrl)), subpath, base && fileURLToPath(base));
}
function throwInvalidSubpath(request, match, packageJsonUrl, internal, base) {
  const reason = `request is not a valid match in pattern "${match}" for the "${internal ? 'imports' : 'exports'}" resolution of ${fileURLToPath(packageJsonUrl)}`;
  throw new ERR_INVALID_MODULE_SPECIFIER(request, reason, base && fileURLToPath(base));
}
function invalidPackageTarget(subpath, target, packageJsonUrl, internal, base) {
  target = typeof target === 'object' && target !== null ? JSON.stringify(target, null, '') : `${target}`;
  return new ERR_INVALID_PACKAGE_TARGET(fileURLToPath(new URL('.', packageJsonUrl)), subpath, target, internal, base && fileURLToPath(base));
}
function resolvePackageTargetString(target, subpath, match, packageJsonUrl, base, pattern, internal, isPathMap, conditions) {
  if (subpath !== '' && !pattern && target[target.length - 1] !== '/') throw invalidPackageTarget(match, target, packageJsonUrl, internal, base);
  if (!target.startsWith('./')) {
    if (internal && !target.startsWith('../') && !target.startsWith('/')) {
      let isURL = false;
      try {
        new URL(target);
        isURL = true;
      } catch {}
      if (!isURL) {
        const exportTarget = pattern ? RegExpPrototypeSymbolReplace.call(patternRegEx, target, () => subpath) : target + subpath;
        return packageResolve(exportTarget, packageJsonUrl, conditions);
      }
    }
    throw invalidPackageTarget(match, target, packageJsonUrl, internal, base);
  }
  if (invalidSegmentRegEx.exec(target.slice(2)) !== null) {
    if (deprecatedInvalidSegmentRegEx.exec(target.slice(2)) === null) {
      if (!isPathMap) {
        const request = pattern ? match.replace('*', () => subpath) : match + subpath;
        const resolvedTarget = pattern ? RegExpPrototypeSymbolReplace.call(patternRegEx, target, () => subpath) : target;
        emitInvalidSegmentDeprecation(resolvedTarget, request, match, packageJsonUrl, internal, base, true);
      }
    } else {
      throw invalidPackageTarget(match, target, packageJsonUrl, internal, base);
    }
  }
  const resolved = new URL(target, packageJsonUrl);
  const resolvedPath = resolved.pathname;
  const packagePath = new URL('.', packageJsonUrl).pathname;
  if (!resolvedPath.startsWith(packagePath)) throw invalidPackageTarget(match, target, packageJsonUrl, internal, base);
  if (subpath === '') return resolved;
  if (invalidSegmentRegEx.exec(subpath) !== null) {
    const request = pattern ? match.replace('*', () => subpath) : match + subpath;
    if (deprecatedInvalidSegmentRegEx.exec(subpath) === null) {
      if (!isPathMap) {
        const resolvedTarget = pattern ? RegExpPrototypeSymbolReplace.call(patternRegEx, target, () => subpath) : target;
        emitInvalidSegmentDeprecation(resolvedTarget, request, match, packageJsonUrl, internal, base, false);
      }
    } else {
      throwInvalidSubpath(request, match, packageJsonUrl, internal, base);
    }
  }
  if (pattern) {
    return new URL(RegExpPrototypeSymbolReplace.call(patternRegEx, resolved.href, () => subpath));
  }
  return new URL(subpath, resolved);
}
function isArrayIndex(key) {
  const keyNumber = Number(key);
  if (`${keyNumber}` !== key) return false;
  return keyNumber >= 0 && keyNumber < 0xff_ff_ff_ff;
}
function resolvePackageTarget(packageJsonUrl, target, subpath, packageSubpath, base, pattern, internal, isPathMap, conditions) {
  if (typeof target === 'string') {
    return resolvePackageTargetString(target, subpath, packageSubpath, packageJsonUrl, base, pattern, internal, isPathMap, conditions);
  }
  if (Array.isArray(target)) {
    const targetList = target;
    if (targetList.length === 0) return null;
    let lastException;
    let i = -1;
    while (++i < targetList.length) {
      const targetItem = targetList[i];
      let resolveResult;
      try {
        resolveResult = resolvePackageTarget(packageJsonUrl, targetItem, subpath, packageSubpath, base, pattern, internal, isPathMap, conditions);
      } catch (error) {
        const exception = error;
        lastException = exception;
        if (exception.code === 'ERR_INVALID_PACKAGE_TARGET') continue;
        throw error;
      }
      if (resolveResult === undefined) continue;
      if (resolveResult === null) {
        lastException = null;
        continue;
      }
      return resolveResult;
    }
    if (lastException === undefined || lastException === null) {
      return null;
    }
    throw lastException;
  }
  if (typeof target === 'object' && target !== null) {
    const keys = Object.getOwnPropertyNames(target);
    let i = -1;
    while (++i < keys.length) {
      const key = keys[i];
      if (isArrayIndex(key)) {
        throw new ERR_INVALID_PACKAGE_CONFIG(fileURLToPath(packageJsonUrl), base, '"exports" cannot contain numeric property keys.');
      }
    }
    i = -1;
    while (++i < keys.length) {
      const key = keys[i];
      if (key === 'default' || conditions && conditions.has(key)) {
        const conditionalTarget = target[key];
        const resolveResult = resolvePackageTarget(packageJsonUrl, conditionalTarget, subpath, packageSubpath, base, pattern, internal, isPathMap, conditions);
        if (resolveResult === undefined) continue;
        return resolveResult;
      }
    }
    return null;
  }
  if (target === null) {
    return null;
  }
  throw invalidPackageTarget(packageSubpath, target, packageJsonUrl, internal, base);
}
function isConditionalExportsMainSugar(exports, packageJsonUrl, base) {
  if (typeof exports === 'string' || Array.isArray(exports)) return true;
  if (typeof exports !== 'object' || exports === null) return false;
  const keys = Object.getOwnPropertyNames(exports);
  let isConditionalSugar = false;
  let i = 0;
  let j = -1;
  while (++j < keys.length) {
    const key = keys[j];
    const curIsConditionalSugar = key === '' || key[0] !== '.';
    if (i++ === 0) {
      isConditionalSugar = curIsConditionalSugar;
    } else if (isConditionalSugar !== curIsConditionalSugar) {
      throw new ERR_INVALID_PACKAGE_CONFIG(fileURLToPath(packageJsonUrl), base, '"exports" cannot contain some keys starting with \'.\' and some not.' + ' The exports object must either be an object of package subpath keys' + ' or an object of main entry condition name keys only.');
    }
  }
  return isConditionalSugar;
}
function emitTrailingSlashPatternDeprecation(match, pjsonUrl, base) {
  const pjsonPath = fileURLToPath(pjsonUrl);
  if (emittedPackageWarnings.has(pjsonPath + '|' + match)) return;
  emittedPackageWarnings.add(pjsonPath + '|' + match);
  process$1.emitWarning(`Use of deprecated trailing slash pattern mapping "${match}" in the ` + `"exports" field module resolution of the package at ${pjsonPath}${base ? ` imported from ${fileURLToPath(base)}` : ''}. Mapping specifiers ending in "/" is no longer supported.`, 'DeprecationWarning', 'DEP0155');
}
function packageExportsResolve(packageJsonUrl, packageSubpath, packageConfig, base, conditions) {
  let exports = packageConfig.exports;
  if (isConditionalExportsMainSugar(exports, packageJsonUrl, base)) {
    exports = {
      '.': exports
    };
  }
  if (own.call(exports, packageSubpath) && !packageSubpath.includes('*') && !packageSubpath.endsWith('/')) {
    const target = exports[packageSubpath];
    const resolveResult = resolvePackageTarget(packageJsonUrl, target, '', packageSubpath, base, false, false, false, conditions);
    if (resolveResult === null || resolveResult === undefined) {
      throw exportsNotFound(packageSubpath, packageJsonUrl, base);
    }
    return resolveResult;
  }
  let bestMatch = '';
  let bestMatchSubpath = '';
  const keys = Object.getOwnPropertyNames(exports);
  let i = -1;
  while (++i < keys.length) {
    const key = keys[i];
    const patternIndex = key.indexOf('*');
    if (patternIndex !== -1 && packageSubpath.startsWith(key.slice(0, patternIndex))) {
      if (packageSubpath.endsWith('/')) {
        emitTrailingSlashPatternDeprecation(packageSubpath, packageJsonUrl, base);
      }
      const patternTrailer = key.slice(patternIndex + 1);
      if (packageSubpath.length >= key.length && packageSubpath.endsWith(patternTrailer) && patternKeyCompare(bestMatch, key) === 1 && key.lastIndexOf('*') === patternIndex) {
        bestMatch = key;
        bestMatchSubpath = packageSubpath.slice(patternIndex, packageSubpath.length - patternTrailer.length);
      }
    }
  }
  if (bestMatch) {
    const target = exports[bestMatch];
    const resolveResult = resolvePackageTarget(packageJsonUrl, target, bestMatchSubpath, bestMatch, base, true, false, packageSubpath.endsWith('/'), conditions);
    if (resolveResult === null || resolveResult === undefined) {
      throw exportsNotFound(packageSubpath, packageJsonUrl, base);
    }
    return resolveResult;
  }
  throw exportsNotFound(packageSubpath, packageJsonUrl, base);
}
function patternKeyCompare(a, b) {
  const aPatternIndex = a.indexOf('*');
  const bPatternIndex = b.indexOf('*');
  const baseLengthA = aPatternIndex === -1 ? a.length : aPatternIndex + 1;
  const baseLengthB = bPatternIndex === -1 ? b.length : bPatternIndex + 1;
  if (baseLengthA > baseLengthB) return -1;
  if (baseLengthB > baseLengthA) return 1;
  if (aPatternIndex === -1) return 1;
  if (bPatternIndex === -1) return -1;
  if (a.length > b.length) return -1;
  if (b.length > a.length) return 1;
  return 0;
}
function packageImportsResolve(name, base, conditions) {
  if (name === '#' || name.startsWith('#/') || name.endsWith('/')) {
    const reason = 'is not a valid internal imports specifier name';
    throw new ERR_INVALID_MODULE_SPECIFIER(name, reason, fileURLToPath(base));
  }
  let packageJsonUrl;
  const packageConfig = getPackageScopeConfig(base);
  if (packageConfig.exists) {
    packageJsonUrl = pathToFileURL(packageConfig.pjsonPath);
    const imports = packageConfig.imports;
    if (imports) {
      if (own.call(imports, name) && !name.includes('*')) {
        const resolveResult = resolvePackageTarget(packageJsonUrl, imports[name], '', name, base, false, true, false, conditions);
        if (resolveResult !== null && resolveResult !== undefined) {
          return resolveResult;
        }
      } else {
        let bestMatch = '';
        let bestMatchSubpath = '';
        const keys = Object.getOwnPropertyNames(imports);
        let i = -1;
        while (++i < keys.length) {
          const key = keys[i];
          const patternIndex = key.indexOf('*');
          if (patternIndex !== -1 && name.startsWith(key.slice(0, -1))) {
            const patternTrailer = key.slice(patternIndex + 1);
            if (name.length >= key.length && name.endsWith(patternTrailer) && patternKeyCompare(bestMatch, key) === 1 && key.lastIndexOf('*') === patternIndex) {
              bestMatch = key;
              bestMatchSubpath = name.slice(patternIndex, name.length - patternTrailer.length);
            }
          }
        }
        if (bestMatch) {
          const target = imports[bestMatch];
          const resolveResult = resolvePackageTarget(packageJsonUrl, target, bestMatchSubpath, bestMatch, base, true, true, false, conditions);
          if (resolveResult !== null && resolveResult !== undefined) {
            return resolveResult;
          }
        }
      }
    }
  }
  throw importNotDefined(name, packageJsonUrl, base);
}
function parsePackageName(specifier, base) {
  let separatorIndex = specifier.indexOf('/');
  let validPackageName = true;
  let isScoped = false;
  if (specifier[0] === '@') {
    isScoped = true;
    if (separatorIndex === -1 || specifier.length === 0) {
      validPackageName = false;
    } else {
      separatorIndex = specifier.indexOf('/', separatorIndex + 1);
    }
  }
  const packageName = separatorIndex === -1 ? specifier : specifier.slice(0, separatorIndex);
  if (invalidPackageNameRegEx.exec(packageName) !== null) {
    validPackageName = false;
  }
  if (!validPackageName) {
    throw new ERR_INVALID_MODULE_SPECIFIER(specifier, 'is not a valid package name', fileURLToPath(base));
  }
  const packageSubpath = '.' + (separatorIndex === -1 ? '' : specifier.slice(separatorIndex));
  return {
    packageName,
    packageSubpath,
    isScoped
  };
}
function packageResolve(specifier, base, conditions) {
  if (builtinModules.includes(specifier)) {
    return new URL('node:' + specifier);
  }
  const {
    packageName,
    packageSubpath,
    isScoped
  } = parsePackageName(specifier, base);
  const packageConfig = getPackageScopeConfig(base);
  if (packageConfig.exists) {
    const packageJsonUrl = pathToFileURL(packageConfig.pjsonPath);
    if (packageConfig.name === packageName && packageConfig.exports !== undefined && packageConfig.exports !== null) {
      return packageExportsResolve(packageJsonUrl, packageSubpath, packageConfig, base, conditions);
    }
  }
  let packageJsonUrl = new URL('./node_modules/' + packageName + '/package.json', base);
  let packageJsonPath = fileURLToPath(packageJsonUrl);
  let lastPath;
  do {
    const stat = tryStatSync(packageJsonPath.slice(0, -13));
    if (!stat.isDirectory()) {
      lastPath = packageJsonPath;
      packageJsonUrl = new URL((isScoped ? '../../../../node_modules/' : '../../../node_modules/') + packageName + '/package.json', packageJsonUrl);
      packageJsonPath = fileURLToPath(packageJsonUrl);
      continue;
    }
    const packageConfig = getPackageConfig(packageJsonPath, specifier, base);
    if (packageConfig.exports !== undefined && packageConfig.exports !== null) {
      return packageExportsResolve(packageJsonUrl, packageSubpath, packageConfig, base, conditions);
    }
    if (packageSubpath === '.') {
      return legacyMainResolve(packageJsonUrl, packageConfig, base);
    }
    return new URL(packageSubpath, packageJsonUrl);
  } while (packageJsonPath.length !== lastPath.length);
  throw new ERR_MODULE_NOT_FOUND(packageName, fileURLToPath(base));
}
function isRelativeSpecifier(specifier) {
  if (specifier[0] === '.') {
    if (specifier.length === 1 || specifier[1] === '/') return true;
    if (specifier[1] === '.' && (specifier.length === 2 || specifier[2] === '/')) {
      return true;
    }
  }
  return false;
}
function shouldBeTreatedAsRelativeOrAbsolutePath(specifier) {
  if (specifier === '') return false;
  if (specifier[0] === '/') return true;
  return isRelativeSpecifier(specifier);
}
function moduleResolve(specifier, base, conditions, preserveSymlinks) {
  const protocol = base.protocol;
  const isRemote = protocol === 'http:' || protocol === 'https:';
  let resolved;
  if (shouldBeTreatedAsRelativeOrAbsolutePath(specifier)) {
    resolved = new URL(specifier, base);
  } else if (!isRemote && specifier[0] === '#') {
    resolved = packageImportsResolve(specifier, base, conditions);
  } else {
    try {
      resolved = new URL(specifier);
    } catch {
      if (!isRemote) {
        resolved = packageResolve(specifier, base, conditions);
      }
    }
  }
  assert(resolved !== undefined, 'expected to be defined');
  if (resolved.protocol !== 'file:') {
    return resolved;
  }
  return finalizeResolution(resolved, base, preserveSymlinks);
}
function checkIfDisallowedImport(specifier, parsed, parsedParentURL) {
  if (parsedParentURL) {
    const parentProtocol = parsedParentURL.protocol;
    if (parentProtocol === 'http:' || parentProtocol === 'https:') {
      if (shouldBeTreatedAsRelativeOrAbsolutePath(specifier)) {
        const parsedProtocol = parsed?.protocol;
        if (parsedProtocol && parsedProtocol !== 'https:' && parsedProtocol !== 'http:') {
          throw new ERR_NETWORK_IMPORT_DISALLOWED(specifier, parsedParentURL, 'remote imports cannot import from a local location.');
        }
        return {
          url: parsed?.href || ''
        };
      }
      if (builtinModules.includes(specifier)) {
        throw new ERR_NETWORK_IMPORT_DISALLOWED(specifier, parsedParentURL, 'remote imports cannot import from a local location.');
      }
      throw new ERR_NETWORK_IMPORT_DISALLOWED(specifier, parsedParentURL, 'only relative and absolute specifiers are supported.');
    }
  }
}
function isURL(self) {
  return Boolean(self && typeof self === 'object' && 'href' in self && typeof self.href === 'string' && 'protocol' in self && typeof self.protocol === 'string' && self.href && self.protocol);
}
function throwIfInvalidParentURL(parentURL) {
  if (parentURL === undefined) {
    return;
  }
  if (typeof parentURL !== 'string' && !isURL(parentURL)) {
    throw new codes.ERR_INVALID_ARG_TYPE('parentURL', ['string', 'URL'], parentURL);
  }
}
function throwIfUnsupportedURLProtocol(url) {
  const protocol = url.protocol;
  if (protocol !== 'file:' && protocol !== 'data:' && protocol !== 'node:') {
    throw new ERR_UNSUPPORTED_ESM_URL_SCHEME(url);
  }
}
function throwIfUnsupportedURLScheme(parsed, experimentalNetworkImports) {
  const protocol = parsed?.protocol;
  if (protocol && protocol !== 'file:' && protocol !== 'data:' && (!experimentalNetworkImports || protocol !== 'https:' && protocol !== 'http:')) {
    throw new ERR_UNSUPPORTED_ESM_URL_SCHEME(parsed, ['file', 'data'].concat(experimentalNetworkImports ? ['https', 'http'] : []));
  }
}
function defaultResolve(specifier, context = {}) {
  const {
    parentURL
  } = context;
  assert(parentURL !== undefined, 'expected `parentURL` to be defined');
  throwIfInvalidParentURL(parentURL);
  let parsedParentURL;
  if (parentURL) {
    try {
      parsedParentURL = new URL(parentURL);
    } catch {}
  }
  let parsed;
  try {
    parsed = shouldBeTreatedAsRelativeOrAbsolutePath(specifier) ? new URL(specifier, parsedParentURL) : new URL(specifier);
    const protocol = parsed.protocol;
    if (protocol === 'data:' || experimentalNetworkImports && (protocol === 'https:' || protocol === 'http:')) {
      return {
        url: parsed.href,
        format: null
      };
    }
  } catch {}
  const maybeReturn = checkIfDisallowedImport(specifier, parsed, parsedParentURL);
  if (maybeReturn) return maybeReturn;
  if (parsed && parsed.protocol === 'node:') return {
    url: specifier
  };
  throwIfUnsupportedURLScheme(parsed, experimentalNetworkImports);
  const conditions = getConditionsSet(context.conditions);
  const url = moduleResolve(specifier, new URL(parentURL), conditions, false);
  throwIfUnsupportedURLProtocol(url);
  return {
    url: url.href,
    format: defaultGetFormatWithoutErrors(url, {
      parentURL
    })
  };
}
function resolve$1(specifier, parent) {
  if (!parent) {
    throw new Error('Please pass `parent`: `import-meta-resolve` cannot ponyfill that');
  }
  try {
    return defaultResolve(specifier, {
      parentURL: parent
    }).url;
  } catch (error) {
    const exception = error;
    if (exception.code === 'ERR_UNSUPPORTED_DIR_IMPORT' && typeof exception.url === 'string') {
      return exception.url;
    }
    throw error;
  }
}

let importMetaResolve;
{
  if (typeof import.meta.resolve === "function" && typeof import.meta.resolve(import.meta.url) === "string") {
    importMetaResolve = import.meta.resolve;
  } else {
    importMetaResolve = resolve$1;
  }
}
function resolve(specifier, parent) {
  return importMetaResolve(specifier, parent);
}

const require = createRequire(import.meta.url);
const debug = buildDebug("babel:config:loading:files:plugins");
const EXACT_RE = /^module:/;
const BABEL_PLUGIN_PREFIX_RE = /^(?!@|module:|[^/]+\/|babel-plugin-)/;
const BABEL_PRESET_PREFIX_RE = /^(?!@|module:|[^/]+\/|babel-preset-)/;
const BABEL_PLUGIN_ORG_RE = /^(@babel\/)(?!plugin-|[^/]+\/)/;
const BABEL_PRESET_ORG_RE = /^(@babel\/)(?!preset-|[^/]+\/)/;
const OTHER_PLUGIN_ORG_RE = /^(@(?!babel\/)[^/]+\/)(?![^/]*babel-plugin(?:-|\/|$)|[^/]+\/)/;
const OTHER_PRESET_ORG_RE = /^(@(?!babel\/)[^/]+\/)(?![^/]*babel-preset(?:-|\/|$)|[^/]+\/)/;
const OTHER_ORG_DEFAULT_RE = /^(@(?!babel$)[^/]+)$/;
const resolvePlugin = resolveStandardizedName.bind(null, "plugin");
const resolvePreset = resolveStandardizedName.bind(null, "preset");
function* loadPlugin(name, dirname) {
  const filepath = resolvePlugin(name, dirname, yield* isAsync());
  const value = yield* requireModule("plugin", filepath);
  debug("Loaded plugin %o from %o.", name, dirname);
  return {
    filepath,
    value
  };
}
function* loadPreset(name, dirname) {
  const filepath = resolvePreset(name, dirname, yield* isAsync());
  const value = yield* requireModule("preset", filepath);
  debug("Loaded preset %o from %o.", name, dirname);
  return {
    filepath,
    value
  };
}
function standardizeName(type, name) {
  if (path.isAbsolute(name)) return name;
  const isPreset = type === "preset";
  return name.replace(isPreset ? BABEL_PRESET_PREFIX_RE : BABEL_PLUGIN_PREFIX_RE, `babel-${type}-`).replace(isPreset ? BABEL_PRESET_ORG_RE : BABEL_PLUGIN_ORG_RE, `$1${type}-`).replace(isPreset ? OTHER_PRESET_ORG_RE : OTHER_PLUGIN_ORG_RE, `$1babel-${type}-`).replace(OTHER_ORG_DEFAULT_RE, `$1/babel-${type}`).replace(EXACT_RE, "");
}
function* resolveAlternativesHelper(type, name) {
  const standardizedName = standardizeName(type, name);
  const {
    error,
    value
  } = yield standardizedName;
  if (!error) return value;
  if (error.code !== "MODULE_NOT_FOUND") throw error;
  if (standardizedName !== name && !(yield name).error) {
    error.message += `\n- If you want to resolve "${name}", use "module:${name}"`;
  }
  if (!(yield standardizeName(type, "@babel/" + name)).error) {
    error.message += `\n- Did you mean "@babel/${name}"?`;
  }
  const oppositeType = type === "preset" ? "plugin" : "preset";
  if (!(yield standardizeName(oppositeType, name)).error) {
    error.message += `\n- Did you accidentally pass a ${oppositeType} as a ${type}?`;
  }
  if (type === "plugin") {
    const transformName = standardizedName.replace("-proposal-", "-transform-");
    if (transformName !== standardizedName && !(yield transformName).error) {
      error.message += `\n- Did you mean "${transformName}"?`;
    }
  }
  error.message += `\n
Make sure that all the Babel plugins and presets you are using
are defined as dependencies or devDependencies in your package.json
file. It's possible that the missing plugin is loaded by a preset
you are using that forgot to add the plugin to its dependencies: you
can workaround this problem by explicitly adding the missing package
to your top-level package.json.
`;
  throw error;
}
function tryRequireResolve(id, dirname) {
  try {
    if (dirname) {
      return {
        error: null,
        value: require.resolve(id, {
          paths: [dirname]
        })
      };
    } else {
      return {
        error: null,
        value: require.resolve(id)
      };
    }
  } catch (error) {
    return {
      error,
      value: null
    };
  }
}
function tryImportMetaResolve(id, options) {
  try {
    return {
      error: null,
      value: resolve(id, options)
    };
  } catch (error) {
    return {
      error,
      value: null
    };
  }
}
function resolveStandardizedNameForRequire(type, name, dirname) {
  const it = resolveAlternativesHelper(type, name);
  let res = it.next();
  while (!res.done) {
    res = it.next(tryRequireResolve(res.value, dirname));
  }
  return res.value;
}
function resolveStandardizedNameForImport(type, name, dirname) {
  const parentUrl = pathToFileURL(path.join(dirname, "./babel-virtual-resolve-base.js")).href;
  const it = resolveAlternativesHelper(type, name);
  let res = it.next();
  while (!res.done) {
    res = it.next(tryImportMetaResolve(res.value, parentUrl));
  }
  return fileURLToPath(res.value);
}
function resolveStandardizedName(type, name, dirname, resolveESM) {
  if (!supportsESM || !resolveESM) {
    return resolveStandardizedNameForRequire(type, name, dirname);
  }
  try {
    return resolveStandardizedNameForImport(type, name, dirname);
  } catch (e) {
    try {
      return resolveStandardizedNameForRequire(type, name, dirname);
    } catch (e2) {
      if (e.type === "MODULE_NOT_FOUND") throw e;
      if (e2.type === "MODULE_NOT_FOUND") throw e2;
      throw e;
    }
  }
}
if (!process.env.BABEL_8_BREAKING) {
  var LOADING_MODULES = new Set();
}
function* requireModule(type, name) {
  if (!process.env.BABEL_8_BREAKING) {
    if (!(yield* isAsync()) && LOADING_MODULES.has(name)) {
      throw new Error(`Reentrant ${type} detected trying to load "${name}". This module is not ignored ` + "and is trying to load itself while compiling itself, leading to a dependency cycle. " + 'We recommend adding it to your "ignore" list in your babelrc, or to a .babelignore.');
    }
  }
  try {
    if (!process.env.BABEL_8_BREAKING) {
      LOADING_MODULES.add(name);
    }
    if (process.env.BABEL_8_BREAKING) {
      return yield* loadCodeDefault(name, `You appear to be using a native ECMAScript module ${type}, ` + "which is only supported when running Babel asynchronously.");
    } else {
      return yield* loadCodeDefault(name, `You appear to be using a native ECMAScript module ${type}, ` + "which is only supported when running Babel asynchronously.", true);
    }
  } catch (err) {
    err.message = `[BABEL]: ${err.message} (While processing: ${name})`;
    throw err;
  } finally {
    if (!process.env.BABEL_8_BREAKING) {
      LOADING_MODULES.delete(name);
    }
  }
}

const transformRunner = gensync(function* transform(code, opts) {
  const config = yield* loadConfig$1(opts);
  if (config === null) return null;
  return yield* run(config, code);
});
const transform = function transform(code, optsOrCallback, maybeCallback) {
  let opts;
  let callback;
  if (typeof optsOrCallback === "function") {
    callback = optsOrCallback;
    opts = undefined;
  } else {
    opts = optsOrCallback;
    callback = maybeCallback;
  }
  if (callback === undefined) {
    if (process.env.BABEL_8_BREAKING) {
      throw new Error("Starting from Babel 8.0.0, the 'transform' function expects a callback. If you need to call it synchronously, please use 'transformSync'.");
    } else {
      return beginHiddenCallStack(transformRunner.sync)(code, opts);
    }
  }
  beginHiddenCallStack(transformRunner.errback)(code, opts, callback);
};
function transformSync(...args) {
  return beginHiddenCallStack(transformRunner.sync)(...args);
}
function transformAsync(...args) {
  return beginHiddenCallStack(transformRunner.async)(...args);
}

const transformFromAstRunner = gensync(function* (ast, code, opts) {
  const config = yield* loadConfig$1(opts);
  if (config === null) return null;
  if (!ast) throw new Error("No AST given");
  return yield* run(config, code, ast);
});
const transformFromAst = function transformFromAst(ast, code, optsOrCallback, maybeCallback) {
  let opts;
  let callback;
  if (typeof optsOrCallback === "function") {
    callback = optsOrCallback;
    opts = undefined;
  } else {
    opts = optsOrCallback;
    callback = maybeCallback;
  }
  if (callback === undefined) {
    if (process.env.BABEL_8_BREAKING) {
      throw new Error("Starting from Babel 8.0.0, the 'transformFromAst' function expects a callback. If you need to call it synchronously, please use 'transformFromAstSync'.");
    } else {
      return beginHiddenCallStack(transformFromAstRunner.sync)(ast, code, opts);
    }
  }
  beginHiddenCallStack(transformFromAstRunner.errback)(ast, code, opts, callback);
};
function transformFromAstSync(...args) {
  return beginHiddenCallStack(transformFromAstRunner.sync)(...args);
}
function transformFromAstAsync(...args) {
  return beginHiddenCallStack(transformFromAstRunner.async)(...args);
}

const parseRunner = gensync(function* parse(code, opts) {
  const config = yield* loadConfig$1(opts);
  if (config === null) {
    return null;
  }
  return yield* parser(config.passes, normalizeOptions(config), code);
});
const parse = function parse(code, opts, callback) {
  if (typeof opts === "function") {
    callback = opts;
    opts = undefined;
  }
  if (callback === undefined) {
    if (process.env.BABEL_8_BREAKING) {
      throw new Error("Starting from Babel 8.0.0, the 'parse' function expects a callback. If you need to call it synchronously, please use 'parseSync'.");
    } else {
      return beginHiddenCallStack(parseRunner.sync)(code, opts);
    }
  }
  beginHiddenCallStack(parseRunner.errback)(code, opts, callback);
};
function parseSync(...args) {
  return beginHiddenCallStack(parseRunner.sync)(...args);
}
function parseAsync(...args) {
  return beginHiddenCallStack(parseRunner.async)(...args);
}

const version = "7.22.9";
const DEFAULT_EXTENSIONS = Object.freeze([".js", ".jsx", ".es6", ".es", ".mjs", ".cjs"]);
{
  {
    const cjsProxy = Module.createRequire(import.meta.url)("../cjs-proxy.cjs");
    cjsProxy["__ initialize @babel/core cjs proxy __"] = thisFile;
  }
}
if (!process.env.BABEL_8_BREAKING) ;

export { DEFAULT_EXTENSIONS, File, buildExternalHelpers, createConfigItem, createConfigItemAsync, createConfigItemSync, getEnv, loadOptions, loadOptionsAsync, loadOptionsSync, loadPartialConfig, loadPartialConfigAsync, loadPartialConfigSync, parse, parseAsync, parseSync, resolvePlugin, resolvePreset, transform, transformAsync, transformFile, transformFileAsync, transformFileSync, transformFromAst, transformFromAstAsync, transformFromAstSync, transformSync, version };
