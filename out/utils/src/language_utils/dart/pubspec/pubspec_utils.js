"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPubspecDependencyOverridePath = exports.openYamlEditor = exports.replaceInPubspecLockFile = exports.replaceInPubspecFile = exports.getYAMLFileText = exports.getPubspecLockAsMap = exports.getPubspecLockAsText = exports.getPubspecAsText = exports.getPubspecAsMap = exports.getPubspecLockPath = exports.getPubspecPath = exports.isFlutterProject = void 0;
const vscode_env_utils_1 = require("../../../vscode_utils/vscode_env_utils");
const editor_utils_1 = require("../../../vscode_utils/editor_utils");
const PUBSPEC_FILE_NAME = "pubspec.yaml";
const PUBSPEC_LOCK_FILE_NAME = "pubspec.lock";
function isFlutterProject() {
    return getPubspecPath() != null;
}
exports.isFlutterProject = isFlutterProject;
function getPubspecPath() {
    return (0, vscode_env_utils_1.getWorkspacePath)(PUBSPEC_FILE_NAME);
}
exports.getPubspecPath = getPubspecPath;
function getPubspecLockPath() {
    return (0, vscode_env_utils_1.getWorkspacePath)(PUBSPEC_LOCK_FILE_NAME);
}
exports.getPubspecLockPath = getPubspecLockPath;
function getPubspecAsMap() {
    return __awaiter(this, void 0, void 0, function* () {
        const pubspecPath = getPubspecPath();
        return (0, editor_utils_1.getYAMLFileContent)(pubspecPath);
    });
}
exports.getPubspecAsMap = getPubspecAsMap;
function getPubspecAsText() {
    const pubspecPath = getPubspecPath();
    return getYAMLFileText(pubspecPath !== null && pubspecPath !== void 0 ? pubspecPath : '');
}
exports.getPubspecAsText = getPubspecAsText;
function getPubspecLockAsText() {
    const pubspecPath = getPubspecLockPath();
    return getYAMLFileText(pubspecPath !== null && pubspecPath !== void 0 ? pubspecPath : '');
}
exports.getPubspecLockAsText = getPubspecLockAsText;
function getPubspecLockAsMap() {
    return __awaiter(this, void 0, void 0, function* () {
        const pubspecLockPath = getPubspecLockPath();
        return (0, editor_utils_1.getYAMLFileContent)(pubspecLockPath);
    });
}
exports.getPubspecLockAsMap = getPubspecLockAsMap;
function getYAMLFileText(path) {
    return (0, editor_utils_1.readFileToText)(path);
}
exports.getYAMLFileText = getYAMLFileText;
function replaceInPubspecFile(searchValue, replaceValue) {
    return __awaiter(this, void 0, void 0, function* () {
        const pubspecPath = getPubspecPath();
        return yield (0, editor_utils_1.replaceText)(pubspecPath, searchValue, replaceValue);
    });
}
exports.replaceInPubspecFile = replaceInPubspecFile;
function replaceInPubspecLockFile(searchValue, replaceValue) {
    return __awaiter(this, void 0, void 0, function* () {
        const pubspecPath = getPubspecLockPath();
        return yield (0, editor_utils_1.replaceText)(pubspecPath, searchValue, replaceValue);
    });
}
exports.replaceInPubspecLockFile = replaceInPubspecLockFile;
function openYamlEditor() {
    return __awaiter(this, void 0, void 0, function* () {
        let editor = yield (0, editor_utils_1.openEditor)(getPubspecPath());
        if (editor == undefined)
            throw new Error("openYamlEditor failed");
        return editor;
    });
}
exports.openYamlEditor = openYamlEditor;
function getPubspecDependencyOverridePath(dependencyName, text = undefined) {
    {
        const regex = new RegExp(`${dependencyName}:\\s*\\n\\s*#\\s*path:\\s*(.*)`);
        const regex2 = new RegExp(`#${dependencyName}:\\s*#\\s*path:\\s*(.*)`);
        let t = (0, editor_utils_1.readFileToText)(getPubspecPath());
        if (text !== undefined) {
            t = text;
        }
        const match = t.match(regex);
        if (match) {
            const path = match[1];
            return path;
        }
        else {
            return undefined;
        }
    }
}
exports.getPubspecDependencyOverridePath = getPubspecDependencyOverridePath;
//# sourceMappingURL=pubspec_utils.js.map