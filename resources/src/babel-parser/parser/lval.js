import { tt } from "../tokenizer/types.js";
import { isStrictBindOnlyReservedWord, isStrictBindReservedWord } from "../util/identifier.js";
import { NodeUtils } from "./node.js";
import { BIND_NONE, BIND_FLAGS_NO_LET_IN_LEXICAL } from "../util/scopeflags.js";
import { Errors } from "../parse-error.js";
const getOwn = (object, key) => Object.hasOwnProperty.call(object, key) && object[key];
const unwrapParenthesizedExpression = node => {
  return node.type === "ParenthesizedExpression" ? unwrapParenthesizedExpression(node.expression) : node;
};
export var ParseBindingListFlags = {
  ALLOW_EMPTY: 1,
  IS_FUNCTION_PARAMS: 2,
  IS_CONSTRUCTOR_PARAMS: 4
};
export default class LValParser extends NodeUtils {
  toAssignable(node, isLHS = false) {
    let parenthesized = undefined;
    if (node.type === "ParenthesizedExpression" || node.extra?.parenthesized) {
      parenthesized = unwrapParenthesizedExpression(node);
      if (isLHS) {
        if (parenthesized.type === "Identifier") {
          this.expressionScope.recordArrowParameterBindingError(Errors.InvalidParenthesizedAssignment, {
            at: node
          });
        } else if (parenthesized.type !== "MemberExpression") {
          this.raise(Errors.InvalidParenthesizedAssignment, {
            at: node
          });
        }
      } else {
        this.raise(Errors.InvalidParenthesizedAssignment, {
          at: node
        });
      }
    }
    switch (node.type) {
      case "Identifier":
      case "ObjectPattern":
      case "ArrayPattern":
      case "AssignmentPattern":
      case "RestElement":
        break;
      case "ObjectExpression":
        node.type = "ObjectPattern";
        for (let i = 0, length = node.properties.length, last = length - 1; i < length; i++) {
          const prop = node.properties[i];
          const isLast = i === last;
          this.toAssignableObjectExpressionProp(prop, isLast, isLHS);
          if (isLast && prop.type === "RestElement" && node.extra?.trailingCommaLoc) {
            this.raise(Errors.RestTrailingComma, {
              at: node.extra.trailingCommaLoc
            });
          }
        }
        break;
      case "ObjectProperty":
        {
          const {
            key,
            value
          } = node;
          if (this.isPrivateName(key)) {
            this.classScope.usePrivateName(this.getPrivateNameSV(key), key.loc.start);
          }
          this.toAssignable(value, isLHS);
          break;
        }
      case "SpreadElement":
        {
          throw new Error("Internal @babel/parser error (this is a bug, please report it)." + " SpreadElement should be converted by .toAssignable's caller.");
        }
      case "ArrayExpression":
        node.type = "ArrayPattern";
        this.toAssignableList(node.elements, node.extra?.trailingCommaLoc, isLHS);
        break;
      case "AssignmentExpression":
        if (node.operator !== "=") {
          this.raise(Errors.MissingEqInAssignment, {
            at: node.left.loc.end
          });
        }
        node.type = "AssignmentPattern";
        delete node.operator;
        this.toAssignable(node.left, isLHS);
        break;
      case "ParenthesizedExpression":
        this.toAssignable(parenthesized, isLHS);
        break;
      default:
    }
  }
  toAssignableObjectExpressionProp(prop, isLast, isLHS) {
    if (prop.type === "ObjectMethod") {
      this.raise(prop.kind === "get" || prop.kind === "set" ? Errors.PatternHasAccessor : Errors.PatternHasMethod, {
        at: prop.key
      });
    } else if (prop.type === "SpreadElement") {
      prop.type = "RestElement";
      const arg = prop.argument;
      this.checkToRestConversion(arg, false);
      this.toAssignable(arg, isLHS);
      if (!isLast) {
        this.raise(Errors.RestTrailingComma, {
          at: prop
        });
      }
    } else {
      this.toAssignable(prop, isLHS);
    }
  }
  toAssignableList(exprList, trailingCommaLoc, isLHS) {
    const end = exprList.length - 1;
    for (let i = 0; i <= end; i++) {
      const elt = exprList[i];
      if (!elt) continue;
      if (elt.type === "SpreadElement") {
        elt.type = "RestElement";
        const arg = elt.argument;
        this.checkToRestConversion(arg, true);
        this.toAssignable(arg, isLHS);
      } else {
        this.toAssignable(elt, isLHS);
      }
      if (elt.type === "RestElement") {
        if (i < end) {
          this.raise(Errors.RestTrailingComma, {
            at: elt
          });
        } else if (trailingCommaLoc) {
          this.raise(Errors.RestTrailingComma, {
            at: trailingCommaLoc
          });
        }
      }
    }
  }
  isAssignable(node, isBinding) {
    switch (node.type) {
      case "Identifier":
      case "ObjectPattern":
      case "ArrayPattern":
      case "AssignmentPattern":
      case "RestElement":
        return true;
      case "ObjectExpression":
        {
          const last = node.properties.length - 1;
          return node.properties.every((prop, i) => {
            return prop.type !== "ObjectMethod" && (i === last || prop.type !== "SpreadElement") && this.isAssignable(prop);
          });
        }
      case "ObjectProperty":
        return this.isAssignable(node.value);
      case "SpreadElement":
        return this.isAssignable(node.argument);
      case "ArrayExpression":
        return node.elements.every(element => element === null || this.isAssignable(element));
      case "AssignmentExpression":
        return node.operator === "=";
      case "ParenthesizedExpression":
        return this.isAssignable(node.expression);
      case "MemberExpression":
      case "OptionalMemberExpression":
        return !isBinding;
      default:
        return false;
    }
  }
  toReferencedList(exprList, isParenthesizedExpr) {
    return exprList;
  }
  toReferencedListDeep(exprList, isParenthesizedExpr) {
    this.toReferencedList(exprList, isParenthesizedExpr);
    for (const expr of exprList) {
      if (expr?.type === "ArrayExpression") {
        this.toReferencedListDeep(expr.elements);
      }
    }
  }
  parseSpread(refExpressionErrors) {
    const node = this.startNode();
    this.next();
    node.argument = this.parseMaybeAssignAllowIn(refExpressionErrors, undefined);
    return this.finishNode(node, "SpreadElement");
  }
  parseRestBinding() {
    const node = this.startNode();
    this.next();
    node.argument = this.parseBindingAtom();
    return this.finishNode(node, "RestElement");
  }
  parseBindingAtom() {
    switch (this.state.type) {
      case 0:
        {
          const node = this.startNode();
          this.next();
          node.elements = this.parseBindingList(3, 93, ParseBindingListFlags.ALLOW_EMPTY);
          return this.finishNode(node, "ArrayPattern");
        }
      case 5:
        return this.parseObjectLike(8, true);
    }
    return this.parseIdentifier();
  }
  parseBindingList(close, closeCharCode, flags) {
    const allowEmpty = flags & ParseBindingListFlags.ALLOW_EMPTY;
    const elts = [];
    let first = true;
    while (!this.eat(close)) {
      if (first) {
        first = false;
      } else {
        this.expect(12);
      }
      if (allowEmpty && this.match(12)) {
        elts.push(null);
      } else if (this.eat(close)) {
        break;
      } else if (this.match(21)) {
        elts.push(this.parseAssignableListItemTypes(this.parseRestBinding(), flags));
        if (!this.checkCommaAfterRest(closeCharCode)) {
          this.expect(close);
          break;
        }
      } else {
        const decorators = [];
        if (this.match(26) && this.hasPlugin("decorators")) {
          this.raise(Errors.UnsupportedParameterDecorator, {
            at: this.state.startLoc
          });
        }
        while (this.match(26)) {
          decorators.push(this.parseDecorator());
        }
        elts.push(this.parseAssignableListItem(flags, decorators));
      }
    }
    return elts;
  }
  parseBindingRestProperty(prop) {
    this.next();
    prop.argument = this.parseIdentifier();
    this.checkCommaAfterRest(125);
    return this.finishNode(prop, "RestElement");
  }
  parseBindingProperty() {
    const prop = this.startNode();
    const {
      type,
      startLoc
    } = this.state;
    if (type === 21) {
      return this.parseBindingRestProperty(prop);
    } else if (type === 136) {
      this.expectPlugin("destructuringPrivate", startLoc);
      this.classScope.usePrivateName(this.state.value, startLoc);
      prop.key = this.parsePrivateName();
    } else {
      this.parsePropertyName(prop);
    }
    prop.method = false;
    return this.parseObjPropValue(prop, startLoc, false, false, true, false);
  }
  parseAssignableListItem(flags, decorators) {
    const left = this.parseMaybeDefault();
    this.parseAssignableListItemTypes(left, flags);
    const elt = this.parseMaybeDefault(left.loc.start, left);
    if (decorators.length) {
      left.decorators = decorators;
    }
    return elt;
  }
  parseAssignableListItemTypes(param, flags) {
    return param;
  }
  parseMaybeDefault(startLoc, left) {
    startLoc ??= this.state.startLoc;
    left = left ?? this.parseBindingAtom();
    if (!this.eat(29)) return left;
    const node = this.startNodeAt(startLoc);
    node.left = left;
    node.right = this.parseMaybeAssignAllowIn();
    return this.finishNode(node, "AssignmentPattern");
  }
  isValidLVal(type, isUnparenthesizedInAssign, binding) {
    return getOwn({
      AssignmentPattern: "left",
      RestElement: "argument",
      ObjectProperty: "value",
      ParenthesizedExpression: "expression",
      ArrayPattern: "elements",
      ObjectPattern: "properties"
    }, type);
  }
  checkLVal(expression, {
    in: ancestor,
    binding = BIND_NONE,
    checkClashes = false,
    strictModeChanged = false,
    hasParenthesizedAncestor = false
  }) {
    const type = expression.type;
    if (this.isObjectMethod(expression)) return;
    if (type === "MemberExpression") {
      if (binding !== BIND_NONE) {
        this.raise(Errors.InvalidPropertyBindingPattern, {
          at: expression
        });
      }
      return;
    }
    if (type === "Identifier") {
      this.checkIdentifier(expression, binding, strictModeChanged);
      const {
        name
      } = expression;
      if (checkClashes) {
        if (checkClashes.has(name)) {
          this.raise(Errors.ParamDupe, {
            at: expression
          });
        } else {
          checkClashes.add(name);
        }
      }
      return;
    }
    const validity = this.isValidLVal(type, !(hasParenthesizedAncestor || expression.extra?.parenthesized) && ancestor.type === "AssignmentExpression", binding);
    if (validity === true) return;
    if (validity === false) {
      const ParseErrorClass = binding === BIND_NONE ? Errors.InvalidLhs : Errors.InvalidLhsBinding;
      this.raise(ParseErrorClass, {
        at: expression,
        ancestor
      });
      return;
    }
    const [key, isParenthesizedExpression] = Array.isArray(validity) ? validity : [validity, type === "ParenthesizedExpression"];
    const nextAncestor = type === "ArrayPattern" || type === "ObjectPattern" || type === "ParenthesizedExpression" ? {
      type
    } : ancestor;
    for (const child of [].concat(expression[key])) {
      if (child) {
        this.checkLVal(child, {
          in: nextAncestor,
          binding,
          checkClashes,
          strictModeChanged,
          hasParenthesizedAncestor: isParenthesizedExpression
        });
      }
    }
  }
  checkIdentifier(at, bindingType, strictModeChanged = false) {
    if (this.state.strict && (strictModeChanged ? isStrictBindReservedWord(at.name, this.inModule) : isStrictBindOnlyReservedWord(at.name))) {
      if (bindingType === BIND_NONE) {
        this.raise(Errors.StrictEvalArguments, {
          at,
          referenceName: at.name
        });
      } else {
        this.raise(Errors.StrictEvalArgumentsBinding, {
          at,
          bindingName: at.name
        });
      }
    }
    if (bindingType & BIND_FLAGS_NO_LET_IN_LEXICAL && at.name === "let") {
      this.raise(Errors.LetInLexicalBinding, {
        at
      });
    }
    if (!(bindingType & BIND_NONE)) {
      this.declareNameFromIdentifier(at, bindingType);
    }
  }
  declareNameFromIdentifier(identifier, binding) {
    this.scope.declareName(identifier.name, binding, identifier.loc.start);
  }
  checkToRestConversion(node, allowPattern) {
    switch (node.type) {
      case "ParenthesizedExpression":
        this.checkToRestConversion(node.expression, allowPattern);
        break;
      case "Identifier":
      case "MemberExpression":
        break;
      case "ArrayExpression":
      case "ObjectExpression":
        if (allowPattern) break;
      default:
        this.raise(Errors.InvalidRestAssignmentPattern, {
          at: node
        });
    }
  }
  checkCommaAfterRest(close) {
    if (!this.match(12)) {
      return false;
    }
    this.raise(this.lookaheadCharCode() === close ? Errors.RestTrailingComma : Errors.ElementAfterRest, {
      at: this.state.startLoc
    });
    return true;
  }
}