import { makeStrongCache } from "../caching.js";
import * as fs from "../../gensync-utils/fs.js";
import nodeFs from "fs";
export function makeStaticFileCache(fn) {
  return makeStrongCache(function* (filepath, cache) {
    const cached = cache.invalidate(() => fileMtime(filepath));
    if (cached === null) {
      return null;
    }
    return fn(filepath, yield* fs.readFile(filepath, "utf8"));
  });
}
function fileMtime(filepath) {
  if (!nodeFs.existsSync(filepath)) return null;
  try {
    return +nodeFs.statSync(filepath).mtime;
  } catch (e) {
    if (e.code !== "ENOENT" && e.code !== "ENOTDIR") throw e;
  }
  return null;
}