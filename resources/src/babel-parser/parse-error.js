const _excluded = ["toMessage"],
  _excluded2 = ["message"];
function _objectWithoutPropertiesLoose(source, excluded) { if (source == null) return {}; var target = {}; var sourceKeys = Object.keys(source); var key, i; for (i = 0; i < sourceKeys.length; i++) { key = sourceKeys[i]; if (excluded.indexOf(key) >= 0) continue; target[key] = source[key]; } return target; }
import { Position } from "./util/location.js";
import { instantiate, ParseErrorCode } from "./parse-error/credentials.js";
function toParseErrorConstructor(_ref) {
  let {
      toMessage
    } = _ref,
    properties = _objectWithoutPropertiesLoose(_ref, _excluded);
  return function constructor({
    loc,
    details
  }) {
    return instantiate(SyntaxError, Object.assign({}, properties, {
      loc
    }), {
      clone(overrides = {}) {
        const loc = overrides.loc || {};
        return constructor({
          loc: new Position("line" in loc ? loc.line : this.loc.line, "column" in loc ? loc.column : this.loc.column, "index" in loc ? loc.index : this.loc.index),
          details: Object.assign({}, this.details, overrides.details)
        });
      },
      details: {
        value: details,
        enumerable: false
      },
      message: {
        get() {
          return `${toMessage(this.details)} (${this.loc.line}:${this.loc.column})`;
        },
        set(value) {
          Object.defineProperty(this, "message", {
            value
          });
        }
      },
      pos: {
        reflect: "loc.index",
        enumerable: true
      },
      missingPlugin: "missingPlugin" in details && {
        reflect: "details.missingPlugin",
        enumerable: true
      }
    });
  };
}
export function ParseErrorEnum(argument, syntaxPlugin) {
  if (Array.isArray(argument)) {
    return parseErrorTemplates => ParseErrorEnum(parseErrorTemplates, argument[0]);
  }
  const ParseErrorConstructors = {};
  for (const reasonCode of Object.keys(argument)) {
    const template = argument[reasonCode];
    const _ref2 = typeof template === "string" ? {
        message: () => template
      } : typeof template === "function" ? {
        message: template
      } : template,
      {
        message
      } = _ref2,
      rest = _objectWithoutPropertiesLoose(_ref2, _excluded2);
    const toMessage = typeof message === "string" ? () => message : message;
    ParseErrorConstructors[reasonCode] = toParseErrorConstructor(Object.assign({
      code: ParseErrorCode.SyntaxError,
      reasonCode,
      toMessage
    }, syntaxPlugin ? {
      syntaxPlugin
    } : {}, rest));
  }
  return ParseErrorConstructors;
}
import ModuleErrors from "./parse-error/module-errors.js";
import StandardErrors from "./parse-error/standard-errors.js";
import StrictModeErrors from "./parse-error/strict-mode-errors.js";
import PipelineOperatorErrors from "./parse-error/pipeline-operator-errors.js";
export const Errors = Object.assign({}, ParseErrorEnum(ModuleErrors), ParseErrorEnum(StandardErrors), ParseErrorEnum(StrictModeErrors), ParseErrorEnum`pipelineOperator`(PipelineOperatorErrors));
export * from "./parse-error/credentials.js";