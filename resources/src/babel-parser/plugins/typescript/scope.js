import ScopeHandler, { Scope } from "../../util/scope.js";
import { BIND_KIND_TYPE, BIND_FLAGS_TS_ENUM, BIND_FLAGS_TS_CONST_ENUM, BIND_FLAGS_TS_EXPORT_ONLY, BIND_KIND_VALUE, BIND_FLAGS_CLASS, BIND_FLAGS_TS_IMPORT, SCOPE_TS_MODULE } from "../../util/scopeflags.js";
import { Errors } from "../../parse-error.js";
class TypeScriptScope extends Scope {
  types = new Set();
  enums = new Set();
  constEnums = new Set();
  classes = new Set();
  exportOnlyBindings = new Set();
}
export default class TypeScriptScopeHandler extends ScopeHandler {
  importsStack = [];
  createScope(flags) {
    this.importsStack.push(new Set());
    return new TypeScriptScope(flags);
  }
  enter(flags) {
    if (flags == SCOPE_TS_MODULE) {
      this.importsStack.push(new Set());
    }
    super.enter(flags);
  }
  exit() {
    const flags = super.exit();
    if (flags == SCOPE_TS_MODULE) {
      this.importsStack.pop();
    }
    return flags;
  }
  hasImport(name, allowShadow) {
    const len = this.importsStack.length;
    if (this.importsStack[len - 1].has(name)) {
      return true;
    }
    if (!allowShadow && len > 1) {
      for (let i = 0; i < len - 1; i++) {
        if (this.importsStack[i].has(name)) return true;
      }
    }
    return false;
  }
  declareName(name, bindingType, loc) {
    if (bindingType & BIND_FLAGS_TS_IMPORT) {
      if (this.hasImport(name, true)) {
        this.parser.raise(Errors.VarRedeclaration, {
          at: loc,
          identifierName: name
        });
      }
      this.importsStack[this.importsStack.length - 1].add(name);
      return;
    }
    const scope = this.currentScope();
    if (bindingType & BIND_FLAGS_TS_EXPORT_ONLY) {
      this.maybeExportDefined(scope, name);
      scope.exportOnlyBindings.add(name);
      return;
    }
    super.declareName(name, bindingType, loc);
    if (bindingType & BIND_KIND_TYPE) {
      if (!(bindingType & BIND_KIND_VALUE)) {
        this.checkRedeclarationInScope(scope, name, bindingType, loc);
        this.maybeExportDefined(scope, name);
      }
      scope.types.add(name);
    }
    if (bindingType & BIND_FLAGS_TS_ENUM) scope.enums.add(name);
    if (bindingType & BIND_FLAGS_TS_CONST_ENUM) scope.constEnums.add(name);
    if (bindingType & BIND_FLAGS_CLASS) scope.classes.add(name);
  }
  isRedeclaredInScope(scope, name, bindingType) {
    if (scope.enums.has(name)) {
      if (bindingType & BIND_FLAGS_TS_ENUM) {
        const isConst = !!(bindingType & BIND_FLAGS_TS_CONST_ENUM);
        const wasConst = scope.constEnums.has(name);
        return isConst !== wasConst;
      }
      return true;
    }
    if (bindingType & BIND_FLAGS_CLASS && scope.classes.has(name)) {
      if (scope.lexical.has(name)) {
        return !!(bindingType & BIND_KIND_VALUE);
      } else {
        return false;
      }
    }
    if (bindingType & BIND_KIND_TYPE && scope.types.has(name)) {
      return true;
    }
    return super.isRedeclaredInScope(scope, name, bindingType);
  }
  checkLocalExport(id) {
    const {
      name
    } = id;
    if (this.hasImport(name)) return;
    const len = this.scopeStack.length;
    for (let i = len - 1; i >= 0; i--) {
      const scope = this.scopeStack[i];
      if (scope.types.has(name) || scope.exportOnlyBindings.has(name)) return;
    }
    super.checkLocalExport(id);
  }
}