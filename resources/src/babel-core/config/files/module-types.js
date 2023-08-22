import { isAsync, waitFor } from "../../gensync-utils/async.js";
import path from "path";
import { pathToFileURL } from "url";
import { createRequire } from "module";
import semver from "semver";
import { endHiddenCallStack } from "../../errors/rewrite-stack-trace.js";
import ConfigError from "../../errors/config-error.js";
import { transformFileSync } from "../../transform-file.js";
const require = createRequire(import.meta.url);
let import_;
try {
  import_ = require("./import.cjs");
} catch {}
export const supportsESM = semver.satisfies(process.versions.node, "^12.17 || >=13.2");
export default function* loadCodeDefault(filepath, asyncError) {
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
  const hasTsSupport = !!(require.extensions[".ts"] || require.extensions[".cts"] || require.extensions[".mts"]);
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
            const packageJson = require("@babel/preset-typescript/package.json");
            if (semver.lt(packageJson.version, "7.21.4")) {
              console.error("`.cts` configuration file failed to load, please try to update `@babel/preset-typescript`.");
            }
          }
          throw error;
        }
      }
      return require.extensions[".js"](m, filename);
    };
    require.extensions[ext] = handler;
  }
  try {
    const module = endHiddenCallStack(require)(filepath);
    return module?.__esModule ? module.default : module;
  } finally {
    if (!hasTsSupport) {
      if (require.extensions[ext] === handler) delete require.extensions[ext];
      handler = undefined;
    }
  }
}
function loadCjsDefault(filepath) {
  const module = endHiddenCallStack(require)(filepath);
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
    return require("@babel/preset-typescript");
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