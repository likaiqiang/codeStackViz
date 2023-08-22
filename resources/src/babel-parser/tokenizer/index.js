const _excluded = ["at"],
  _excluded2 = ["at"];
function _objectWithoutPropertiesLoose(source, excluded) { if (source == null) return {}; var target = {}; var sourceKeys = Object.keys(source); var key, i; for (i = 0; i < sourceKeys.length; i++) { key = sourceKeys[i]; if (excluded.indexOf(key) >= 0) continue; target[key] = source[key]; } return target; }
import { Position, SourceLocation, createPositionWithColumnOffset } from "../util/location.js";
import CommentsParser from "../parser/comments.js";
import { isIdentifierStart, isIdentifierChar } from "../util/identifier.js";
import { tokenIsKeyword, tokenLabelName, tt, keywords as keywordTypes } from "./types.js";
import { Errors } from "../parse-error.js";
import { lineBreakG, isNewLine, isWhitespace, skipWhiteSpace, skipWhiteSpaceInLine } from "../util/whitespace.js";
import State from "./state.js";
import { readInt, readCodePoint, readStringContents } from "@babel/helper-string-parser";
function buildPosition(pos, lineStart, curLine) {
  return new Position(curLine, pos - lineStart, pos);
}
const VALID_REGEX_FLAGS = new Set([103, 109, 115, 105, 121, 117, 100, 118]);
export class Token {
  constructor(state) {
    this.type = state.type;
    this.value = state.value;
    this.start = state.start;
    this.end = state.end;
    this.loc = new SourceLocation(state.startLoc, state.endLoc);
  }
}
export default class Tokenizer extends CommentsParser {
  isLookahead;
  tokens = [];
  constructor(options, input) {
    super();
    this.state = new State();
    this.state.init(options);
    this.input = input;
    this.length = input.length;
    this.isLookahead = false;
  }
  pushToken(token) {
    this.tokens.length = this.state.tokensLength;
    this.tokens.push(token);
    ++this.state.tokensLength;
  }
  next() {
    this.checkKeywordEscapes(); //检查关键字里的转义字符？暂时跳过
    if (this.options.tokens) {
      this.pushToken(new Token(this.state));
    }
    this.state.lastTokStart = this.state.start;
    this.state.lastTokEndLoc = this.state.endLoc;
    this.state.lastTokStartLoc = this.state.startLoc;
    this.nextToken();
  }
  eat(type) {
    if (this.match(type)) {
      this.next();
      return true;
    } else {
      return false;
    }
  }
  match(type) {
    return this.state.type === type;
  }
  createLookaheadState(state) {
    return {
      pos: state.pos,
      value: null,
      type: state.type,
      start: state.start,
      end: state.end,
      context: [this.curContext()],
      inType: state.inType,
      startLoc: state.startLoc,
      lastTokEndLoc: state.lastTokEndLoc,
      curLine: state.curLine,
      lineStart: state.lineStart,
      curPosition: state.curPosition
    };
  }
  lookahead() {
    const old = this.state;
    this.state = this.createLookaheadState(old);
    this.isLookahead = true;
    this.nextToken();
    this.isLookahead = false;
    const curr = this.state;
    this.state = old;
    return curr;
  }
  nextTokenStart() {
    return this.nextTokenStartSince(this.state.pos);
  }
  nextTokenStartSince(pos) {
    skipWhiteSpace.lastIndex = pos;
    return skipWhiteSpace.test(this.input) ? skipWhiteSpace.lastIndex : pos;
  }
  lookaheadCharCode() {
    return this.input.charCodeAt(this.nextTokenStart());
  }
  nextTokenInLineStart() {
    return this.nextTokenInLineStartSince(this.state.pos);
  }
  nextTokenInLineStartSince(pos) {
    skipWhiteSpaceInLine.lastIndex = pos;
    return skipWhiteSpaceInLine.test(this.input) ? skipWhiteSpaceInLine.lastIndex : pos;
  }
  lookaheadInLineCharCode() {
    return this.input.charCodeAt(this.nextTokenInLineStart());
  }
  codePointAtPos(pos) {
    let cp = this.input.charCodeAt(pos);
    if ((cp & 0xfc00) === 0xd800 && ++pos < this.input.length) {
      const trail = this.input.charCodeAt(pos);
      if ((trail & 0xfc00) === 0xdc00) {
        cp = 0x10000 + ((cp & 0x3ff) << 10) + (trail & 0x3ff);
      }
    }
    return cp;
  }
  setStrict(strict) {
    this.state.strict = strict;
    if (strict) {
      this.state.strictErrors.forEach(([toParseError, at]) => this.raise(toParseError, {
        at
      }));
      this.state.strictErrors.clear();
    }
  }
  curContext() {
    return this.state.context[this.state.context.length - 1];
  }
  nextToken() {
    this.skipSpace();
    this.state.start = this.state.pos;

    //这里的isLookahead存疑，暂时不知道什么意思
    if (!this.isLookahead) this.state.startLoc = this.state.curPosition();
    if (this.state.pos >= this.length) {
      this.finishToken(137);
      return;
    }
    this.getTokenFromCode(this.codePointAtPos(this.state.pos));
  }
  skipBlockComment(commentEnd) {
    let startLoc;
    if (!this.isLookahead) startLoc = this.state.curPosition();
    const start = this.state.pos;
    const end = this.input.indexOf(commentEnd, start + 2);
    if (end === -1) {
      throw this.raise(Errors.UnterminatedComment, {
        at: this.state.curPosition()
      });
    }
    this.state.pos = end + commentEnd.length;
    lineBreakG.lastIndex = start + 2;
    while (lineBreakG.test(this.input) && lineBreakG.lastIndex <= end) {
      ++this.state.curLine;
      this.state.lineStart = lineBreakG.lastIndex;
    }
    if (this.isLookahead) return;
    const comment = {
      type: "CommentBlock",
      value: this.input.slice(start + 2, end),
      start,
      end: end + commentEnd.length,
      loc: new SourceLocation(startLoc, this.state.curPosition())
    };
    if (this.options.tokens) this.pushToken(comment);
    return comment;
  }
  skipLineComment(startSkip) {
    const start = this.state.pos;
    let startLoc;
    if (!this.isLookahead) startLoc = this.state.curPosition();
    let ch = this.input.charCodeAt(this.state.pos += startSkip);
    if (this.state.pos < this.length) {
      while (!isNewLine(ch) && ++this.state.pos < this.length) {
        ch = this.input.charCodeAt(this.state.pos);
      }
    }
    if (this.isLookahead) return;
    const end = this.state.pos;
    const value = this.input.slice(start + startSkip, end);
    const comment = {
      type: "CommentLine",
      value,
      start,
      end,
      loc: new SourceLocation(startLoc, this.state.curPosition())
    };
    if (this.options.tokens) this.pushToken(comment);
    return comment;
  }
  skipSpace() {
    const spaceStart = this.state.pos;
    const comments = [];
    loop: while (this.state.pos < this.length) {
      const ch = this.input.charCodeAt(this.state.pos);
      switch (ch) {
        case 32:
        case 160:
        case 9:
          ++this.state.pos;
          break;
        case 13:
          if (this.input.charCodeAt(this.state.pos + 1) === 10) {
            ++this.state.pos;
          }
        case 10:
        case 8232:
        case 8233:
          ++this.state.pos;
          ++this.state.curLine;
          this.state.lineStart = this.state.pos;
          break;
        case 47:
          switch (this.input.charCodeAt(this.state.pos + 1)) {
            case 42:
              {
                const comment = this.skipBlockComment("*/");
                if (comment !== undefined) {
                  this.addComment(comment);
                  if (this.options.attachComment) comments.push(comment);
                }
                break;
              }
            case 47:
              {
                const comment = this.skipLineComment(2);
                if (comment !== undefined) {
                  this.addComment(comment);
                  if (this.options.attachComment) comments.push(comment);
                }
                break;
              }
            default:
              break loop;
          }
          break;
        default:
          if (isWhitespace(ch)) {
            ++this.state.pos;
          } else if (ch === 45 && !this.inModule && this.options.annexB) {
            //也就是说只有在annexB为true的情况下，babel才会解析js里面的注释。而当inModule为true时，js代码里面不允许使用html注释，所以inModule必须为false，而ch===45这个是个flag，用来判断是不是html注释。
            //这里只判断了连字符，是因为这是一个快速的预判断，而不是最终的断定。如果当前字符是连字符，那么就有可能是HTML注释的开始，就需要进一步判断。如果当前字符不是连字符，那么就肯定不是HTML注释的开始，就不需要进一步判断。所以这里只判断了连字符，是为了提高解析的效率，而不是为了确定是不是HTML注释。真正确定是不是HTML注释的方法，是在readToken_htmlComment方法中实现的。
            const pos = this.state.pos;
            if (this.input.charCodeAt(pos + 1) === 45 && this.input.charCodeAt(pos + 2) === 62 && (spaceStart === 0 || this.state.lineStart > spaceStart)) {
              const comment = this.skipLineComment(3);
              if (comment !== undefined) {
                this.addComment(comment);
                if (this.options.attachComment) comments.push(comment);
              }
            } else {
              break loop;
            }
          } else if (ch === 60 && !this.inModule && this.options.annexB) {
            const pos = this.state.pos;
            if (this.input.charCodeAt(pos + 1) === 33 && this.input.charCodeAt(pos + 2) === 45 && this.input.charCodeAt(pos + 3) === 45) {
              const comment = this.skipLineComment(4);
              if (comment !== undefined) {
                this.addComment(comment);
                if (this.options.attachComment) comments.push(comment);
              }
            } else {
              break loop;
            }
          } else {
            break loop;
          }
      }
    }
    if (comments.length > 0) {
      const end = this.state.pos;
      const commentWhitespace = {
        start: spaceStart,
        end,
        comments,
        leadingNode: null,
        trailingNode: null,
        containingNode: null
      };
      this.state.commentStack.push(commentWhitespace);
    }
  }
  finishToken(type, val) {
    this.state.end = this.state.pos;
    this.state.endLoc = this.state.curPosition();
    const prevType = this.state.type;
    this.state.type = type;
    // 这里的type是什么意思，这个type默认为137
    // 这个type知道什么意思了，类似索引，详细需要查看types.js
    this.state.value = val;
    if (!this.isLookahead) {
      this.updateContext(prevType); // updateContext在这里是个空函数，但是如果有plugin这个函数就有意义了
    }
  }
  replaceToken(type) {
    this.state.type = type;
    this.updateContext();
  }
  readToken_numberSign() {
    if (this.state.pos === 0 && this.readToken_interpreter()) {
      return;
    }
    const nextPos = this.state.pos + 1;
    const next = this.codePointAtPos(nextPos);
    if (next >= 48 && next <= 57) {
      throw this.raise(Errors.UnexpectedDigitAfterHash, {
        at: this.state.curPosition()
      });
    }
    if (next === 123 || next === 91 && this.hasPlugin("recordAndTuple")) {
      this.expectPlugin("recordAndTuple");
      if (this.getPluginOption("recordAndTuple", "syntaxType") === "bar") {
        throw this.raise(next === 123 ? Errors.RecordExpressionHashIncorrectStartSyntaxType : Errors.TupleExpressionHashIncorrectStartSyntaxType, {
          at: this.state.curPosition()
        });
      }
      this.state.pos += 2;
      if (next === 123) {
        this.finishToken(7);
      } else {
        this.finishToken(1);
      }
    } else if (isIdentifierStart(next)) {
      ++this.state.pos;
      this.finishToken(136, this.readWord1(next));
    } else if (next === 92) {
      ++this.state.pos;
      this.finishToken(136, this.readWord1());
    } else {
      this.finishOp(27, 1);
    }
  }
  readToken_dot() {
    const next = this.input.charCodeAt(this.state.pos + 1);
    if (next >= 48 && next <= 57) {
      this.readNumber(true);
      return;
    }
    if (next === 46 && this.input.charCodeAt(this.state.pos + 2) === 46) {
      this.state.pos += 3;
      this.finishToken(21);
    } else {
      ++this.state.pos;
      this.finishToken(16);
    }
  }
  readToken_slash() {
    const next = this.input.charCodeAt(this.state.pos + 1);
    if (next === 61) {
      this.finishOp(31, 2);
    } else {
      this.finishOp(56, 1);
    }
  }
  readToken_interpreter() {
    if (this.state.pos !== 0 || this.length < 2) return false;
    let ch = this.input.charCodeAt(this.state.pos + 1);
    if (ch !== 33) return false;
    const start = this.state.pos;
    this.state.pos += 1;
    while (!isNewLine(ch) && ++this.state.pos < this.length) {
      ch = this.input.charCodeAt(this.state.pos);
    }
    const value = this.input.slice(start + 2, this.state.pos);
    this.finishToken(28, value);
    return true;
  }
  readToken_mult_modulo(code) {
    let type = code === 42 ? 55 : 54;
    let width = 1;
    let next = this.input.charCodeAt(this.state.pos + 1);
    if (code === 42 && next === 42) {
      width++;
      next = this.input.charCodeAt(this.state.pos + 2);
      type = 57;
    }
    if (next === 61 && !this.state.inType) {
      width++;
      type = code === 37 ? 33 : 30;
    }
    this.finishOp(type, width);
  }
  readToken_pipe_amp(code) {
    const next = this.input.charCodeAt(this.state.pos + 1);
    if (next === code) {
      if (this.input.charCodeAt(this.state.pos + 2) === 61) {
        this.finishOp(30, 3);
      } else {
        this.finishOp(code === 124 ? 41 : 42, 2);
      }
      return;
    }
    if (code === 124) {
      if (next === 62) {
        this.finishOp(39, 2);
        return;
      }
      if (this.hasPlugin("recordAndTuple") && next === 125) {
        if (this.getPluginOption("recordAndTuple", "syntaxType") !== "bar") {
          throw this.raise(Errors.RecordExpressionBarIncorrectEndSyntaxType, {
            at: this.state.curPosition()
          });
        }
        this.state.pos += 2;
        this.finishToken(9);
        return;
      }
      if (this.hasPlugin("recordAndTuple") && next === 93) {
        if (this.getPluginOption("recordAndTuple", "syntaxType") !== "bar") {
          throw this.raise(Errors.TupleExpressionBarIncorrectEndSyntaxType, {
            at: this.state.curPosition()
          });
        }
        this.state.pos += 2;
        this.finishToken(4);
        return;
      }
    }
    if (next === 61) {
      this.finishOp(30, 2);
      return;
    }
    this.finishOp(code === 124 ? 43 : 45, 1);
  }
  readToken_caret() {
    const next = this.input.charCodeAt(this.state.pos + 1);
    if (next === 61 && !this.state.inType) {
      this.finishOp(32, 2);
    } else if (next === 94 && this.hasPlugin(["pipelineOperator", {
      proposal: "hack",
      topicToken: "^^"
    }])) {
      this.finishOp(37, 2);
      const lookaheadCh = this.input.codePointAt(this.state.pos);
      if (lookaheadCh === 94) {
        this.unexpected();
      }
    } else {
      this.finishOp(44, 1);
    }
  }
  readToken_atSign() {
    const next = this.input.charCodeAt(this.state.pos + 1);
    if (next === 64 && this.hasPlugin(["pipelineOperator", {
      proposal: "hack",
      topicToken: "@@"
    }])) {
      this.finishOp(38, 2);
    } else {
      this.finishOp(26, 1);
    }
  }
  readToken_plus_min(code) {
    const next = this.input.charCodeAt(this.state.pos + 1);
    if (next === code) {
      this.finishOp(34, 2);
      return;
    }
    if (next === 61) {
      this.finishOp(30, 2);
    } else {
      this.finishOp(53, 1);
    }
  }
  readToken_lt() {
    const {
      pos
    } = this.state;
    const next = this.input.charCodeAt(pos + 1);
    if (next === 60) {
      if (this.input.charCodeAt(pos + 2) === 61) {
        this.finishOp(30, 3);
        return;
      }
      this.finishOp(51, 2);
      return;
    }
    if (next === 61) {
      this.finishOp(49, 2);
      return;
    }
    this.finishOp(47, 1);
  }
  readToken_gt() {
    const {
      pos
    } = this.state;
    const next = this.input.charCodeAt(pos + 1);
    if (next === 62) {
      const size = this.input.charCodeAt(pos + 2) === 62 ? 3 : 2;
      if (this.input.charCodeAt(pos + size) === 61) {
        this.finishOp(30, size + 1);
        return;
      }
      this.finishOp(52, size);
      return;
    }
    if (next === 61) {
      this.finishOp(49, 2);
      return;
    }
    this.finishOp(48, 1);
  }
  readToken_eq_excl(code) {
    const next = this.input.charCodeAt(this.state.pos + 1);
    if (next === 61) {
      this.finishOp(46, this.input.charCodeAt(this.state.pos + 2) === 61 ? 3 : 2);
      return;
    }
    if (code === 61 && next === 62) {
      this.state.pos += 2;
      this.finishToken(19);
      return;
    }
    this.finishOp(code === 61 ? 29 : 35, 1);
  }
  readToken_question() {
    const next = this.input.charCodeAt(this.state.pos + 1);
    const next2 = this.input.charCodeAt(this.state.pos + 2);
    if (next === 63) {
      if (next2 === 61) {
        this.finishOp(30, 3);
      } else {
        this.finishOp(40, 2);
      }
    } else if (next === 46 && !(next2 >= 48 && next2 <= 57)) {
      this.state.pos += 2;
      this.finishToken(18);
    } else {
      ++this.state.pos;
      this.finishToken(17);
    }
  }
  getTokenFromCode(code) {
    switch (code) {
      case 46:
        this.readToken_dot();
        return;
      case 40:
        ++this.state.pos;
        this.finishToken(10);
        return;
      case 41:
        ++this.state.pos;
        this.finishToken(11);
        return;
      case 59:
        ++this.state.pos;
        this.finishToken(13);
        return;
      case 44:
        ++this.state.pos;
        this.finishToken(12);
        return;
      case 91:
        if (this.hasPlugin("recordAndTuple") && this.input.charCodeAt(this.state.pos + 1) === 124) {
          if (this.getPluginOption("recordAndTuple", "syntaxType") !== "bar") {
            throw this.raise(Errors.TupleExpressionBarIncorrectStartSyntaxType, {
              at: this.state.curPosition()
            });
          }
          this.state.pos += 2;
          this.finishToken(2);
        } else {
          ++this.state.pos;
          this.finishToken(0);
        }
        return;
      case 93:
        ++this.state.pos;
        this.finishToken(3);
        return;
      case 123:
        if (this.hasPlugin("recordAndTuple") && this.input.charCodeAt(this.state.pos + 1) === 124) {
          if (this.getPluginOption("recordAndTuple", "syntaxType") !== "bar") {
            throw this.raise(Errors.RecordExpressionBarIncorrectStartSyntaxType, {
              at: this.state.curPosition()
            });
          }
          this.state.pos += 2;
          this.finishToken(6);
        } else {
          ++this.state.pos;
          this.finishToken(5);
        }
        return;
      case 125:
        ++this.state.pos;
        this.finishToken(8);
        return;
      case 58:
        if (this.hasPlugin("functionBind") && this.input.charCodeAt(this.state.pos + 1) === 58) {
          this.finishOp(15, 2);
        } else {
          ++this.state.pos;
          this.finishToken(14);
        }
        return;
      case 63:
        this.readToken_question();
        return;
      case 96:
        this.readTemplateToken();
        return;
      case 48:
        {
          const next = this.input.charCodeAt(this.state.pos + 1);
          if (next === 120 || next === 88) {
            this.readRadixNumber(16);
            return;
          }
          if (next === 111 || next === 79) {
            this.readRadixNumber(8);
            return;
          }
          if (next === 98 || next === 66) {
            this.readRadixNumber(2);
            return;
          }
        }
      case 49:
      case 50:
      case 51:
      case 52:
      case 53:
      case 54:
      case 55:
      case 56:
      case 57:
        this.readNumber(false);
        return;
      case 34:
      case 39:
        this.readString(code);
        return;
      case 47:
        this.readToken_slash();
        return;
      case 37:
      case 42:
        this.readToken_mult_modulo(code);
        return;
      case 124:
      case 38:
        this.readToken_pipe_amp(code);
        return;
      case 94:
        this.readToken_caret();
        return;
      case 43:
      case 45:
        this.readToken_plus_min(code);
        return;
      case 60:
        this.readToken_lt();
        return;
      case 62:
        this.readToken_gt();
        return;
      case 61:
      case 33:
        this.readToken_eq_excl(code);
        return;
      case 126:
        this.finishOp(36, 1);
        return;
      case 64:
        this.readToken_atSign();
        return;
      case 35:
        this.readToken_numberSign();
        return;
      case 92:
        this.readWord();
        return;
      default:
        if (isIdentifierStart(code)) {
          this.readWord(code);
          return;
        }
    }
    throw this.raise(Errors.InvalidOrUnexpectedToken, {
      at: this.state.curPosition(),
      unexpected: String.fromCodePoint(code)
    });
  }
  finishOp(type, size) {
    const str = this.input.slice(this.state.pos, this.state.pos + size);
    this.state.pos += size;
    this.finishToken(type, str);
  }
  readRegexp() {
    const startLoc = this.state.startLoc;
    const start = this.state.start + 1;
    let escaped, inClass;
    let {
      pos
    } = this.state;
    for (;; ++pos) {
      if (pos >= this.length) {
        throw this.raise(Errors.UnterminatedRegExp, {
          at: createPositionWithColumnOffset(startLoc, 1)
        });
      }
      const ch = this.input.charCodeAt(pos);
      if (isNewLine(ch)) {
        throw this.raise(Errors.UnterminatedRegExp, {
          at: createPositionWithColumnOffset(startLoc, 1)
        });
      }
      if (escaped) {
        escaped = false;
      } else {
        if (ch === 91) {
          inClass = true;
        } else if (ch === 93 && inClass) {
          inClass = false;
        } else if (ch === 47 && !inClass) {
          break;
        }
        escaped = ch === 92;
      }
    }
    const content = this.input.slice(start, pos);
    ++pos;
    let mods = "";
    const nextPos = () => createPositionWithColumnOffset(startLoc, pos + 2 - start);
    while (pos < this.length) {
      const cp = this.codePointAtPos(pos);
      const char = String.fromCharCode(cp);
      if (VALID_REGEX_FLAGS.has(cp)) {
        if (cp === 118) {
          if (mods.includes("u")) {
            this.raise(Errors.IncompatibleRegExpUVFlags, {
              at: nextPos()
            });
          }
        } else if (cp === 117) {
          if (mods.includes("v")) {
            this.raise(Errors.IncompatibleRegExpUVFlags, {
              at: nextPos()
            });
          }
        }
        if (mods.includes(char)) {
          this.raise(Errors.DuplicateRegExpFlags, {
            at: nextPos()
          });
        }
      } else if (isIdentifierChar(cp) || cp === 92) {
        this.raise(Errors.MalformedRegExpFlags, {
          at: nextPos()
        });
      } else {
        break;
      }
      ++pos;
      mods += char;
    }
    this.state.pos = pos;
    this.finishToken(135, {
      pattern: content,
      flags: mods
    });
  }
  readInt(radix, len, forceLen = false, allowNumSeparator = true) {
    const {
      n,
      pos
    } = readInt(this.input, this.state.pos, this.state.lineStart, this.state.curLine, radix, len, forceLen, allowNumSeparator, this.errorHandlers_readInt, false);
    this.state.pos = pos;
    return n;
  }
  readRadixNumber(radix) {
    const startLoc = this.state.curPosition();
    let isBigInt = false;
    this.state.pos += 2;
    const val = this.readInt(radix);
    if (val == null) {
      this.raise(Errors.InvalidDigit, {
        at: createPositionWithColumnOffset(startLoc, 2),
        radix
      });
    }
    const next = this.input.charCodeAt(this.state.pos);
    if (next === 110) {
      ++this.state.pos;
      isBigInt = true;
    } else if (next === 109) {
      throw this.raise(Errors.InvalidDecimal, {
        at: startLoc
      });
    }
    if (isIdentifierStart(this.codePointAtPos(this.state.pos))) {
      throw this.raise(Errors.NumberIdentifier, {
        at: this.state.curPosition()
      });
    }
    if (isBigInt) {
      const str = this.input.slice(startLoc.index, this.state.pos).replace(/[_n]/g, "");
      this.finishToken(133, str);
      return;
    }
    this.finishToken(132, val);
  }
  readNumber(startsWithDot) {
    const start = this.state.pos;
    const startLoc = this.state.curPosition();
    let isFloat = false;
    let isBigInt = false;
    let isDecimal = false;
    let hasExponent = false;
    let isOctal = false;
    if (!startsWithDot && this.readInt(10) === null) {
      this.raise(Errors.InvalidNumber, {
        at: this.state.curPosition()
      });
    }
    const hasLeadingZero = this.state.pos - start >= 2 && this.input.charCodeAt(start) === 48;
    if (hasLeadingZero) {
      const integer = this.input.slice(start, this.state.pos);
      this.recordStrictModeErrors(Errors.StrictOctalLiteral, {
        at: startLoc
      });
      if (!this.state.strict) {
        const underscorePos = integer.indexOf("_");
        if (underscorePos > 0) {
          this.raise(Errors.ZeroDigitNumericSeparator, {
            at: createPositionWithColumnOffset(startLoc, underscorePos)
          });
        }
      }
      isOctal = hasLeadingZero && !/[89]/.test(integer);
    }
    let next = this.input.charCodeAt(this.state.pos);
    if (next === 46 && !isOctal) {
      ++this.state.pos;
      this.readInt(10);
      isFloat = true;
      next = this.input.charCodeAt(this.state.pos);
    }
    if ((next === 69 || next === 101) && !isOctal) {
      next = this.input.charCodeAt(++this.state.pos);
      if (next === 43 || next === 45) {
        ++this.state.pos;
      }
      if (this.readInt(10) === null) {
        this.raise(Errors.InvalidOrMissingExponent, {
          at: startLoc
        });
      }
      isFloat = true;
      hasExponent = true;
      next = this.input.charCodeAt(this.state.pos);
    }
    if (next === 110) {
      if (isFloat || hasLeadingZero) {
        this.raise(Errors.InvalidBigIntLiteral, {
          at: startLoc
        });
      }
      ++this.state.pos;
      isBigInt = true;
    }
    if (next === 109) {
      this.expectPlugin("decimal", this.state.curPosition());
      if (hasExponent || hasLeadingZero) {
        this.raise(Errors.InvalidDecimal, {
          at: startLoc
        });
      }
      ++this.state.pos;
      isDecimal = true;
    }
    if (isIdentifierStart(this.codePointAtPos(this.state.pos))) {
      throw this.raise(Errors.NumberIdentifier, {
        at: this.state.curPosition()
      });
    }
    const str = this.input.slice(start, this.state.pos).replace(/[_mn]/g, "");
    if (isBigInt) {
      this.finishToken(133, str);
      return;
    }
    if (isDecimal) {
      this.finishToken(134, str);
      return;
    }
    const val = isOctal ? parseInt(str, 8) : parseFloat(str);
    this.finishToken(132, val);
  }
  readCodePoint(throwOnInvalid) {
    const {
      code,
      pos
    } = readCodePoint(this.input, this.state.pos, this.state.lineStart, this.state.curLine, throwOnInvalid, this.errorHandlers_readCodePoint);
    this.state.pos = pos;
    return code;
  }
  readString(quote) {
    const {
      str,
      pos,
      curLine,
      lineStart
    } = readStringContents(quote === 34 ? "double" : "single", this.input, this.state.pos + 1, this.state.lineStart, this.state.curLine, this.errorHandlers_readStringContents_string);
    this.state.pos = pos + 1;
    this.state.lineStart = lineStart;
    this.state.curLine = curLine;
    this.finishToken(131, str);
  }
  readTemplateContinuation() {
    if (!this.match(8)) {
      this.unexpected(null, 8);
    }
    this.state.pos--;
    this.readTemplateToken();
  }
  readTemplateToken() {
    const opening = this.input[this.state.pos];
    const {
      str,
      firstInvalidLoc,
      pos,
      curLine,
      lineStart
    } = readStringContents("template", this.input, this.state.pos + 1, this.state.lineStart, this.state.curLine, this.errorHandlers_readStringContents_template);
    this.state.pos = pos + 1;
    this.state.lineStart = lineStart;
    this.state.curLine = curLine;
    if (firstInvalidLoc) {
      this.state.firstInvalidTemplateEscapePos = new Position(firstInvalidLoc.curLine, firstInvalidLoc.pos - firstInvalidLoc.lineStart, firstInvalidLoc.pos);
    }
    if (this.input.codePointAt(pos) === 96) {
      this.finishToken(24, firstInvalidLoc ? null : opening + str + "`");
    } else {
      this.state.pos++;
      this.finishToken(25, firstInvalidLoc ? null : opening + str + "${");
    }
  }
  recordStrictModeErrors(toParseError, {
    at
  }) {
    const index = at.index;
    if (this.state.strict && !this.state.strictErrors.has(index)) {
      this.raise(toParseError, {
        at
      });
    } else {
      this.state.strictErrors.set(index, [toParseError, at]);
    }
  }
  readWord1(firstCode) {
    this.state.containsEsc = false;
    let word = "";
    const start = this.state.pos;
    let chunkStart = this.state.pos;
    if (firstCode !== undefined) {
      this.state.pos += firstCode <= 0xffff ? 1 : 2;
      // 0xffff即65535，表示一个utf16编码能表示的最大字符，如果超过65535，firstCode就需要两个utf16字符表示
    }
    while (this.state.pos < this.length) {
      const ch = this.codePointAtPos(this.state.pos);
      if (isIdentifierChar(ch)) {
        this.state.pos += ch <= 0xffff ? 1 : 2;
      } else if (ch === 92) {
        this.state.containsEsc = true;
        word += this.input.slice(chunkStart, this.state.pos);
        const escStart = this.state.curPosition();
        const identifierCheck = this.state.pos === start ? isIdentifierStart : isIdentifierChar;
        if (this.input.charCodeAt(++this.state.pos) !== 117) {
          this.raise(Errors.MissingUnicodeEscape, {
            at: this.state.curPosition()
          });
          chunkStart = this.state.pos - 1;
          continue;
        }
        ++this.state.pos;
        const esc = this.readCodePoint(true);
        if (esc !== null) {
          if (!identifierCheck(esc)) {
            this.raise(Errors.EscapedCharNotAnIdentifier, {
              at: escStart
            });
          }
          word += String.fromCodePoint(esc);
        }
        chunkStart = this.state.pos;
      } else {
        break;
      }
    }
    return word + this.input.slice(chunkStart, this.state.pos);
  }
  readWord(firstCode) {
    const word = this.readWord1(firstCode);
    // 这里存疑，keywordTypes是什么时候被塞满的
    // 这个疑问已经解决了
    const type = keywordTypes.get(word);
    if (type !== undefined) {
      this.finishToken(type, tokenLabelName(type));
    } else {
      this.finishToken(130, word);
      // this.finishToken(tt.name, word);
      // 130也就是tt.name，如果type不是关键字便是标识符
    }
  }
  checkKeywordEscapes() {
    const {
      type
    } = this.state;
    if (tokenIsKeyword(type) && this.state.containsEsc) {
      this.raise(Errors.InvalidEscapedReservedWord, {
        at: this.state.startLoc,
        reservedWord: tokenLabelName(type)
      });
    }
  }
  raise(toParseError, raiseProperties) {
    const {
        at
      } = raiseProperties,
      details = _objectWithoutPropertiesLoose(raiseProperties, _excluded);
    const loc = at instanceof Position ? at : at.loc.start;
    const error = toParseError({
      loc,
      details
    });
    if (!this.options.errorRecovery) throw error;
    if (!this.isLookahead) this.state.errors.push(error);
    return error;
  }
  raiseOverwrite(toParseError, raiseProperties) {
    const {
        at
      } = raiseProperties,
      details = _objectWithoutPropertiesLoose(raiseProperties, _excluded2);
    const loc = at instanceof Position ? at : at.loc.start;
    const pos = loc.index;
    const errors = this.state.errors;
    for (let i = errors.length - 1; i >= 0; i--) {
      const error = errors[i];
      if (error.loc.index === pos) {
        return errors[i] = toParseError({
          loc,
          details
        });
      }
      if (error.loc.index < pos) break;
    }
    return this.raise(toParseError, raiseProperties);
  }
  updateContext(prevType) {}
  unexpected(loc, type) {
    throw this.raise(Errors.UnexpectedToken, {
      expected: type ? tokenLabelName(type) : null,
      at: loc != null ? loc : this.state.startLoc
    });
  }
  expectPlugin(pluginName, loc) {
    if (this.hasPlugin(pluginName)) {
      return true;
    }
    throw this.raise(Errors.MissingPlugin, {
      at: loc != null ? loc : this.state.startLoc,
      missingPlugin: [pluginName]
    });
  }
  expectOnePlugin(pluginNames) {
    if (!pluginNames.some(name => this.hasPlugin(name))) {
      throw this.raise(Errors.MissingOneOfPlugins, {
        at: this.state.startLoc,
        missingPlugin: pluginNames
      });
    }
  }
  errorBuilder(error) {
    return (pos, lineStart, curLine) => {
      this.raise(error, {
        at: buildPosition(pos, lineStart, curLine)
      });
    };
  }
  errorHandlers_readInt = {
    invalidDigit: (pos, lineStart, curLine, radix) => {
      if (!this.options.errorRecovery) return false;
      this.raise(Errors.InvalidDigit, {
        at: buildPosition(pos, lineStart, curLine),
        radix
      });
      return true;
    },
    numericSeparatorInEscapeSequence: this.errorBuilder(Errors.NumericSeparatorInEscapeSequence),
    unexpectedNumericSeparator: this.errorBuilder(Errors.UnexpectedNumericSeparator)
  };
  errorHandlers_readCodePoint = Object.assign({}, this.errorHandlers_readInt, {
    invalidEscapeSequence: this.errorBuilder(Errors.InvalidEscapeSequence),
    invalidCodePoint: this.errorBuilder(Errors.InvalidCodePoint)
  });
  errorHandlers_readStringContents_string = Object.assign({}, this.errorHandlers_readCodePoint, {
    strictNumericEscape: (pos, lineStart, curLine) => {
      this.recordStrictModeErrors(Errors.StrictNumericEscape, {
        at: buildPosition(pos, lineStart, curLine)
      });
    },
    unterminated: (pos, lineStart, curLine) => {
      throw this.raise(Errors.UnterminatedString, {
        at: buildPosition(pos - 1, lineStart, curLine)
      });
    }
  });
  errorHandlers_readStringContents_template = Object.assign({}, this.errorHandlers_readCodePoint, {
    strictNumericEscape: this.errorBuilder(Errors.StrictNumericEscape),
    unterminated: (pos, lineStart, curLine) => {
      throw this.raise(Errors.UnterminatedTemplate, {
        at: buildPosition(pos, lineStart, curLine)
      });
    }
  });
}
