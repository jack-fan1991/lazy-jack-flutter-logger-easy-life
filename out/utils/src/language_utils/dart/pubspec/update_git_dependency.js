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
exports.registerUpdateDependencyVersion = exports.extension_updateDependencyVersion = void 0;
const vscode = require("vscode");
const path = require("path");
const vscode_env_utils_1 = require("../../../vscode_utils/vscode_env_utils");
const pubspec_utils_1 = require("./pubspec_utils");
const logger_1 = require("../../../logger/logger");
const editor_utils_1 = require("../../../vscode_utils/editor_utils");
const lazy_common_1 = require("../../../common/lazy_common");
exports.extension_updateDependencyVersion = "extension.updateDependencyVersion";
function registerUpdateDependencyVersion(context) {
    let fix = (0, vscode_env_utils_1.isWindows)() ? '\r\n' : '\n';
    context.subscriptions.push(vscode.commands.registerCommand(exports.extension_updateDependencyVersion, (dependenciesInfo, updateVersion, dependenciesOverrideInfo) => __awaiter(this, void 0, void 0, function* () {
        var _a;
        const searchValue = `${dependenciesInfo.name}:${fix}    git:${fix}      url: ${dependenciesInfo.uri}${fix}      ref: ${dependenciesInfo.branch}${fix}`;
        const replaceValue = `${dependenciesInfo.name}:${fix}    git:${fix}      url: ${dependenciesInfo.uri}${fix}      ref: ${updateVersion}${fix}`;
        const yamlPath = path.join((_a = vscode.workspace.rootPath) !== null && _a !== void 0 ? _a : '', 'pubspec.yaml');
        // 修改yaml 中的 version
        const replace = yield (0, pubspec_utils_1.replaceInPubspecFile)(searchValue, replaceValue);
        if (!replace) {
            return;
        }
        // 刪除local ..pub-cache/test
        const delPubCachePath = '.pub-cache/git';
        (0, vscode_env_utils_1.checkDirInEvn)(() => {
            (0, logger_1.logInfo)(`Start delete ${delPubCachePath}`);
            (0, vscode_env_utils_1.removeDirInEvn)(() => __awaiter(this, void 0, void 0, function* () {
                (0, logger_1.logInfo)(`Clean done ${delPubCachePath}`);
                const textEditor = yield (0, editor_utils_1.openEditor)(yamlPath, true);
                (0, logger_1.logInfo)(`Change ${dependenciesInfo.name} ${dependenciesInfo.branch} => ${updateVersion}`);
                if (dependenciesOverrideInfo.isActivate()) {
                    yield (0, pubspec_utils_1.replaceInPubspecFile)(dependenciesOverrideInfo.commentString(), dependenciesOverrideInfo.unCommentString());
                    (0, logger_1.logInfo)(`${dependenciesInfo.name} remove local override`);
                }
                (0, lazy_common_1.runFlutterPubGet)();
            }), delPubCachePath);
        }, () => {
            (0, logger_1.logError)(`找不到${delPubCachePath}`);
        }, delPubCachePath);
    })));
}
exports.registerUpdateDependencyVersion = registerUpdateDependencyVersion;
//# sourceMappingURL=update_git_dependency.js.map