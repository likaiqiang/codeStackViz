import { injectVirtualStackFrame, expectedError } from "./rewrite-stack-trace.js";
export default class ConfigError extends Error {
  constructor(message, filename) {
    super(message);
    expectedError(this);
    if (filename) injectVirtualStackFrame(this, filename);
  }
}