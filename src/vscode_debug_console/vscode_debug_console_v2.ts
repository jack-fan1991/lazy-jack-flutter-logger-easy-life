import * as vscode from 'vscode';
import * as path from 'path';
import { logError, logInfo ,showWarning} from '../utils/src/logger/logger';
import { getYAMLFileContent, readFileToText } from '../utils/src/vscode_utils/editor_utils';
import { checkGitExtensionInYamlIfDart } from '../utils/src/language_utils/dart/pubspec/analyze_dart_git_dependency';

// --- 全域狀態管理 ---
// 使用 Map 來儲存不同專案的配置，雖然目前只處理一個 session，但這樣設計更具擴展性
const dartToolPackage = new Map<string, any>();
const projectLibAbsPath = new Map<string, string>();
let sessionPath = "";
let sessionToolConfigPath = "";
let sessionProjectPackageName = "";
let workspaceRootPath = ""; // 工作區根目錄，用於計算相對路徑

// 檔案監聽器
let pubspecWatcher: vscode.FileSystemWatcher | undefined;

// 用於 UI 展示或跨模組通訊
export class APP {
    public static flutterYaml: any | undefined = undefined;
    public static flutterPackageName: any | undefined = undefined;
}


/**
 * 註冊偵錯相關的監聽器和功能
 * @param context Extension 上下文，用於管理 Disposables
 */
export function registerDebugConsole(context: vscode.ExtensionContext) {
    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
        workspaceRootPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
        logInfo(`Workspace root detected: ${workspaceRootPath}`);
    }

    // 監聽偵錯 session 的啟動
    context.subscriptions.push(vscode.debug.onDidStartDebugSession(async (session) => {
        const cwd = session.configuration.cwd;
        if (!cwd) {
            showWarning('Debug session started without a CWD (current working directory). Cannot analyze project.');
            return;
        }

        logInfo(`Debug session started for project at: ${cwd}`);
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
                onDidSendMessage(message: any) {
                    // 只處理有 sessionPath 的情況
                    if (!sessionPath) return;

                    // 核心邏輯：攔截並修改包含 'package:' 的輸出日誌
                    if (message.type === 'event' && message.event === 'output' && (message.body.category === 'stdout' || message.body.category === 'console')) {
                        if (message.body.output.includes('packages/') || message.body.output.includes('package:')) {
                            transformPackagePath(message);
                        }
                    }
                }
            };
        }
    }));
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
            showWarning(`Could not find 'pubspec.yaml' or '.dart_tool/package_config.json' in ${projectDirectory}. Please run 'pub get'.`);
        } else {
            logError(`Failed to traverse project at ${projectDirectory}. Error: ${error.message}`, false);
        }
        return false;
    }
}

/**
 * 修改偵錯輸出訊息，將 package: 路徑轉換為可點擊的絕對/相對檔案路徑。
 * @param message 來自 Debug Adapter 的原始訊息
 */
function transformPackagePath(message: any) {
    // 正則表達式匹配 'package:...' 或 '(packages/...'
    const patterns = [
        /package:([\w/.-]+):(\d+):(\d+)/,
        /\(packages\/([\w/.-]+)\s+(\d+):(\d+)\)/,
        /(?:\d+\s+)?([\w/.-]+)\s+(\d+):(\d+)/ // 備用
    ];
    
    let match;
    for (const p of patterns) {
        match = message.body.output.match(p);
        if (match) break;
    }

    if (!match) return;

    const [originalMatch, filePath, lineNumber, columnNumber] = match;
    // const packageName = filePath.split('/')[0];
    const findPackage = filePath.split('/')[1]
    const projectConfig = dartToolPackage.get(sessionProjectPackageName);
    if (!projectConfig || !projectConfig.packages) return;

    const packageInfo = projectConfig.packages.find((p: any) => p.name === findPackage);
    if (!packageInfo) return;

    let libPath: string;
    const rootUri = packageInfo.rootUri as string;
    
    // 根據 rootUri 的類型解析 package 的 lib 目錄路徑
    if (rootUri.startsWith('file://')) {
        // 絕對路徑 (通常是 pub 快取)
        libPath = vscode.Uri.parse(rootUri).fsPath;
    } else {
        // 相對路徑 (通常是 monorepo 中的本地依賴)
        libPath = path.resolve(sessionPath, rootUri);
    }
    
    // 拼接出完整的檔案系統路徑
    const fullFilePath = path.join(libPath, 'lib', filePath.substring(findPackage.length + 1));

    // 替換原始輸出
    const replacement = `${fullFilePath}:${lineNumber}:${columnNumber}`;
    
    message.body.output = message.body.output.replace(originalMatch, replacement);
}


// --- 檔案監聽與刷新邏輯 ---

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