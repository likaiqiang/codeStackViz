export function findConfigUpwards(rootDir) {
  return null;
}
export function* findPackageData(filepath) {
  return {
    filepath,
    directories: [],
    pkg: null,
    isPackage: false
  };
}
export function* findRelativeConfig(pkgData, envName, caller) {
  return {
    config: null,
    ignore: null
  };
}
export function* findRootConfig(dirname, envName, caller) {
  return null;
}
export function* loadConfig(name, dirname, envName, caller) {
  throw new Error(`Cannot load ${name} relative to ${dirname} in a browser`);
}
export function* resolveShowConfigPath(dirname) {
  return null;
}
export const ROOT_CONFIG_FILENAMES = [];
export function resolvePlugin(name, dirname) {
  return null;
}
export function resolvePreset(name, dirname) {
  return null;
}
export function loadPlugin(name, dirname) {
  throw new Error(`Cannot load plugin ${name} relative to ${dirname} in a browser`);
}
export function loadPreset(name, dirname) {
  throw new Error(`Cannot load preset ${name} relative to ${dirname} in a browser`);
}