import { Position } from "../util/location.js";
import { types as ct } from "./context.js";
import { tt } from "./types.js";
export default class State {
  strict;
  curLine;
  lineStart;
  startLoc;
  endLoc;
  init({
    strictMode,
    sourceType,
    startLine,
    startColumn
  }) {
    this.strict = strictMode === false ? false : strictMode === true ? true : sourceType === "module";
    this.curLine = startLine;
    this.lineStart = -startColumn;
    this.startLoc = this.endLoc = new Position(startLine, startColumn, 0);
  }
  errors = [];
  potentialArrowAt = -1;
  noArrowAt = [];
  noArrowParamsConversionAt = [];
  maybeInArrowParameters = false;
  inType = false;
  noAnonFunctionType = false;
  hasFlowComment = false;
  isAmbientContext = false;
  inAbstractClass = false;
  inDisallowConditionalTypesContext = false;
  topicContext = {
    maxNumOfResolvableTopics: 0,
    maxTopicIndex: null
  };
  soloAwait = false;
  inFSharpPipelineDirectBody = false;
  labels = [];
  comments = [];
  commentStack = [];
  pos = 0;
  type = 137;
  value = null;
  start = 0;
  end = 0;
  lastTokEndLoc = null;
  lastTokStartLoc = null;
  lastTokStart = 0;
  context = [ct.brace];
  canStartJSXElement = true;
  containsEsc = false;
  firstInvalidTemplateEscapePos = null;
  strictErrors = new Map();
  tokensLength = 0;
  curPosition() {
    return new Position(this.curLine, this.pos - this.lineStart, this.pos);
  }
  clone(skipArrays) {
    const state = new State();
    const keys = Object.keys(this);
    for (let i = 0, length = keys.length; i < length; i++) {
      const key = keys[i];
      let val = this[key];
      if (!skipArrays && Array.isArray(val)) {
        val = val.slice();
      }
      state[key] = val;
    }
    return state;
  }
}