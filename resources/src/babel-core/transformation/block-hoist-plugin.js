import traverse from "@babel/traverse";
import Plugin from "../config/plugin.js";
let LOADED_PLUGIN;
const blockHoistPlugin = {
  name: "internal.blockHoist",
  visitor: {
    Block: {
      exit({
        node
      }) {
        const {
          body
        } = node;
        let max = 2 ** 30 - 1;
        let hasChange = false;
        for (let i = 0; i < body.length; i++) {
          const n = body[i];
          const p = priority(n);
          if (p > max) {
            hasChange = true;
            break;
          }
          max = p;
        }
        if (!hasChange) return;
        node.body = stableSort(body.slice());
      }
    }
  }
};
export default function loadBlockHoistPlugin() {
  if (!LOADED_PLUGIN) {
    LOADED_PLUGIN = new Plugin(Object.assign({}, blockHoistPlugin, {
      visitor: traverse.explode(blockHoistPlugin.visitor)
    }), {});
  }
  return LOADED_PLUGIN;
}
function priority(bodyNode) {
  const priority = bodyNode?._blockHoist;
  if (priority == null) return 1;
  if (priority === true) return 2;
  return priority;
}
function stableSort(body) {
  const buckets = Object.create(null);
  for (let i = 0; i < body.length; i++) {
    const n = body[i];
    const p = priority(n);
    const bucket = buckets[p] || (buckets[p] = []);
    bucket.push(n);
  }
  const keys = Object.keys(buckets).map(k => +k).sort((a, b) => b - a);
  let index = 0;
  for (const key of keys) {
    const bucket = buckets[key];
    for (const n of bucket) {
      body[index++] = n;
    }
  }
  return body;
}