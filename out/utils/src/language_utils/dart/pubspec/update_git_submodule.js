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
exports.updateGitSubModule = void 0;
const vscode = require("vscode");
const editor_utils_1 = require("../../../vscode_utils/editor_utils");
const terminal_utils_1 = require("../../../terminal_utils/terminal_utils");
function updateGitSubModule(context) {
    return __awaiter(this, void 0, void 0, function* () {
        const files = yield vscode.workspace.findFiles(".gitmodules");
        if (files.length > 0) {
            let text = (0, editor_utils_1.readFileToText)(files[0].fsPath);
            vscode.window.showInformationMessage(`update submodules =>${text}`, '確定', '取消').then((option) => {
                if (option === '確定') {
                    vscode.window.showInformationMessage(`git submodule update --remote => update loading`);
                    (0, terminal_utils_1.runCommand)(`git submodule update --init --recursive`).then((result) => {
                        if (result != '') {
                            vscode.window.showInformationMessage(`error: ${result}`);
                        }
                        else {
                            (0, terminal_utils_1.runCommand)(`git submodule update --remote`).then((result) => {
                                vscode.window.showInformationMessage(`${result}`);
                            });
                        }
                    });
                }
            });
        }
    });
}
exports.updateGitSubModule = updateGitSubModule;
//# sourceMappingURL=update_git_submodule.js.map