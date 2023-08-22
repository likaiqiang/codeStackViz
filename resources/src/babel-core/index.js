export const version = "7.22.9";
export { default as File } from "./transformation/file/file.js";
export { default as buildExternalHelpers } from "./tools/build-external-helpers.js";
export { resolvePlugin, resolvePreset } from "./config/files/index.js";
export { getEnv } from "./config/helpers/environment.js";
export * as types from "@babel/types";
export { tokTypes } from "@babel/parser";
export { default as traverse } from "@babel/traverse";
export { default as template } from "@babel/template";
export { createConfigItem, createConfigItemSync, createConfigItemAsync } from "./config/index.js";
export { loadPartialConfig, loadPartialConfigSync, loadPartialConfigAsync, loadOptions, loadOptionsAsync } from "./config/index.js";
import { loadOptionsSync } from "./config/index.js";
export { loadOptionsSync };
export { transform, transformSync, transformAsync } from "./transform.js";
export { transformFile, transformFileSync, transformFileAsync } from "./transform-file.js";
export { transformFromAst, transformFromAstSync, transformFromAstAsync } from "./transform-ast.js";
export { parse, parseSync, parseAsync } from "./parse.js";
export const DEFAULT_EXTENSIONS = Object.freeze([".js", ".jsx", ".es6", ".es", ".mjs", ".cjs"]);
import Module from "module";
import * as thisFile from "./index.js";
{
  {
    const cjsProxy = Module.createRequire(import.meta.url)("../cjs-proxy.cjs");
    cjsProxy["__ initialize @babel/core cjs proxy __"] = thisFile;
  }
}
if (!process.env.BABEL_8_BREAKING) {
  ;
}