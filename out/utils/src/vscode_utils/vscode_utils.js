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
exports.tryRun = exports.sleep = exports.showPicker = exports.openBrowser = exports.activate_editor_utils = exports.editor_utils = exports.vscode_env_utils = void 0;
const vscode = require("vscode");
exports.vscode_env_utils = require("./vscode_env_utils");
exports.editor_utils = require("./editor_utils");
exports.activate_editor_utils = require("./activate_editor_utils");
function openBrowser(url) {
    vscode.env.openExternal(vscode.Uri.parse(url));
}
exports.openBrowser = openBrowser;
function showPicker(placeholder, items, onItemSelect) {
    let quickPick = vscode.window.createQuickPick();
    quickPick.placeholder = placeholder;
    quickPick.items = items;
    quickPick.onDidAccept(() => onItemSelect(quickPick.selectedItems[0]));
    quickPick.show();
}
exports.showPicker = showPicker;
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
exports.sleep = sleep;
function tryRun(fn, minutes = 3, msSleepSeconds = 5000) {
    return __awaiter(this, void 0, void 0, function* () {
        let count = 0;
        let maxTry = minutes * 60 / (msSleepSeconds / 1000);
        while (count < maxTry) {
            try {
                let result = yield fn();
                if (!result)
                    throw new Error(`tryRun retry remind ${maxTry - count} times`);
                return fn();
            }
            catch (e) {
                console.log(e);
                count++;
                yield sleep(msSleepSeconds);
            }
        }
        return undefined;
    });
}
exports.tryRun = tryRun;
//# sourceMappingURL=vscode_utils.js.map