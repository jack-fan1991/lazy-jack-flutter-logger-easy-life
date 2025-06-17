import * as vscode from 'vscode';
import { logError, logInfo, showWarning } from '../utils/src/logger/logger';
import { getYAMLFileContent, readFileToText } from '../utils/src/vscode_utils/editor_utils';
import { checkGitExtensionInYamlIfDart } from '../utils/src/language_utils/dart/pubspec/analyze_dart_git_dependency';
import * as path from 'path';
// --- 全域狀態管理 ---
let dartToolPackage = new Map<String, any>()
let projectLibAbsPath = new Map<String, String>()
let sessionPath = ""
let sessionToolConfigPath = ""
let sessionProjectPackageName = ""
// 檔案監聽器
let pubspecWatcher: vscode.FileSystemWatcher | undefined;

let workspaceRootPath = ""
export class APP {
    public static flutterYaml: any | undefined = undefined;
    public static flutterPackageName: any | undefined = undefined;
}

export async function registerDebugConsole(context: vscode.ExtensionContext) {
    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
        workspaceRootPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
        logInfo(`Workspace root detected: ${workspaceRootPath}`);
    }

    // 監聽偵錯 session 的啟動
    context.subscriptions.push(vscode.debug.onDidStartDebugSession(async (session) => {
        const cwd = session.configuration.cwd;
        if (!cwd) {
            // showWarning('Debug session started without a CWD (current working directory). Cannot analyze project.');
            return;
        }

        logInfo(`Debug session started path: ${cwd}`);
        sessionPath = cwd;

        // 啟動時，對專案進行一次分析
        const success = await traverseProject(sessionPath);

        // 如果專案分析成功，則設定檔案監聽器
        if (success) {
            setupFileWatcher(sessionPath, sessionToolConfigPath, context);
        }
    }));

    // 註冊 Debug Adapter Tracker，用於修改除錯控制台的輸出
    context.subscriptions.push(vscode.debug.registerDebugAdapterTrackerFactory('*', {
        createDebugAdapterTracker(session: vscode.DebugSession) {
            return {
                async onDidSendMessage(message: any) {
                    // 只處理有 sessionPath 的情況
                    if (!sessionPath) return;
                    // 核心邏輯：攔截並修改包含 'package:' 的輸出日誌
                    if (message.type === 'event' && message.event === 'output' && (message.body.category === 'stdout' || message.body.category === 'console')) {
                        // 检查消息内容中是否包含 'package:' 前缀
                        if (message.body.output.includes('packages/') || message.body.output.includes('package:')) {
                            let pattern = /(?:\d+\s+)?([\w/.-]+)\s+(\d+):(\d+)/;
                            /(?:\d+\s+)?([\w/.-]+)\s+(\d+)(?::(\d+))?/
                            if (message.body.output.includes('package:')) {
                                pattern = /package:([\w/.-]+):(\d+)(?::(\d+))?/;
                            }
                            if (message.body.output.includes('(packages/')) {
                                pattern = /packages:([\w/.-]+):(\d+)(?::(\d+))?/;
                            }
                            // 使用正则表达式匹配字符串
                            const match = message.body.output.match(pattern);
                            // 提取匹配到的子串
                            let filePath = '';
                            let lineNumber = '';
                            let columnNumber = '';
                            if (match) {
                                filePath = match[1];
                                lineNumber = match[2];
                                columnNumber = match[3];
                            }
                            if (filePath === '') {
                                logError(`not fount ${message.body.output}`, false)
                                return
                            }
                            let findPackage = filePath.split('/')[1]
                            if (message.body.output.includes('package:') || message.body.output.includes('(packages/')) {
                                findPackage = filePath.split('/')[0];
                            }
                            let fullPath = ""
                            for (let key of dartToolPackage.keys()) {
                                let value = dartToolPackage.get(key)
                                let packages = value.packages
                                let packageRef
                                for (let p of packages) {
                                    const resourceUri = vscode.window.activeTextEditor?.document.uri;

                                    if (p.name === findPackage) {
                                        const packageRef = p;
                                        if (packageRef.rootUri === "../") {
                                            let absPath = projectLibAbsPath.get(findPackage)
                                            const relative = path.relative(workspaceRootPath, absPath as string);
                                            if (relative === "") {
                                                fullPath = "./lib"
                                            } else {
                                                fullPath = "./" + relative + "/" + "lib/"
                                            }
                                        }
                                        // local package
                                        else if (packageRef.rootUri.startsWith("../")) {
                                            const absPath = path.resolve(sessionPath, packageRef.rootUri.replace("../", ""));
                                            fullPath = absPath + "/lib"
                                        }
                                        else {
                                            fullPath = packageRef.rootUri + "/lib"
                                        }

                                    }
                                }

                            }
                            if (fullPath === "") {
                                return
                            }
                            let newOutput = ''
                            if (message.body.output.includes(`packages/${findPackage}`)) {
                                newOutput = message.body.output.replace(`packages/${findPackage}`, ` ${fullPath}`)
                            } else {
                                newOutput = message.body.output.replace(`package:${findPackage}`, ` ${fullPath}`)
                            }
                            newOutput = newOutput.replace(` ${lineNumber}:${columnNumber}`, `:${lineNumber}:${columnNumber}`)
                            message.body.output = newOutput
                            // vscode.debug.activeDebugConsole.appendLine(message.body.output);
                            // console.log(message.body.output)


                        }
                    }
                }
            };
        }
    }
    )
    );


}



let refreshTimeout: NodeJS.Timeout | undefined = undefined;

/**
 * 防抖 (Debounce) 函式，避免在短時間內重複觸發刷新。
 * @param projectDirectory 需要刷新的專案目錄
 */
function scheduleRefresh(projectDirectory: string, context: vscode.ExtensionContext) {
    if (refreshTimeout) {
        clearTimeout(refreshTimeout);
    }

    refreshTimeout = setTimeout(async () => {
        logInfo('Change detected, refreshing project configuration...');
        const success = await traverseProject(projectDirectory);
        if (success) {
            // 刷新成功後，需要重新設定監聽器，以防萬一檔案路徑改變
            // 雖然此處路徑不變，但這是個好習慣
            setupFileWatcher(projectDirectory, sessionToolConfigPath, context);
            logInfo('✅ Refresh completed.');
        }
    }, 1000); // 延遲1秒執行，等待檔案系統穩定
}




/**
 * [優化核心] 直接分析指定目錄的專案結構，而不是全域搜尋。
 * @param projectDirectory 專案的根目錄 (通常是 debug session 的 CWD)
 * @returns 回傳是否成功分析
 */
async function traverseProject(projectDirectory: string): Promise<boolean> {
    const pubspecPath = path.join(projectDirectory, 'pubspec.yaml');
    const packageConfigPath = path.join(projectDirectory, '.dart_tool', 'package_config.json');

    try {
        // 1. 檢查 pubspec.yaml 是否存在
        await vscode.workspace.fs.stat(vscode.Uri.file(pubspecPath));

        // 2. 讀取並解析 pubspec.yaml
        const pubspecContent = await getYAMLFileContent(pubspecPath);
        if (!pubspecContent || !pubspecContent['name']) {
            logError(`Invalid or missing 'name' in pubspec.yaml at: ${pubspecPath}`, false);
            return false;
        }

        // 3. 檢查 package_config.json 是否存在
        await vscode.workspace.fs.stat(vscode.Uri.file(packageConfigPath));
        const packageConfigText = await readFileToText(packageConfigPath);
        const packageConfigJson = JSON.parse(packageConfigText);

        // 4. 清理並更新全域狀態
        dartToolPackage.clear();
        projectLibAbsPath.clear();

        sessionProjectPackageName = pubspecContent['name'];
        sessionToolConfigPath = packageConfigPath;
        dartToolPackage.set(sessionProjectPackageName, packageConfigJson);
        projectLibAbsPath.set(sessionProjectPackageName, projectDirectory);

        logInfo(`Successfully analyzed project: ${sessionProjectPackageName}`);

        // 附帶的檢查邏輯
        checkGitExtensionInYamlIfDart(false).then((yaml) => {
            if (yaml) {
                APP.flutterYaml = yaml;
                APP.flutterPackageName = yaml["name"];
            }
        });

        return true;

    } catch (error: any) {
        if (error.code === 'FileNotFound') {
            // showWarning(`Could not find 'pubspec.yaml' or '.dart_tool/package_config.json' in ${projectDirectory}. Please run 'pub get'.`);
        } else {
            logError(`Failed to traverse project at ${projectDirectory}. Error: ${error.message}`, false);
        }
        return false;
    }
}



/**
 * [優化核心] 設定一個監聽器，只監聽指定的單一檔案。
 * @param projectDirectory 專案目錄
 * @param configPathToWatch 要監聽的 `package_config.json` 的絕對路徑
 * @param context Extension 上下文
 */
function setupFileWatcher(projectDirectory: string, configPathToWatch: string, context: vscode.ExtensionContext) {
    // 如果已有監聽器，先釋放掉
    if (pubspecWatcher) {
        pubspecWatcher.dispose();
    }

    if (!configPathToWatch) {
        showWarning("Cannot set up file watcher: configuration path is not defined.");
        return;
    }

    logInfo(`Setting up file watcher for: ${configPathToWatch}`);

    // 建立一個只針對特定檔案的監聽器，效率極高
    const watchUri = vscode.Uri.file(configPathToWatch);
    pubspecWatcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(path.dirname(configPathToWatch), path.basename(configPathToWatch)));

    const triggerRefresh = () => scheduleRefresh(projectDirectory, context);

    pubspecWatcher.onDidChange(triggerRefresh);
    pubspecWatcher.onDidCreate(triggerRefresh);
    pubspecWatcher.onDidDelete(() => {
        showWarning(`'${configPathToWatch}' was deleted. Project analysis may be outdated.`);
        if (pubspecWatcher) {
            pubspecWatcher.dispose();
            pubspecWatcher = undefined;
        }
    });

    // 將監聽器加入到 subscriptions 中，確保 extension 停用時會被自動清理
    context.subscriptions.push(pubspecWatcher);
}