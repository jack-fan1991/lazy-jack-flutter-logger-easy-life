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
exports.onTypeScript = exports.onGit = exports.onDart = exports.isActiveEditorLanguage = exports.activeEditorIsDart = exports.update_git_dependency = exports.pubspec_utils = exports.analyze_dart_git_dependency = void 0;
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const pubspec_utils_1 = require("./dart/pubspec/pubspec_utils");
const vscode_env_utils_1 = require("../vscode_utils/vscode_env_utils");
const typescript_1 = require("./typescript/typescript");
exports.analyze_dart_git_dependency = require("./dart/pubspec/analyze_dart_git_dependency");
exports.pubspec_utils = require("./dart/pubspec/pubspec_utils");
exports.update_git_dependency = require("./dart/pubspec/update_git_dependency");
function activeEditorIsDart() {
    return isActiveEditorLanguage('dart');
}
exports.activeEditorIsDart = activeEditorIsDart;
function isActiveEditorLanguage(languageId) {
    return vscode.window.activeTextEditor && vscode.window.activeTextEditor.document.languageId === languageId;
}
exports.isActiveEditorLanguage = isActiveEditorLanguage;
function onDart(onYamlParse, onError, parseYaml = false) {
    return __awaiter(this, void 0, void 0, function* () {
        if (vscode.workspace.rootPath == undefined) {
            return;
        }
        let pubspecfilePath = '**/pubspec.yaml';
        let pubspecLock = '**/pubspec.lock';
        let yaml;
        const files = yield vscode.workspace.findFiles(pubspecfilePath);
        if (files.length <= 0) {
            // logError('當前不是flutter 專案',false);
            return onError();
        }
        if (parseYaml) {
            yaml = yield (0, pubspec_utils_1.getPubspecAsMap)();
            if (yaml == undefined) {
                // logError('onDart yaml is undefined')
                // logError(`project => ${getRootPath()}`)
                // logError(`file => ${pubspecfilePath}`)
            }
        }
        return onYamlParse(yaml);
    });
}
exports.onDart = onDart;
function onGit(getData, errorData) {
    return __awaiter(this, void 0, void 0, function* () {
        let workspace = (0, vscode_env_utils_1.getRootPath)();
        if (fs.existsSync(`${workspace}/.git`)) {
            return getData();
        }
    });
}
exports.onGit = onGit;
function onTypeScript(getData, errorData, returnData = false) {
    return __awaiter(this, void 0, void 0, function* () {
        if (vscode.workspace.rootPath == undefined) {
            return;
        }
        let absPath = path.join(vscode.workspace.rootPath, 'package.json');
        let filePath = '**/package.json';
        let data;
        const files = yield vscode.workspace.findFiles(filePath);
        if (files.length <= 0) {
            // console.log('當前不是TypeScript 專案');
            return errorData();
        }
        if (returnData) {
            data = yield (0, typescript_1.getPackageJsonAsMap)();
            if (data == undefined) {
                // logError('onTypeScript data is undefined')
                // logError(`project => ${getRootPath()}`)
                // logError(`file => ${absPath}`)
            }
        }
        return getData(data);
    });
}
exports.onTypeScript = onTypeScript;
//# sourceMappingURL=language_utils.js.map