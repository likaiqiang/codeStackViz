export const PARAM = 0b0000,
  PARAM_YIELD = 0b0001,
  PARAM_AWAIT = 0b0010,
  PARAM_RETURN = 0b0100,
  PARAM_IN = 0b1000;
export default class ProductionParameterHandler {
  stacks = [];
  enter(flags) {
    this.stacks.push(flags);
  }
  exit() {
    this.stacks.pop();
  }
  currentFlags() {
    return this.stacks[this.stacks.length - 1];
  }
  get hasAwait() {
    return (this.currentFlags() & PARAM_AWAIT) > 0;
  }
  get hasYield() {
    return (this.currentFlags() & PARAM_YIELD) > 0;
  }
  get hasReturn() {
    return (this.currentFlags() & PARAM_RETURN) > 0;
  }
  get hasIn() {
    return (this.currentFlags() & PARAM_IN) > 0;
  }
}
export function functionFlags(isAsync, isGenerator) {
  return (isAsync ? PARAM_AWAIT : 0) | (isGenerator ? PARAM_YIELD : 0);
}