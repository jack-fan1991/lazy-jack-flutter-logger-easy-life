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
        // test
        if (files.length > 0) {
            let text = (0, editor_utils_1.readFileToText)(files[0].fsPath);
            vscode.window.showInformationMessage(`update submodules =>${text}`, 'Confirm', 'Cancel').then((option) => {
                if (option === 'Confirm') {
                    // vscode.window.showInformationMessage(`git submodule update --remote => update loading`);
                    // runCommand(`git submodule update --init --recursive`).then((result) => {
                    //     runCommand(`git submodule foreach git pull origin main`).then((result) => {
                    //         vscode.window.showInformationMessage(`${result}`);
                    //     })
                    // },);
                    vscode.window.withProgress({
                        location: vscode.ProgressLocation.Window,
                        title: '🔄 Updating Git Submodules...',
                        cancellable: false
                    }, () => __awaiter(this, void 0, void 0, function* () {
                        try {
                            // 把 submodule init 完整
                            yield (0, terminal_utils_1.runCommand)(`git submodule update --init --recursive`);
                            // 拉每個 submodule 的最新 main
                            yield (0, terminal_utils_1.runCommand)(`git submodule foreach 'git checkout main && git pull origin main'`);
                            // 把主專案的 submodule commit pointer 加入 staging
                            yield (0, terminal_utils_1.runCommand)(`git add .`);
                            // 自動 commit（可選）
                            yield (0, terminal_utils_1.runCommand)(`git commit -m "🛠 chore: update submodules to latest commit"`);
                            vscode.window.showInformationMessage(`✅ Submodules updated and committed.`);
                        }
                        catch (e) {
                            vscode.window.showErrorMessage(`❌ Submodule force update failed: ${e}`);
                        }
                    }));
                }
            });
        }
    });
}
exports.updateGitSubModule = updateGitSubModule;
//# sourceMappingURL=update_git_submodule.js.map