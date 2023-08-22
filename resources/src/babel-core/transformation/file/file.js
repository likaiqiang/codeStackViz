import * as helpers from "@babel/helpers";
import { NodePath } from "@babel/traverse";
import { codeFrameColumns } from "@babel/code-frame";
import traverse from "@babel/traverse";
import * as _t from "@babel/types";
const {
  cloneNode,
  interpreterDirective
} = _t;
import { getModuleName } from "@babel/helper-module-transforms";
import semver from "semver";
const errorVisitor = {
  enter(path, state) {
    const loc = path.node.loc;
    if (loc) {
      state.loc = loc;
      path.stop();
    }
  }
};
export default class File {
  _map = new Map();
  opts;
  declarations = {};
  path;
  ast;
  scope;
  metadata = {};
  code = "";
  inputMap;
  hub = {
    file: this,
    getCode: () => this.code,
    getScope: () => this.scope,
    addHelper: this.addHelper.bind(this),
    buildError: this.buildCodeFrameError.bind(this)
  };
  constructor(options, {
    code,
    ast,
    inputMap
  }) {
    this.opts = options;
    this.code = code;
    this.ast = ast;
    this.inputMap = inputMap;
    this.path = NodePath.get({
      hub: this.hub,
      parentPath: null,
      parent: this.ast,
      container: this.ast,
      key: "program"
    }).setContext();
    this.scope = this.path.scope;
  }
  get shebang() {
    const {
      interpreter
    } = this.path.node;
    return interpreter ? interpreter.value : "";
  }
  set shebang(value) {
    if (value) {
      this.path.get("interpreter").replaceWith(interpreterDirective(value));
    } else {
      this.path.get("interpreter").remove();
    }
  }
  set(key, val) {
    if (key === "helpersNamespace") {
      throw new Error("Babel 7.0.0-beta.56 has dropped support for the 'helpersNamespace' utility." + "If you are using @babel/plugin-external-helpers you will need to use a newer " + "version than the one you currently have installed. " + "If you have your own implementation, you'll want to explore using 'helperGenerator' " + "alongside 'file.availableHelper()'.");
    }
    this._map.set(key, val);
  }
  get(key) {
    return this._map.get(key);
  }
  has(key) {
    return this._map.has(key);
  }
  getModuleName() {
    return getModuleName(this.opts, this.opts);
  }
  addImport() {
    throw new Error("This API has been removed. If you're looking for this " + "functionality in Babel 7, you should import the " + "'@babel/helper-module-imports' module and use the functions exposed " + " from that module, such as 'addNamed' or 'addDefault'.");
  }
  availableHelper(name, versionRange) {
    let minVersion;
    try {
      minVersion = helpers.minVersion(name);
    } catch (err) {
      if (err.code !== "BABEL_HELPER_UNKNOWN") throw err;
      return false;
    }
    if (typeof versionRange !== "string") return true;
    if (semver.valid(versionRange)) versionRange = `^${versionRange}`;
    return !semver.intersects(`<${minVersion}`, versionRange) && !semver.intersects(`>=8.0.0`, versionRange);
  }
  addHelper(name) {
    const declar = this.declarations[name];
    if (declar) return cloneNode(declar);
    const generator = this.get("helperGenerator");
    if (generator) {
      const res = generator(name);
      if (res) return res;
    }
    helpers.ensure(name, File);
    const uid = this.declarations[name] = this.scope.generateUidIdentifier(name);
    const dependencies = {};
    for (const dep of helpers.getDependencies(name)) {
      dependencies[dep] = this.addHelper(dep);
    }
    const {
      nodes,
      globals
    } = helpers.get(name, dep => dependencies[dep], uid, Object.keys(this.scope.getAllBindings()));
    globals.forEach(name => {
      if (this.path.scope.hasBinding(name, true)) {
        this.path.scope.rename(name);
      }
    });
    nodes.forEach(node => {
      node._compact = true;
    });
    this.path.unshiftContainer("body", nodes);
    this.path.get("body").forEach(path => {
      if (nodes.indexOf(path.node) === -1) return;
      if (path.isVariableDeclaration()) this.scope.registerDeclaration(path);
    });
    return uid;
  }
  addTemplateObject() {
    throw new Error("This function has been moved into the template literal transform itself.");
  }
  buildCodeFrameError(node, msg, _Error = SyntaxError) {
    let loc = node && (node.loc || node._loc);
    if (!loc && node) {
      const state = {
        loc: null
      };
      traverse(node, errorVisitor, this.scope, state);
      loc = state.loc;
      let txt = "This is an error on an internal node. Probably an internal error.";
      if (loc) txt += " Location has been estimated.";
      msg += ` (${txt})`;
    }
    if (loc) {
      const {
        highlightCode = true
      } = this.opts;
      msg += "\n" + codeFrameColumns(this.code, {
        start: {
          line: loc.start.line,
          column: loc.start.column + 1
        },
        end: loc.end && loc.start.line === loc.end.line ? {
          line: loc.end.line,
          column: loc.end.column + 1
        } : undefined
      }, {
        highlightCode
      });
    }
    return new _Error(msg);
  }
}