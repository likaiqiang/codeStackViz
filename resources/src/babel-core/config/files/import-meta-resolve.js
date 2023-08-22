import { resolve as polyfill } from "../../vendor/import-meta-resolve.js";
let importMetaResolve;
{
  if (typeof import.meta.resolve === "function" && typeof import.meta.resolve(import.meta.url) === "string") {
    importMetaResolve = import.meta.resolve;
  } else {
    importMetaResolve = polyfill;
  }
}
export default function resolve(specifier, parent) {
  return importMetaResolve(specifier, parent);
}