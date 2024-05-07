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
exports.registerDebugConsole = void 0;
const vscode = require("vscode");
const logger_1 = require("../utils/src/logger/logger");
const editor_utils_1 = require("../utils/src/vscode_utils/editor_utils");
let dartToolPackage = new Map();
let allFiles = [];
function registerDebugConsole(context) {
    return __awaiter(this, void 0, void 0, function* () {
        let isDart = yield traverseFiles('.');
        updateFiles();
        if (isDart) {
            context.subscriptions.push(vscode.debug.registerDebugAdapterTrackerFactory('*', {
                createDebugAdapterTracker(session) {
                    return {
                        onDidSendMessage(message) {
                            return __awaiter(this, void 0, void 0, function* () {
                                // 检查是否是日志消息
                                if (message.event === 'initialized') {
                                    traverseFiles('.');
                                }
                                if (message.type === 'event' && message.event === 'output' && message.body.category === 'stderr') {
                                    const pattern = /([\w/.-]+):(\d+):(\d+)/;
                                    // 使用正则表达式匹配字符串
                                    const match = message.body.output.match(pattern);
                                    // 提取匹配到的子串
                                    let filePath = '';
                                    let lineNumber = '';
                                    let columnNumber = '';
                                    if (match) {
                                        // 提取匹配到的子串
                                        filePath = match[1];
                                        lineNumber = match[2];
                                        columnNumber = match[3];
                                    }
                                    if (filePath.startsWith('lib/')) {
                                        let r = allFiles.filter((e) => e.includes(filePath));
                                        if (r.length > 0) {
                                            message.body.output = message.body.output.replace(filePath, `..//${filePath}`);
                                        }
                                    }
                                }
                                if (message.type === 'event' && message.event === 'output' && (message.body.category === 'stdout' || message.body.category === 'console')) {
                                    // 检查消息内容中是否包含 'package:' 前缀
                                    if (message.body.output.includes('packages/') || message.body.output.includes('package:')) {
                                        let pattern = /(?:\d+\s+)?([\w/.-]+)\s+(\d+):(\d+)/;
                                        if (message.body.output.includes('package:')) {
                                            pattern = /package:([\w/.-]+):(\d+):(\d+)/;
                                        }
                                        if (message.body.output.includes('(packages/')) {
                                            pattern = /packages\/([\w/.-]+):(\d+):(\d+)/;
                                        }
                                        // 使用正则表达式匹配字符串
                                        const match = message.body.output.match(pattern);
                                        // 提取匹配到的子串
                                        let filePath = '';
                                        let lineNumber = '';
                                        let columnNumber = '';
                                        if (match) {
                                            // 提取匹配到的子串
                                            filePath = match[1];
                                            lineNumber = match[2];
                                            columnNumber = match[3];
                                        }
                                        if (filePath === '') {
                                            (0, logger_1.logError)(`not fount ${message.body.output}`, false);
                                            return;
                                        }
                                        let findPackage = filePath.split('/')[1];
                                        if (message.body.output.includes('package:') || message.body.output.includes('(packages/')) {
                                            findPackage = filePath.split('/')[0];
                                        }
                                        let fullPath = "";
                                        for (let key of dartToolPackage.keys()) {
                                            let value = dartToolPackage.get(key);
                                            let packages = value.packages;
                                            let packageRef;
                                            for (let p of packages) {
                                                if (p.name === findPackage) {
                                                    packageRef = p;
                                                    fullPath = packageRef.rootUri + '/' + packageRef.packageUri.replace('/', '');
                                                    break;
                                                }
                                            }
                                        }
                                        if (fullPath === "") {
                                            return;
                                        }
                                        let newOutput = '';
                                        if (message.body.output.includes('api_helper')) {
                                            let a = 1;
                                        }
                                        if (message.body.output.includes(`packages/${findPackage}`)) {
                                            newOutput = message.body.output.replace(`packages/${findPackage}`, ` ${fullPath}`);
                                        }
                                        else {
                                            newOutput = message.body.output.replace(`package:${findPackage}`, ` ${fullPath}`);
                                        }
                                        newOutput = newOutput.replace(` ${lineNumber}:${columnNumber}`, `:${lineNumber}:${columnNumber}`);
                                        message.body.output = newOutput;
                                        // vscode.debug.activeDebugConsole.appendLine(message.body.output);
                                        // console.log(message.body.output)
                                    }
                                }
                            });
                        }
                    };
                }
            }));
        }
        // 监听文件系统事件
        vscode.workspace.onDidRenameFiles((event) => __awaiter(this, void 0, void 0, function* () {
            console.log('Files renamed.');
            // 更新文件列表
            yield updateFiles();
            console.log('Updated files:', allFiles);
        }));
        vscode.workspace.onDidCreateFiles((event) => __awaiter(this, void 0, void 0, function* () {
            console.log('Files renamed.');
            // 更新文件列表
            yield updateFiles();
            console.log('Updated files:', allFiles);
        }));
        vscode.workspace.onDidDeleteFiles((event) => __awaiter(this, void 0, void 0, function* () {
            console.log('Files deleted.');
            // 更新文件列表
            yield updateFiles();
            console.log('Updated files:', allFiles);
        }));
    });
}
exports.registerDebugConsole = registerDebugConsole;
function traverseFiles(directory) {
    return __awaiter(this, void 0, void 0, function* () {
        let pubspec = '**/pubspec.yaml';
        // let packageConfig = '**/package_config.json';
        let pubspecFiles = yield vscode.workspace.findFiles(pubspec, '{**/.symlinks/**,**/build/**,**/.dart_tool/**}');
        if (pubspecFiles.length > 1) {
            pubspecFiles = pubspecFiles.filter((e) => e.path.includes('example') == false);
        }
        if (pubspecFiles.length == 0) {
            return false;
        }
        for (let pubspecPath of pubspecFiles) {
            let pubspecContent = yield (0, editor_utils_1.getYAMLFileContent)(pubspecPath.path);
            let packageName = pubspecContent['name'];
            let target = pubspecPath.path.split('pubspec.yaml')[0] + '.dart_tool/package_config.json';
            try {
                let text = (0, editor_utils_1.readFileToText)(target);
                let json = {};
                try {
                    json = JSON.parse(text);
                }
                catch (_) {
                }
                dartToolPackage.set(packageName, json);
            }
            catch (error) {
            }
        }
        return true;
    });
}
function updateFiles() {
    return __awaiter(this, void 0, void 0, function* () {
        allFiles = [];
        yield vscode.workspace.findFiles('**/*.dart').then((files) => {
            files.forEach((file) => {
                allFiles.push(file.path);
            });
        });
    });
}
//# sourceMappingURL=vscode_debug_console.js.map