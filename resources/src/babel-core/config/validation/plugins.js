import { assertString, assertFunction, assertObject, msg } from "./option-assertions.js";
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
export function validatePluginObject(obj) {
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