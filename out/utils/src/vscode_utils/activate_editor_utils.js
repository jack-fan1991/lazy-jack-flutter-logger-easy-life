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
exports.insertToActivateEditor = exports.saveActivateEditor = exports.reFormat = exports.getActivateTextEditor = exports.getActivateText = exports.getActivateSelectedText = void 0;
const vscode = require("vscode");
/// 一定是當前有active的editor
function getActivateSelectedText() {
    let editor = vscode.window.activeTextEditor;
    if (!editor)
        throw new Error('No active editor');
    let selection = editor.selection;
    let text = editor.document.getText(selection);
    return text;
}
exports.getActivateSelectedText = getActivateSelectedText;
function getActivateText(range = undefined) {
    let editor = vscode.window.activeTextEditor;
    if (!editor)
        throw new Error('No active editor');
    if (range != null) {
        return editor.document.getText(range);
    }
    let text = editor.document.getText();
    return text;
}
exports.getActivateText = getActivateText;
function getActivateTextEditor() {
    let editor = vscode.window.activeTextEditor;
    if (!editor)
        throw new Error('No active editor');
    return editor;
}
exports.getActivateTextEditor = getActivateTextEditor;
function reFormat() {
    return __awaiter(this, void 0, void 0, function* () {
        yield vscode.commands.executeCommand('editor.action.formatDocument');
    });
}
exports.reFormat = reFormat;
function saveActivateEditor() {
    let editor = vscode.window.activeTextEditor;
    if (!editor)
        throw new Error('No active editor');
    return editor.document.save();
}
exports.saveActivateEditor = saveActivateEditor;
function insertToActivateEditor(text, range = undefined, msg = undefined) {
    return __awaiter(this, void 0, void 0, function* () {
        yield getActivateTextEditor().edit((editBuilder) => {
            if (msg) {
                vscode.window.showInformationMessage(msg);
            }
            editBuilder.insert(range !== null && range !== void 0 ? range : new vscode.Position(0, 0), text);
        });
    });
}
exports.insertToActivateEditor = insertToActivateEditor;
//# sourceMappingURL=activate_editor_utils.js.map