import require$$1$2 from '../package.json';
import require$$0$1 from 'os';
import require$$1$1 from 'path';
import require$$2 from 'zlib';
import require$$3 from 'crypto';
import require$$1 from 'util';
import require$$5$1 from 'fs/promises';
import require$$0 from '@babel/core';
import require$$7 from 'schema-utils';

function getDefaultExportFromCjs (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

function commonjsRequire(path) {
	throw new Error('Could not dynamically require "' + path + '". Please configure the dynamicRequireTargets or/and ignoreDynamicRequires option of @rollup/plugin-commonjs appropriately for this require call to work.');
}

var babelLoader = {exports: {}};

var transform$3 = {exports: {}};

const STRIP_FILENAME_RE = /^[^:]+: /;

const format = err => {
  if (err instanceof SyntaxError) {
    err.name = "SyntaxError";
    err.message = err.message.replace(STRIP_FILENAME_RE, "");

    err.hideStack = true;
  } else if (err instanceof TypeError) {
    err.name = null;
    err.message = err.message.replace(STRIP_FILENAME_RE, "");

    err.hideStack = true;
  }

  return err;
};

let LoaderError$1 = class LoaderError extends Error {
  constructor(err) {
    super();

    const { name, message, codeFrame, hideStack } = format(err);

    this.name = "BabelLoaderError";

    this.message = `${name ? `${name}: ` : ""}${message}\n\n${codeFrame}\n`;

    this.hideStack = hideStack;

    Error.captureStackTrace(this, this.constructor);
  }
};

var _Error = LoaderError$1;

const babel$2 = require$$0;
const { promisify: promisify$1 } = require$$1;
const LoaderError = _Error;

const transform$2 = promisify$1(babel$2.transform);

transform$3.exports = async function (source, options) {
  let result;
  try {
    result = await transform$2(source, options);
  } catch (err) {
    throw err.message && err.codeFrame ? new LoaderError(err) : err;
  }

  if (!result) return null;

  // We don't return the full result here because some entries are not
  // really serializable. For a full list of properties see here:
  // https://github.com/babel/babel/blob/main/packages/babel-core/src/transformation/index.js
  // For discussion on this topic see here:
  // https://github.com/babel/babel-loader/pull/629
  const { ast, code, map, metadata, sourceType, externalDependencies } = result;

  if (map && (!map.sourcesContent || !map.sourcesContent.length)) {
    map.sourcesContent = [source];
  }

  return {
    ast,
    code,
    map,
    metadata,
    sourceType,
    // Convert it from a Set to an Array to make it JSON-serializable.
    externalDependencies: Array.from(externalDependencies || []),
  };
};

transform$3.exports.version = babel$2.version;

var transformExports = transform$3.exports;

/**
 * Filesystem Cache
 *
 * Given a file and a transform function, cache the result into files
 * or retrieve the previously cached files if the given file is already known.
 *
 * @see https://github.com/babel/babel-loader/issues/34
 * @see https://github.com/babel/babel-loader/pull/41
 */

const os = require$$0$1;
const path = require$$1$1;
const zlib = require$$2;
const crypto = require$$3;
const { promisify } = require$$1;
const { readFile, writeFile, mkdir } = require$$5$1;
const findCacheDirP = import('find-cache-dir');

const transform$1 = transformExports;
// Lazily instantiated when needed
let defaultCacheDirectory = null;

let hashType = "sha256";
// use md5 hashing if sha256 is not available
try {
  crypto.createHash(hashType);
} catch (err) {
  hashType = "md5";
}

const gunzip = promisify(zlib.gunzip);
const gzip = promisify(zlib.gzip);

/**
 * Read the contents from the compressed file.
 *
 * @async
 * @params {String} filename
 * @params {Boolean} compress
 */
const read = async function (filename, compress) {
  const data = await readFile(filename + (compress ? ".gz" : ""));
  const content = compress ? await gunzip(data) : data;

  return JSON.parse(content.toString());
};

/**
 * Write contents into a compressed file.
 *
 * @async
 * @params {String} filename
 * @params {Boolean} compress
 * @params {String} result
 */
const write = async function (filename, compress, result) {
  const content = JSON.stringify(result);

  const data = compress ? await gzip(content) : content;
  return await writeFile(filename + (compress ? ".gz" : ""), data);
};

/**
 * Build the filename for the cached file
 *
 * @params {String} source  File source code
 * @params {Object} options Options used
 *
 * @return {String}
 */
const filename = function (source, identifier, options) {
  const hash = crypto.createHash(hashType);

  const contents = JSON.stringify({ source, options, identifier });

  hash.update(contents);

  return hash.digest("hex") + ".json";
};

/**
 * Handle the cache
 *
 * @params {String} directory
 * @params {Object} params
 */
const handleCache = async function (directory, params) {
  const {
    source,
    options = {},
    cacheIdentifier,
    cacheDirectory,
    cacheCompression,
  } = params;

  const file = path.join(directory, filename(source, cacheIdentifier, options));

  try {
    // No errors mean that the file was previously cached
    // we just need to return it
    return await read(file, cacheCompression);
  } catch (err) {}

  const fallback =
    typeof cacheDirectory !== "string" && directory !== os.tmpdir();

  // Make sure the directory exists.
  try {
    // overwrite directory if exists
    await mkdir(directory, { recursive: true });
  } catch (err) {
    if (fallback) {
      return handleCache(os.tmpdir(), params);
    }

    throw err;
  }

  // Otherwise just transform the file
  // return it to the user asap and write it in cache
  const result = await transform$1(source, options);

  // Do not cache if there are external dependencies,
  // since they might change and we cannot control it.
  if (!result.externalDependencies.length) {
    try {
      await write(file, cacheCompression, result);
    } catch (err) {
      if (fallback) {
        // Fallback to tmpdir if node_modules folder not writable
        return handleCache(os.tmpdir(), params);
      }

      throw err;
    }
  }

  return result;
};

/**
 * Retrieve file from cache, or create a new one for future reads
 *
 * @async
 * @param  {Object}   params
 * @param  {String}   params.cacheDirectory   Directory to store cached files
 * @param  {String}   params.cacheIdentifier  Unique identifier to bust cache
 * @param  {Boolean}  params.cacheCompression Whether compressing cached files
 * @param  {String}   params.source   Original contents of the file to be cached
 * @param  {Object}   params.options  Options to be given to the transform fn
 *
 * @example
 *
 *   const result = await cache({
 *     cacheDirectory: '.tmp/cache',
 *     cacheIdentifier: 'babel-loader-cachefile',
 *     cacheCompression: false,
 *     source: *source code from file*,
 *     options: {
 *       experimental: true,
 *       runtime: true
 *     },
 *   });
 */

var cache$1 = async function (params) {
  let directory;

  if (typeof params.cacheDirectory === "string") {
    directory = params.cacheDirectory;
  } else {
    if (defaultCacheDirectory === null) {
      const { default: findCacheDir } = await findCacheDirP;
      defaultCacheDirectory =
        findCacheDir({ name: "babel-loader" }) || os.tmpdir();
    }

    directory = defaultCacheDirectory;
  }

  return await handleCache(directory, params);
};

const babel$1 = require$$0;

var injectCaller$1 = function injectCaller(opts, target) {
  if (!supportsCallerOption()) return opts;

  return Object.assign({}, opts, {
    caller: Object.assign(
      {
        name: "babel-loader",

        // Provide plugins with insight into webpack target.
        // https://github.com/babel/babel-loader/issues/787
        target,

        // Webpack >= 2 supports ESM and dynamic import.
        supportsStaticESM: true,
        supportsDynamicImport: true,

        // Webpack 5 supports TLA behind a flag. We enable it by default
        // for Babel, and then webpack will throw an error if the experimental
        // flag isn't enabled.
        supportsTopLevelAwait: true,
      },
      opts.caller,
    ),
  });
};

// TODO: We can remove this eventually, I'm just adding it so that people have
// a little time to migrate to the newer RCs of @babel/core without getting
// hard-to-diagnose errors about unknown 'caller' options.
let supportsCallerOptionFlag = undefined;
function supportsCallerOption() {
  if (supportsCallerOptionFlag === undefined) {
    try {
      // Rather than try to match the Babel version, we just see if it throws
      // when passed a 'caller' flag, and use that to decide if it is supported.
      babel$1.loadPartialConfig({
        caller: undefined,
        babelrc: false,
        configFile: false,
      });
      supportsCallerOptionFlag = true;
    } catch (err) {
      supportsCallerOptionFlag = false;
    }
  }

  return supportsCallerOptionFlag;
}

var type = "object";
var properties = {
	cacheDirectory: {
		oneOf: [
			{
				type: "boolean"
			},
			{
				type: "string"
			}
		],
		"default": false
	},
	cacheIdentifier: {
		type: "string"
	},
	cacheCompression: {
		type: "boolean",
		"default": true
	},
	customize: {
		type: "string",
		"default": null
	}
};
var additionalProperties = true;
var require$$5 = {
	type: type,
	properties: properties,
	additionalProperties: additionalProperties
};

let babel;
try {
  babel = require("@babel/core");
} catch (err) {
  if (err.code === "MODULE_NOT_FOUND") {
    err.message +=
      "\n babel-loader@9 requires Babel 7.12+ (the package '@babel/core'). " +
      "If you'd like to use Babel 6.x ('babel-core'), you should install 'babel-loader@7'.";
  }
  throw err;
}

// Since we've got the reverse bridge package at @babel/core@6.x, give
// people useful feedback if they try to use it alongside babel-loader.
if (/^6\./.test(babel.version)) {
  throw new Error(
    "\n babel-loader@9 will not work with the '@babel/core@6' bridge package. " +
      "If you want to use Babel 6.x, install 'babel-loader@7'.",
  );
}

const { version } = require$$1$2;
const cache = cache$1;
const transform = transformExports;
const injectCaller = injectCaller$1;
const schema = require$$5;

const { isAbsolute } = require$$1$1;
const validateOptions = require$$7.validate;

function subscribe(subscriber, metadata, context) {
  if (context[subscriber]) {
    context[subscriber](metadata);
  }
}

babelLoader.exports = makeLoader();
var custom = babelLoader.exports.custom = makeLoader;

function makeLoader(callback) {
  const overrides = callback ? callback(babel) : undefined;

  return function (source, inputSourceMap) {
    // Make the loader async
    const callback = this.async();

    loader.call(this, source, inputSourceMap, overrides).then(
      args => callback(null, ...args),
      err => callback(err),
    );
  };
}

async function loader(source, inputSourceMap, overrides) {
  const filename = this.resourcePath;

  let loaderOptions = this.getOptions();
  validateOptions(schema, loaderOptions, {
    name: "Babel loader",
  });

  if (loaderOptions.customize != null) {
    if (typeof loaderOptions.customize !== "string") {
      throw new Error(
        "Customized loaders must be implemented as standalone modules.",
      );
    }
    if (!isAbsolute(loaderOptions.customize)) {
      throw new Error(
        "Customized loaders must be passed as absolute paths, since " +
          "babel-loader has no way to know what they would be relative to.",
      );
    }
    if (overrides) {
      throw new Error(
        "babel-loader's 'customize' option is not available when already " +
          "using a customized babel-loader wrapper.",
      );
    }

    let override = commonjsRequire(loaderOptions.customize);
    if (override.__esModule) override = override.default;

    if (typeof override !== "function") {
      throw new Error("Custom overrides must be functions.");
    }
    overrides = override(babel);
  }

  let customOptions;
  if (overrides && overrides.customOptions) {
    const result = await overrides.customOptions.call(this, loaderOptions, {
      source,
      map: inputSourceMap,
    });
    customOptions = result.custom;
    loaderOptions = result.loader;
  }

  // Deprecation handling
  if ("forceEnv" in loaderOptions) {
    console.warn(
      "The option `forceEnv` has been removed in favor of `envName` in Babel 7.",
    );
  }
  if (typeof loaderOptions.babelrc === "string") {
    console.warn(
      "The option `babelrc` should not be set to a string anymore in the babel-loader config. " +
        "Please update your configuration and set `babelrc` to true or false.\n" +
        "If you want to specify a specific babel config file to inherit config from " +
        "please use the `extends` option.\nFor more information about this options see " +
        "https://babeljs.io/docs/core-packages/#options",
    );
  }

  // Standardize on 'sourceMaps' as the key passed through to Webpack, so that
  // users may safely use either one alongside our default use of
  // 'this.sourceMap' below without getting error about conflicting aliases.
  if (
    Object.prototype.hasOwnProperty.call(loaderOptions, "sourceMap") &&
    !Object.prototype.hasOwnProperty.call(loaderOptions, "sourceMaps")
  ) {
    loaderOptions = Object.assign({}, loaderOptions, {
      sourceMaps: loaderOptions.sourceMap,
    });
    delete loaderOptions.sourceMap;
  }

  const programmaticOptions = Object.assign({}, loaderOptions, {
    filename,
    inputSourceMap: inputSourceMap || loaderOptions.inputSourceMap,

    // Set the default sourcemap behavior based on Webpack's mapping flag,
    // but allow users to override if they want.
    sourceMaps:
      loaderOptions.sourceMaps === undefined
        ? this.sourceMap
        : loaderOptions.sourceMaps,

    // Ensure that Webpack will get a full absolute path in the sourcemap
    // so that it can properly map the module back to its internal cached
    // modules.
    sourceFileName: filename,
  });
  // Remove loader related options
  delete programmaticOptions.customize;
  delete programmaticOptions.cacheDirectory;
  delete programmaticOptions.cacheIdentifier;
  delete programmaticOptions.cacheCompression;
  delete programmaticOptions.metadataSubscribers;

  const config = await babel.loadPartialConfigAsync(
    injectCaller(programmaticOptions, this.target),
  );
  if (config) {
    let options = config.options;
    if (overrides && overrides.config) {
      options = await overrides.config.call(this, config, {
        source,
        map: inputSourceMap,
        customOptions,
      });
    }

    if (options.sourceMaps === "inline") {
      // Babel has this weird behavior where if you set "inline", we
      // inline the sourcemap, and set 'result.map = null'. This results
      // in bad behavior from Babel since the maps get put into the code,
      // which Webpack does not expect, and because the map we return to
      // Webpack is null, which is also bad. To avoid that, we override the
      // behavior here so "inline" just behaves like 'true'.
      options.sourceMaps = true;
    }

    const {
      cacheDirectory = null,
      cacheIdentifier = JSON.stringify({
        options,
        "@babel/core": transform.version,
        "@babel/loader": version,
      }),
      cacheCompression = true,
      metadataSubscribers = [],
    } = loaderOptions;

    let result;
    if (cacheDirectory) {
      result = await cache({
        source,
        options,
        transform,
        cacheDirectory,
        cacheIdentifier,
        cacheCompression,
      });
    } else {
      result = await transform(source, options);
    }

    config.files.forEach(configFile => this.addDependency(configFile));

    if (result) {
      if (overrides && overrides.result) {
        result = await overrides.result.call(this, result, {
          source,
          map: inputSourceMap,
          customOptions,
          config,
          options,
        });
      }

      const { code, map, metadata, externalDependencies } = result;

      externalDependencies?.forEach(dep => this.addDependency(dep));
      metadataSubscribers.forEach(subscriber => {
        subscribe(subscriber, metadata, this);
      });

      return [code, map];
    }
  }

  // If the file was ignored, pass through the original content.
  return [source, inputSourceMap];
}

var babelLoaderExports = babelLoader.exports;
var index = /*@__PURE__*/getDefaultExportFromCjs(babelLoaderExports);

export { custom, index as default };
