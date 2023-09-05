import fs from "fs/promises";

export const TASKSTATUS = {
    INIT: 0,
    REPOCLONEDONE: 1,
    BUNDLED:2
}

export async function checkPathExists(path) {
    try {
        await fs.access(path, fs.constants.F_OK);
        return true;
    } catch (err) {
        return false;
    }
}
