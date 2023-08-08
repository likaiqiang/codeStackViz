import path from 'path';
import loaderUtils, { getOptions } from 'loader-utils';
import { validate } from 'schema-utils';
import mime from 'mime-types';

function normalizeFallback(fallback, originalOptions) {
    let loader = 'file-loader';
    let options = {};

    if (typeof fallback === 'string') {
        loader = fallback;

        const index = fallback.indexOf('?');

        if (index >= 0) {
            loader = fallback.substr(0, index);
            options = loaderUtils.parseQuery(fallback.substr(index));
        }
    }

    if (fallback !== null && typeof fallback === 'object') {
        ({ loader, options } = fallback);
    }

    options = Object.assign({}, originalOptions, options);

    delete options.fallback;

    return { loader, options };
}

var type = "object";
var properties = {
    limit: {
        description: "Enables/Disables transformation target file into base64 URIs (https://github.com/webpack-contrib/url-loader#limit).",
        type: [
            "boolean",
            "number",
            "string"
        ]
    },
    encoding: {
        description: "Specify the encoding which the file will be in-lined with.",
        oneOf: [
            {
                type: "boolean"
            },
            {
                "enum": [
                    "utf8",
                    "utf16le",
                    "latin1",
                    "base64",
                    "hex",
                    "ascii",
                    "binary",
                    "ucs2"
                ]
            }
        ]
    },
    mimetype: {
        description: "The MIME type for the file to be transformed (https://github.com/webpack-contrib/url-loader#mimetype).",
        oneOf: [
            {
                type: "boolean"
            },
            {
                type: "string"
            }
        ]
    },
    generator: {
        description: "Adding custom implementation for encoding files.",
        "instanceof": "Function"
    },
    fallback: {
        description: "An alternative loader to use when a target file's size exceeds the limit set in the limit option (https://github.com/webpack-contrib/url-loader#fallback).",
        anyOf: [
            {
                type: "string"
            },
            {
                additionalProperties: false,
                properties: {
                    loader: {
                        description: "Fallback loader name.",
                        type: "string"
                    },
                    options: {
                        description: "Fallback loader options.",
                        anyOf: [
                            {
                                type: "object"
                            },
                            {
                                type: "string"
                            }
                        ]
                    }
                },
                type: "object"
            }
        ]
    },
    esModule: {
        description: "By default, url-loader generates JS modules that use the ES modules syntax.",
        type: "boolean"
    }
};
var additionalProperties = true;
var schema = {
    type: type,
    properties: properties,
    additionalProperties: additionalProperties
};

function shouldTransform(limit, size) {
    if (typeof limit === 'boolean') {
        return limit;
    }

    if (typeof limit === 'string') {
        return size <= parseInt(limit, 10);
    }

    if (typeof limit === 'number') {
        return size <= limit;
    }

    return true;
}

function getMimetype(mimetype, resourcePath) {
    if (typeof mimetype === 'boolean') {
        if (mimetype) {
            const resolvedMimeType = mime.contentType(path.extname(resourcePath));

            if (!resolvedMimeType) {
                return '';
            }

            return resolvedMimeType.replace(/;\s+charset/i, ';charset');
        }

        return '';
    }

    if (typeof mimetype === 'string') {
        return mimetype;
    }

    const resolvedMimeType = mime.contentType(path.extname(resourcePath));

    if (!resolvedMimeType) {
        return '';
    }

    return resolvedMimeType.replace(/;\s+charset/i, ';charset');
}

function getEncoding(encoding) {
    if (typeof encoding === 'boolean') {
        return encoding ? 'base64' : '';
    }

    if (typeof encoding === 'string') {
        return encoding;
    }

    return 'base64';
}

function getEncodedData(generator, mimetype, encoding, content, resourcePath) {
    if (generator) {
        return generator(content, mimetype, encoding, resourcePath);
    }

    return `data:${mimetype}${encoding ? `;${encoding}` : ''},${content.toString(
        // eslint-disable-next-line no-undefined
        encoding || undefined
    )}`;
}

function loader(content) {
    // Loader Options
    const options = getOptions(this) || {};

    validate(schema, options, {
        name: 'URL Loader',
        baseDataPath: 'options',
    });

    // No limit or within the specified limit
    if (shouldTransform(options.limit, content.length)) {
        const { resourcePath } = this;
        const mimetype = getMimetype(options.mimetype, resourcePath);
        const encoding = getEncoding(options.encoding);

        if (typeof content === 'string') {
            // eslint-disable-next-line no-param-reassign
            content = Buffer.from(content);
        }

        const encodedData = getEncodedData(
            options.generator,
            mimetype,
            encoding,
            content,
            resourcePath
        );

        const esModule =
            typeof options.esModule !== 'undefined' ? options.esModule : true;

        return `${
            esModule ? 'export default' : 'module.exports ='
        } ${JSON.stringify(encodedData)}`;
    }

    // Normalize the fallback.
    const {
        loader: fallbackLoader,
        options: fallbackOptions,
    } = normalizeFallback(options.fallback, options);

    // Require the fallback.
    // eslint-disable-next-line global-require, import/no-dynamic-require
    const fallback = require(fallbackLoader);

    // Call the fallback, passing a copy of the loader context. The copy has the query replaced. This way, the fallback
    // loader receives the query which was intended for it instead of the query which was intended for url-loader.
    const fallbackLoaderContext = Object.assign({}, this, {
        query: fallbackOptions,
    });

    return fallback.call(fallbackLoaderContext, content);
}

// Loader Mode
const raw = true;

export { loader as default, raw };
