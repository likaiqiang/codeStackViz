import { SCOPE_ARROW, SCOPE_DIRECT_SUPER, SCOPE_FUNCTION, SCOPE_SIMPLE_CATCH, SCOPE_SUPER, SCOPE_PROGRAM, SCOPE_VAR, SCOPE_CLASS, SCOPE_STATIC_BLOCK, BIND_SCOPE_FUNCTION, BIND_SCOPE_VAR, BIND_SCOPE_LEXICAL, BIND_KIND_VALUE } from "./scopeflags.js";
import { Errors } from "../parse-error.js";
export class Scope {
  var = new Set();
  lexical = new Set();
  functions = new Set();
  constructor(flags) {
    this.flags = flags;
  }
}
export default class ScopeHandler {
  parser;
  scopeStack = [];
  inModule;
  undefinedExports = new Map();
  constructor(parser, inModule) {
    this.parser = parser;
    this.inModule = inModule;
  }
  get inTopLevel() {
    return (this.currentScope().flags & SCOPE_PROGRAM) > 0;
  }
  get inFunction() {
    return (this.currentVarScopeFlags() & SCOPE_FUNCTION) > 0;
  }
  get allowSuper() {
    return (this.currentThisScopeFlags() & SCOPE_SUPER) > 0;
  }
  get allowDirectSuper() {
    return (this.currentThisScopeFlags() & SCOPE_DIRECT_SUPER) > 0;
  }
  get inClass() {
    return (this.currentThisScopeFlags() & SCOPE_CLASS) > 0;
  }
  get inClassAndNotInNonArrowFunction() {
    const flags = this.currentThisScopeFlags();
    return (flags & SCOPE_CLASS) > 0 && (flags & SCOPE_FUNCTION) === 0;
  }
  get inStaticBlock() {
    for (let i = this.scopeStack.length - 1;; i--) {
      const {
        flags
      } = this.scopeStack[i];
      if (flags & SCOPE_STATIC_BLOCK) {
        return true;
      }
      if (flags & (SCOPE_VAR | SCOPE_CLASS)) {
        return false;
      }
    }
  }
  get inNonArrowFunction() {
    return (this.currentThisScopeFlags() & SCOPE_FUNCTION) > 0;
  }
  get treatFunctionsAsVar() {
    return this.treatFunctionsAsVarInScope(this.currentScope());
  }
  createScope(flags) {
    return new Scope(flags);
  }
  enter(flags) {
    this.scopeStack.push(this.createScope(flags));
  }
  exit() {
    const scope = this.scopeStack.pop();
    return scope.flags;
  }
  treatFunctionsAsVarInScope(scope) {
    return !!(scope.flags & (SCOPE_FUNCTION | SCOPE_STATIC_BLOCK) || !this.parser.inModule && scope.flags & SCOPE_PROGRAM);
  }
  declareName(name, bindingType, loc) {
    let scope = this.currentScope();
    if (bindingType & BIND_SCOPE_LEXICAL || bindingType & BIND_SCOPE_FUNCTION) {
      this.checkRedeclarationInScope(scope, name, bindingType, loc);
      if (bindingType & BIND_SCOPE_FUNCTION) {
        scope.functions.add(name);
      } else {
        scope.lexical.add(name);
      }
      if (bindingType & BIND_SCOPE_LEXICAL) {
        this.maybeExportDefined(scope, name);
      }
    } else if (bindingType & BIND_SCOPE_VAR) {
      for (let i = this.scopeStack.length - 1; i >= 0; --i) {
        scope = this.scopeStack[i];
        this.checkRedeclarationInScope(scope, name, bindingType, loc);
        scope.var.add(name);
        this.maybeExportDefined(scope, name);
        if (scope.flags & SCOPE_VAR) break;
      }
    }
    if (this.parser.inModule && scope.flags & SCOPE_PROGRAM) {
      this.undefinedExports.delete(name);
    }
  }
  maybeExportDefined(scope, name) {
    if (this.parser.inModule && scope.flags & SCOPE_PROGRAM) {
      this.undefinedExports.delete(name);
    }
  }
  checkRedeclarationInScope(scope, name, bindingType, loc) {
    if (this.isRedeclaredInScope(scope, name, bindingType)) {
      this.parser.raise(Errors.VarRedeclaration, {
        at: loc,
        identifierName: name
      });
    }
  }
  isRedeclaredInScope(scope, name, bindingType) {
    if (!(bindingType & BIND_KIND_VALUE)) return false;
    if (bindingType & BIND_SCOPE_LEXICAL) {
      return scope.lexical.has(name) || scope.functions.has(name) || scope.var.has(name);
    }
    if (bindingType & BIND_SCOPE_FUNCTION) {
      return scope.lexical.has(name) || !this.treatFunctionsAsVarInScope(scope) && scope.var.has(name);
    }
    return scope.lexical.has(name) && !(scope.flags & SCOPE_SIMPLE_CATCH && scope.lexical.values().next().value === name) || !this.treatFunctionsAsVarInScope(scope) && scope.functions.has(name);
  }
  checkLocalExport(id) {
    const {
      name
    } = id;
    const topLevelScope = this.scopeStack[0];
    if (!topLevelScope.lexical.has(name) && !topLevelScope.var.has(name) && !topLevelScope.functions.has(name)) {
      this.undefinedExports.set(name, id.loc.start);
    }
  }
  currentScope() {
    return this.scopeStack[this.scopeStack.length - 1];
  }
  currentVarScopeFlags() {
    for (let i = this.scopeStack.length - 1;; i--) {
      const {
        flags
      } = this.scopeStack[i];
      if (flags & SCOPE_VAR) {
        return flags;
      }
    }
  }
  currentThisScopeFlags() {
    for (let i = this.scopeStack.length - 1;; i--) {
      const {
        flags
      } = this.scopeStack[i];
      if (flags & (SCOPE_VAR | SCOPE_CLASS) && !(flags & SCOPE_ARROW)) {
        return flags;
      }
    }
  }
}