"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.showWarning = exports.showInfo = exports.showErrorMessage = exports.logInfo = exports.logError = exports.Icon_Project = exports.Icon_Star = exports.Icon_Debug = exports.Icon_Success2 = exports.Icon_Info = exports.Icon_Warning = exports.Icon_Error = void 0;
const vscode = require("vscode");
exports.Icon_Error = '⛔';
exports.Icon_Warning = '⚠️';
exports.Icon_Info = '💡';
exports.Icon_Success2 = '✔️';
exports.Icon_Debug = '🐛';
exports.Icon_Star = '⭐';
exports.Icon_Project = '📁';
function logError(msg = "", showOnVscode = true) {
    console.error(`${exports.Icon_Error} : ${msg}`);
    if (showOnVscode) {
        vscode.window.showErrorMessage(msg);
    }
}
exports.logError = logError;
function logInfo(msg = "", showOnVscode = true) {
    console.log(`${exports.Icon_Info} : ${msg}`);
    if (showOnVscode) {
        vscode.window.showInformationMessage(msg);
    }
}
exports.logInfo = logInfo;
function showErrorMessage(msg = "") {
    vscode.window.showErrorMessage(msg);
}
exports.showErrorMessage = showErrorMessage;
function showInfo(msg = "") {
    vscode.window.showInformationMessage(msg);
}
exports.showInfo = showInfo;
function showWarning(msg = "") {
    vscode.window.showWarningMessage(msg);
}
exports.showWarning = showWarning;
//# sourceMappingURL=logger.js.map