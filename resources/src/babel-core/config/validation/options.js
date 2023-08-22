import removed from "./removed.js";
import { msg, access, assertString, assertBoolean, assertObject, assertArray, assertCallerMetadata, assertInputSourceMap, assertIgnoreList, assertPluginList, assertConfigApplicableTest, assertConfigFileSearch, assertBabelrcSearch, assertFunction, assertRootMode, assertSourceMaps, assertCompact, assertSourceType, assertTargets, assertAssumptions } from "./option-assertions.js";
import ConfigError from "../../errors/config-error.js";
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
export const assumptionsNames = new Set(knownAssumptions);
function getSource(loc) {
  return loc.type === "root" ? loc.source : getSource(loc.parent);
}
export function validate(type, opts, filename) {
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
export function checkNoUnwrappedItemOptionPairs(items, index, type, e) {
  if (index === 0) return;
  const lastItem = items[index - 1];
  const thisItem = items[index];
  if (lastItem.file && lastItem.options === undefined && typeof thisItem.value === "object") {
    e.message += `\n- Maybe you meant to use\n` + `"${type}s": [\n  ["${lastItem.file.request}", ${JSON.stringify(thisItem.value, undefined, 2)}]\n]\n` + `To be a valid ${type}, its name and options should be wrapped in a pair of brackets`;
  }
}