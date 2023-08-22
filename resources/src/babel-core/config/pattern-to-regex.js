import path from "path";
const sep = `\\${path.sep}`;
const endSep = `(?:${sep}|$)`;
const substitution = `[^${sep}]+`;
const starPat = `(?:${substitution}${sep})`;
const starPatLast = `(?:${substitution}${endSep})`;
const starStarPat = `${starPat}*?`;
const starStarPatLast = `${starPat}*?${starPatLast}?`;
function escapeRegExp(string) {
  return string.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&");
}
export default function pathToPattern(pattern, dirname) {
  const parts = path.resolve(dirname, pattern).split(path.sep);
  return new RegExp(["^", ...parts.map((part, i) => {
    const last = i === parts.length - 1;
    if (part === "**") return last ? starStarPatLast : starStarPat;
    if (part === "*") return last ? starPatLast : starPat;
    if (part.indexOf("*.") === 0) {
      return substitution + escapeRegExp(part.slice(1)) + (last ? endSep : sep);
    }
    return escapeRegExp(part) + (last ? endSep : sep);
  })].join(""));
}