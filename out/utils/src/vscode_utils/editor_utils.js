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
exports.replaceSelectionText = exports.getYAMLFileContent = exports.getAbsFilePath = exports.getRelativePath = exports.removeFolderPath = exports.getFolderPath = exports.getActivateFileAsUri = exports.getActivateEditor = exports.getCursorLineText = exports.getActivateEditorFilePath = exports.getActivateEditorFileName = exports.getSelectedText = exports.listFilesInDirectory = exports.createFile = exports.isFileExist = exports.replaceText = exports.readFileToText = exports.insertToEditor = exports.openEditor = void 0;
const path = require("path");
const vscode = require("vscode");
const fs_1 = require("fs");
const fs = require("fs");
const logger_1 = require("../logger/logger");
const vscode_env_utils_1 = require("./vscode_env_utils");
const activate_editor_utils_1 = require("./activate_editor_utils");
const yaml = require("yaml");
function openEditor(filePath, focus) {
    return __awaiter(this, void 0, void 0, function* () {
        filePath = vscode.Uri.parse(filePath).fsPath;
        filePath = (0, vscode_env_utils_1.convertPathIfWindow)(filePath);
        if (!fs.existsSync(filePath))
            return;
        let editor = vscode.window.visibleTextEditors.find(e => (0, vscode_env_utils_1.convertPathIfWindow)(e.document.fileName) === filePath);
        if (!editor) {
            yield vscode.workspace.openTextDocument(filePath).then((document) => __awaiter(this, void 0, void 0, function* () { return editor = yield vscode.window.showTextDocument(document, vscode.ViewColumn.Beside, focus !== null && focus !== void 0 ? focus : false).then(editor => editor); }));
        }
        return editor;
    });
}
exports.openEditor = openEditor;
function insertToEditor(editor, text, range = undefined, msg = undefined) {
    return __awaiter(this, void 0, void 0, function* () {
        yield editor.edit((editBuilder) => {
            if (msg) {
                vscode.window.showInformationMessage(msg);
            }
            editBuilder.insert(range !== null && range !== void 0 ? range : new vscode.Position(0, 0), text);
        });
        if (editor.document.isDirty) {
            yield editor.document.save();
        }
    });
}
exports.insertToEditor = insertToEditor;
function readFileToText(path) {
    if (!(0, fs_1.existsSync)(path)) {
        throw Error(`readFileToText failed ${path} not exists`);
    }
    return fs.readFileSync(path, 'utf8');
}
exports.readFileToText = readFileToText;
function replaceText(filePath, searchValue, replaceValue) {
    return __awaiter(this, void 0, void 0, function* () {
        // find yaml editor
        let editor = vscode.window.visibleTextEditors.find(e => e.document.fileName === filePath);
        if (!editor) {
            yield vscode.workspace.openTextDocument(filePath).then((document) => __awaiter(this, void 0, void 0, function* () { return editor = yield vscode.window.showTextDocument(document, vscode.ViewColumn.Beside, false).then(editor => editor); }));
        }
        if (!editor) {
            return false;
        }
        // 修改yaml 中的 version
        const document = editor.document;
        const start = new vscode.Position(0, 0);
        const end = new vscode.Position(document.lineCount - 1, document.lineAt(document.lineCount - 1).text.length);
        const textRange = new vscode.Range(start, end);
        const text = document.getText();
        const startIndex = text.indexOf(searchValue);
        if (startIndex !== -1) {
            const endIndex = startIndex + searchValue.length;
            const range = new vscode.Range(document.positionAt(startIndex), document.positionAt(endIndex));
            yield editor.edit((editBuilder) => {
                editBuilder.replace(range, replaceValue);
            });
            editor.document.save();
            return true;
        }
        else {
            (0, logger_1.logError)(`replaceText filePath 中找不到${searchValue}`, true);
            return false;
        }
    });
}
exports.replaceText = replaceText;
function isFileExist(filePath) {
    let root = (0, vscode_env_utils_1.getRootPath)();
    if (!filePath.startsWith(root)) {
        filePath = path.join(root, filePath);
    }
    let exist = (0, fs_1.existsSync)(filePath);
    return exist;
}
exports.isFileExist = isFileExist;
function createAndWriteFile(path, text) {
    return __awaiter(this, void 0, void 0, function* () {
        const targetPath = vscode.Uri.file(path); // Replace with your desired file path
        try {
            yield vscode.workspace.fs.writeFile(targetPath, Buffer.from(text, 'utf8'));
            vscode.window.showInformationMessage('File created and written successfully!');
        }
        catch (error) {
            vscode.window.showErrorMessage(`Error: ${error}`);
        }
    });
}
function createFile(targetPath, text) {
    return __awaiter(this, void 0, void 0, function* () {
        if ((0, fs_1.existsSync)(targetPath)) {
            throw Error(`$targetPath already exists`);
        }
        // createAndWriteFile(targetPath, text)
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            (0, fs_1.writeFile)(targetPath, text, "utf8", (error) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve();
            });
        }));
    });
}
exports.createFile = createFile;
function listFilesInDirectory(directory) {
    return __awaiter(this, void 0, void 0, function* () {
        const files = [];
        const entries = yield vscode.workspace.fs.readDirectory(directory);
        for (const [name, type] of entries) {
            if (type === vscode.FileType.File) {
                files.push(name);
            }
        }
        return files;
    });
}
exports.listFilesInDirectory = listFilesInDirectory;
function getSelectedText() {
    let editor = vscode.window.activeTextEditor;
    if (!editor)
        throw new Error('No active editor');
    let selection = editor.selection;
    let text = editor.document.getText(selection);
    return text;
}
exports.getSelectedText = getSelectedText;
function getActivateEditorFileName(showFileType = false) {
    let file = path.basename(getActivateEditorFilePath());
    return showFileType ? file : file.split('.')[0];
}
exports.getActivateEditorFileName = getActivateEditorFileName;
function getActivateEditorFilePath() {
    let editor = vscode.window.activeTextEditor;
    if (!editor)
        throw new Error('No active editor');
    return editor.document.fileName;
}
exports.getActivateEditorFilePath = getActivateEditorFilePath;
function getCursorLineText() {
    let editor = vscode.window.activeTextEditor;
    if (!editor) {
        (0, logger_1.logError)(`[No active editor]=> getCursorLineText`, false);
        return;
    }
    const position = editor.selection.active;
    return editor.document.lineAt(position.line).text;
}
exports.getCursorLineText = getCursorLineText;
function getActivateEditor() {
    let editor = vscode.window.activeTextEditor;
    if (!editor)
        throw new Error('No active editor');
    return editor;
}
exports.getActivateEditor = getActivateEditor;
function getActivateFileAsUri() {
    let editor = vscode.window.activeTextEditor;
    if (!editor)
        throw new Error('No active editor');
    return editor.document.uri;
}
exports.getActivateFileAsUri = getActivateFileAsUri;
function getFolderPath(document) {
    return path.dirname((0, vscode_env_utils_1.convertPathIfWindow)(document.fileName));
}
exports.getFolderPath = getFolderPath;
function removeFolderPath(document) {
    let currentDir = path.dirname(document.fileName);
    return document.fileName.replace(currentDir, '');
}
exports.removeFolderPath = removeFolderPath;
function getRelativePath(file1, file2, fileName = undefined) {
    file1 = file1.replace(/\\/g, '/');
    file2 = file2.replace(/\\/g, '/');
    const relativePath = vscode.workspace.asRelativePath(file1, true);
    const relativePath2 = vscode.workspace.asRelativePath(file2, true);
    const relate = path.relative(path.dirname(relativePath), path.dirname(relativePath2));
    if (fileName != undefined) {
        return path.join(relate, fileName).replace(/\\/g, '/');
    }
    return relate.replace(/\\/g, '/');
}
exports.getRelativePath = getRelativePath;
function getAbsFilePath(uri) {
    let path = uri.path;
    let split = path.split(':');
    if (split.length > 1) {
        path = split[0].replace('/', '') + ':' + split[1];
    }
    return path;
}
exports.getAbsFilePath = getAbsFilePath;
function getYAMLFileContent(path) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (path == undefined)
                throw new Error("path is undefined");
            //   logInfo(`正在解析 ${path}`,true)
            const fileContents = fs.readFileSync(path, 'utf-8');
            return yaml.parse(fileContents);
        }
        catch (e) {
            (0, logger_1.logError)(`getYAMLFileContent ${e}`, false);
        }
    });
}
exports.getYAMLFileContent = getYAMLFileContent;
function replaceSelectionText(range, replaceWith) {
    let editor = vscode.window.activeTextEditor;
    if (!editor) {
        (0, logger_1.logError)(`[No active editor]=> replaceSelectionText`, false);
        return;
    }
    const selection = range !== null && range !== void 0 ? range : editor.selection;
    const text = editor.document.getText(selection);
    editor.edit(editBuilder => {
        let replaceText = replaceWith(text);
        editBuilder.replace(selection, replaceText);
    });
    (0, activate_editor_utils_1.reFormat)();
}
exports.replaceSelectionText = replaceSelectionText;
//# sourceMappingURL=editor_utils.js.map