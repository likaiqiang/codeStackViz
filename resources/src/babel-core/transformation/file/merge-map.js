import remapping from "@ampproject/remapping";
export default function mergeSourceMap(inputMap, map, sourceFileName) {
  const source = sourceFileName.replace(/\\/g, "/");
  let found = false;
  const result = remapping(rootless(map), (s, ctx) => {
    if (s === source && !found) {
      found = true;
      ctx.source = "";
      return rootless(inputMap);
    }
    return null;
  });
  if (typeof inputMap.sourceRoot === "string") {
    result.sourceRoot = inputMap.sourceRoot;
  }
  return Object.assign({}, result);
}
function rootless(map) {
  return Object.assign({}, map, {
    sourceRoot: null
  });
}