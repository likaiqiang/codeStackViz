import getTargets from "@babel/helper-compilation-targets";
export function resolveBrowserslistConfigFile(browserslistConfigFile, configFilePath) {
  return undefined;
}
export function resolveTargets(options, root) {
  const optTargets = options.targets;
  let targets;
  if (typeof optTargets === "string" || Array.isArray(optTargets)) {
    targets = {
      browsers: optTargets
    };
  } else if (optTargets) {
    if ("esmodules" in optTargets) {
      targets = Object.assign({}, optTargets, {
        esmodules: "intersect"
      });
    } else {
      targets = optTargets;
    }
  }
  return getTargets(targets, {
    ignoreBrowserslistConfig: true,
    browserslistEnv: options.browserslistEnv
  });
}