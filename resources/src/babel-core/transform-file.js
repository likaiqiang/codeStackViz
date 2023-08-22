import gensync from "gensync";
import loadConfig from "./config/index.js";
import { run } from "./transformation/index.js";
import * as fs from "./gensync-utils/fs.js";
({});
const transformFileRunner = gensync(function* (filename, opts) {
  const options = Object.assign({}, opts, {
    filename
  });
  const config = yield* loadConfig(options);
  if (config === null) return null;
  const code = yield* fs.readFile(filename, "utf8");
  return yield* run(config, code);
});
export function transformFile(...args) {
  transformFileRunner.errback(...args);
}
export function transformFileSync(...args) {
  return transformFileRunner.sync(...args);
}
export function transformFileAsync(...args) {
  return transformFileRunner.async(...args);
}