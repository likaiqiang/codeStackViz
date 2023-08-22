const _excluded = ["showIgnoredFiles"];
function _objectWithoutPropertiesLoose(source, excluded) { if (source == null) return {}; var target = {}; var sourceKeys = Object.keys(source); var key, i; for (i = 0; i < sourceKeys.length; i++) { key = sourceKeys[i]; if (excluded.indexOf(key) >= 0) continue; target[key] = source[key]; } return target; }
import path from "path";
import gensync from "gensync";
import Plugin from "./plugin.js";
import { mergeOptions } from "./util.js";
import { createItemFromDescriptor } from "./item.js";
import { buildRootChain } from "./config-chain.js";
import { getEnv } from "./helpers/environment.js";
import { validate } from "./validation/options.js";
import { findConfigUpwards, resolveShowConfigPath, ROOT_CONFIG_FILENAMES } from "./files/index.js";
import { resolveTargets } from "./resolve-targets.js";
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
export default function* loadPrivatePartialConfig(inputOpts) {
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
export const loadPartialConfig = gensync(function* (opts) {
  let showIgnoredFiles = false;
  if (typeof opts === "object" && opts !== null && !Array.isArray(opts)) {
    var _opts = opts;
    ({
      showIgnoredFiles
    } = _opts);
    opts = _objectWithoutPropertiesLoose(_opts, _excluded);
    _opts;
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