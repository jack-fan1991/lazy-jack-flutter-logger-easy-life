"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeDirInEvn = exports.checkDirInEvn = exports.getWorkspacePath = exports.getRootPath = exports.getWorkspace = exports.convertPathIfWindow = exports.isWindows = void 0;
const path = require("path");
const vscode = require("vscode");
const logger_1 = require("../logger/logger");
const fs = require("fs");
function isWindows() {
    return process.platform.startsWith('win');
}
exports.isWindows = isWindows;
function convertPathIfWindow(path) {
    try {
        if (isWindows()) {
            if (path.startsWith('\\')) {
                path = path.substring(1);
            }
            return path.replace(/\\/g, '/');
        }
        else {
            return path;
        }
    }
    catch (e) {
        (0, logger_1.logError)(e, false);
        return '';
    }
}
exports.convertPathIfWindow = convertPathIfWindow;
function getWorkspace() {
    let path = getWorkspacePath('');
    return getRootPath().split('/').pop();
}
exports.getWorkspace = getWorkspace;
function getRootPath() {
    let path = getWorkspacePath('');
    return convertPathIfWindow(path);
}
exports.getRootPath = getRootPath;
function getWorkspacePath(fileName) {
    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
        let filePath = path.join(`${vscode.workspace.workspaceFolders[0].uri.path}`, fileName);
        return convertPathIfWindow(filePath);
    }
}
exports.getWorkspacePath = getWorkspacePath;
function checkDirInEvn(onFileFind, onFileNotFind, ...paths) {
    var _a;
    let targetPath = [(_a = process.env.HOME) !== null && _a !== void 0 ? _a : ""];
    targetPath = [...targetPath, ...paths];
    let pubCacheGit = path.join(...targetPath);
    if (fs.existsSync(pubCacheGit)) {
        onFileFind();
    }
    else {
        console.log(`The directory ${pubCacheGit} does not exist.`);
        onFileNotFind();
    }
}
exports.checkDirInEvn = checkDirInEvn;
function removeDirInEvn(onRemoveDone, ...paths) {
    var _a;
    let targetPath = [(_a = process.env.HOME) !== null && _a !== void 0 ? _a : ""];
    targetPath = [...targetPath, ...paths];
    let pubCacheGit = path.join(...targetPath);
    let removeDone = !fs.existsSync(pubCacheGit);
    let count = 1;
    let maxCount = 3;
    while (!removeDone && count < maxCount) {
        fs.rmdirSync(pubCacheGit, { recursive: true });
        removeDone = fs.existsSync(pubCacheGit);
        count++;
        console.log(`done`);
        onRemoveDone();
    }
    if (count >= maxCount) {
        vscode.window.showErrorMessage(`${path} 刪除失敗`, `再試一次`, '取消').then((options) => {
            if (options === "再試一次") {
                removeDirInEvn(onRemoveDone, ...paths);
            }
        });
    }
    console.log(`done`);
}
exports.removeDirInEvn = removeDirInEvn;
//# sourceMappingURL=vscode_env_utils.js.map