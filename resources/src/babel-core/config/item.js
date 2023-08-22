import path from "path";
import { createDescriptor } from "./config-descriptors.js";
export function createItemFromDescriptor(desc) {
  return new ConfigItem(desc);
}
export function* createConfigItem(value, {
  dirname = ".",
  type
} = {}) {
  const descriptor = yield* createDescriptor(value, path.resolve(dirname), {
    type,
    alias: "programmatic item"
  });
  return createItemFromDescriptor(descriptor);
}
const CONFIG_ITEM_BRAND = Symbol.for("@babel/core@7 - ConfigItem");
export function getItemDescriptor(item) {
  if (item?.[CONFIG_ITEM_BRAND]) {
    return item._descriptor;
  }
  return undefined;
}
class ConfigItem {
  _descriptor;
  [CONFIG_ITEM_BRAND] = true;
  value;
  options;
  dirname;
  name;
  file;
  constructor(descriptor) {
    this._descriptor = descriptor;
    Object.defineProperty(this, "_descriptor", {
      enumerable: false
    });
    Object.defineProperty(this, CONFIG_ITEM_BRAND, {
      enumerable: false
    });
    this.value = this._descriptor.value;
    this.options = this._descriptor.options;
    this.dirname = this._descriptor.dirname;
    this.name = this._descriptor.name;
    this.file = this._descriptor.file ? {
      request: this._descriptor.file.request,
      resolved: this._descriptor.file.resolved
    } : undefined;
    Object.freeze(this);
  }
}
Object.freeze(ConfigItem.prototype);