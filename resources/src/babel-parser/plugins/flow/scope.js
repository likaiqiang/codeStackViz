import ScopeHandler, { Scope } from "../../util/scope.js";
import { BIND_FLAGS_FLOW_DECLARE_FN } from "../../util/scopeflags.js";
class FlowScope extends Scope {
  declareFunctions = new Set();
}
export default class FlowScopeHandler extends ScopeHandler {
  createScope(flags) {
    return new FlowScope(flags);
  }
  declareName(name, bindingType, loc) {
    const scope = this.currentScope();
    if (bindingType & BIND_FLAGS_FLOW_DECLARE_FN) {
      this.checkRedeclarationInScope(scope, name, bindingType, loc);
      this.maybeExportDefined(scope, name);
      scope.declareFunctions.add(name);
      return;
    }
    super.declareName(name, bindingType, loc);
  }
  isRedeclaredInScope(scope, name, bindingType) {
    if (super.isRedeclaredInScope(scope, name, bindingType)) return true;
    if (bindingType & BIND_FLAGS_FLOW_DECLARE_FN) {
      return !scope.declareFunctions.has(name) && (scope.lexical.has(name) || scope.functions.has(name));
    }
    return false;
  }
  checkLocalExport(id) {
    if (!this.scopeStack[0].declareFunctions.has(id.name)) {
      super.checkLocalExport(id);
    }
  }
}