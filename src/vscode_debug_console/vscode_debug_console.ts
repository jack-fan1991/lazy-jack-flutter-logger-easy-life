import * as vscode from 'vscode';
import { Icon_Info, logError, showWarning } from '../utils/src/logger/logger';
import { getYAMLFileContent, readFileToText } from '../utils/src/vscode_utils/editor_utils';
import { checkGitExtensionInYamlIfDart } from '../utils/src/language_utils/dart/pubspec/analyze_dart_git_dependency';
import * as path from 'path';
import { loadConfig } from './config_state';
import { fileURLToPath, pathToFileURL } from 'url';
import * as fs from 'fs';
import { runTerminal } from '../utils/src/terminal_utils/terminal_utils';
// --- 全域狀態管理 ---
let dartToolPackage = new Map<String, any>()
let projectLibAbsPath = new Map<String, String>()
// --- 快取 ---
let pathCache = new Map<string, { fullPath: string, absPath: string, sessionProjectLog: boolean }>();
let sessionPath = ""
let sessionToolConfigPath = ""
let sessionProjectPackageName = ""
// 檔案監聽器
let pubspecWatcher: vscode.FileSystemWatcher | undefined;
let workspaceRootPath = ""
let silent = true
const watchers: vscode.FileSystemWatcher[] = [];
let dartSdkPath = ""
let allFiles: string[] = [];
export class APP {
    public static flutterYaml: any | undefined = undefined;
    public static flutterPackageName: any | undefined = undefined;
}


function logInfo(msg: string = "", showOnVscode: boolean = true) {
    console.log(`${Icon_Info} : ${msg}`);
    if (showOnVscode && !silent) {
        vscode.window.showInformationMessage(msg)
    }
}

export async function registerDebugConsole(context: vscode.ExtensionContext) {
    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
        workspaceRootPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
        logInfo(`Workspace root detected: ${workspaceRootPath}`);
    }
    await updateFiles();
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
                    // Normalize and rewrite file paths in build-time error messages
                    const handleRuntimeResponse = message.type === "response"
                    const handleDebugOutput = message.type === 'event' && message.event === 'output' && (message.body.category === 'stdout' || message.body.category === 'console')
                    const handleLaunch = message.type === 'event' && message.event === 'output'
                    if (handleLaunch) {
                        const pattern = /([\w/.-]+):(\d+):(\d+)/;
                        const match = message.body.output.match(pattern);
                        let filePath = '';
                        if (match) {
                            filePath = match[1];
                        }
                        if (filePath.startsWith('lib/')) {
                            let r = allFiles.filter((e) => e.includes(filePath))
                            if (r.length > 0) {
                                const relativePath = path.relative(workspaceRootPath, `${sessionPath}/${filePath}`);
                                message.body.output = message.body.output.replace(filePath, `./${relativePath}`)
                            }
                        }
                    }
                    // 核心邏輯：攔截並修改包含 'package:' 的輸出日誌
                    if (handleDebugOutput || handleRuntimeResponse) {
                        // 检查消息内容中是否包含 'package:' 前缀
                        const dartFileMatch = extractDartFiles(message.body.output)
                        const datFile = dartFileMatch[0]
                        const label = getStackPatternLabel(message.body.output)
                        const config = loadConfig()

                        if (message.body.output.includes('packages/') || message.body.output.includes('package:')) {
                            let pattern = /(?:\d+\s+)?([\w/.-]+)\s+(\d+):(\d+)/;
                            /(?:\d+\s+)?([\w/.-]+)\s+(\d+)(?::(\d+))?/
                            if (message.body.output.includes('package:')) {
                                pattern = /package:([\w/.-]+):(\d+)(?::(\d+))?/;
                            }
                            if (message.body.output.includes('(packages/')) {
                                pattern = /packages:([\w/.-]+):(\d+)(?::(\d+))?/;
                            }
                            let output = message.body.output
                            const ansiRegex = /\x1b\[[0-9;]*m/g;
                            const cleanOutput = message.body.output.replace(ansiRegex, '');
                            const info = extractStackInfo(cleanOutput, pattern);
                            if (info == null) return
                            // 提取匹配到的子串
                            let filePath = info?.path;
                            if (filePath === '') {
                                logError(`not fount ${message.body.output}`, false)
                                return
                            }
                            let findPackage = filePath.split('/')[1]
                            if (message.body.output.includes('package:') || message.body.output.includes('(packages/')) {
                                findPackage = filePath.split('/')[0];
                            }

                            // --- 快取路徑解析 ---
                            const cacheKey = findPackage;
                            let cachedPath = pathCache.get(cacheKey);

                            let absPath = '';
                            let fullPath = '';
                            let sessionProjectLog = false;

                            if (cachedPath) {
                                fullPath = cachedPath.fullPath;
                                absPath = cachedPath.absPath;
                                sessionProjectLog = cachedPath.sessionProjectLog;
                            } else {
                                silent = config.silent
                                const relativePathMode = config.relativePathMode
                                for (let key of dartToolPackage.keys()) {
                                    let value = dartToolPackage.get(key)
                                    let packages = value.packages
                                    for (let packageRef of packages) {
                                        if (packageRef.name === findPackage) {

                                            // Handle session project
                                            if (packageRef.rootUri === "../") {
                                                absPath = projectLibAbsPath.get(findPackage) as string
                                                const relativePath = path.relative(workspaceRootPath, absPath);
                                                const sessionOnRoot = relativePath == ""
                                                sessionProjectLog = true
                                                switch (relativePathMode) {
                                                    case 'session':
                                                    case 'workspace':
                                                    case 'always':
                                                        fullPath = sessionOnRoot ? './lib/' : `./${relativePath}/lib/`;
                                                        break;
                                                    case 'never':
                                                    default:
                                                        fullPath = `${toFileUri(absPath)}/lib/`;
                                                }

                                            }
                                            // Session relative dependency
                                            else if (packageRef.rootUri.startsWith("../")) {
                                                absPath = path.resolve(sessionPath, packageRef.rootUri.replace("../", ""));
                                                sessionProjectLog = false;
                                                const relativePath = path.relative(workspaceRootPath, absPath);

                                                const isSubdirectory = absPath.includes(workspaceRootPath);
                                                if (relativePathMode === 'never') {
                                                    fullPath = `${toFileUri(absPath)}/lib/`;
                                                } else if (relativePathMode === 'workspace' && !isSubdirectory) {
                                                    fullPath = `${toFileUri(absPath)}/lib/`;
                                                }
                                                else {
                                                    fullPath = `./${relativePath}/lib/`;
                                                }
                                            }
                                            else {
                                                absPath = packageRef.rootUri;
                                                const filePath = fileURLToPath(absPath);
                                                const relativePath = path.relative(workspaceRootPath, filePath);
                                                const isSubdirectory = filePath.startsWith(workspaceRootPath);
                                                const isSessionSubdirectory = filePath.startsWith(sessionPath);
                                                sessionProjectLog = false;
                                                if (relativePathMode === 'always' ||
                                                    (relativePathMode === 'workspace' && isSubdirectory) ||
                                                    (relativePathMode === 'session' && isSessionSubdirectory)) {
                                                    fullPath = `./${relativePath}/lib/`;
                                                } else {
                                                    fullPath = `${absPath}/lib/`;
                                                }
                                            }
                                            pathCache.set(cacheKey, { fullPath, absPath, sessionProjectLog });
                                            break; // Found package, exit inner loop
                                        }
                                    }
                                    if (fullPath !== '') break; // Found package, exit outer loop
                                }
                            }
                            if (fullPath === "") {
                                return
                            }
                            let newOutput = ''
                            const isSdk = absPath.includes("packages/flutter") || absPath.includes("dart:core") || message.body.output.includes("dart-sdk/lib/_internal/js_dev_runtime");
                            const isLocal = isLocalPackage(absPath)
                            const prefix = checkHashNumberInFirstHalf(message.body.output)
                            const target = `${datFile}:${info.line}:${info.column}`
                            const wabTarget = `${datFile} ${info.line}:${info.column}`
                            let newPath = datFile.replace(`package:${findPackage}/`, `${fullPath}`)
                            if (output.includes(wabTarget)) {
                                newPath = datFile.replace(`packages/${findPackage}/`, `${fullPath}`)
                                newOutput = output
                                    .replace(`${wabTarget}`, `${newPath}:${info.line}:${info.column}`)
                            } else {
                                newPath = datFile.replace(`package:${findPackage}/`, `${fullPath}`)
                                newOutput = output
                                    .replace(`${target}`, `${newPath}:${info.line}:${info.column}`)
                            }
                            if (config.showEmoji && label != null) {
                                let emoji = sessionProjectLog ? config.emojiMap["session"] : config.emojiMap["pub"]
                                if (isSdk) {
                                    emoji = config.emojiMap["sdk"]
                                } else if (isLocal && !sessionProjectLog) {
                                    emoji = config.emojiMap["local"]
                                }
                                newOutput = newOutput.replace(` ${label}`, ` ${label} ${prefix}${emoji}`)
                            }
                            message.body.output = newOutput
                            // vscode.debug.activeDebugConsole.appendLine(message.body.output);
                            // console.log(message.body.output)


                        } else if ((hasStackPattern(message.body.output))) {

                            if (dartFileMatch.length > 0) {
                                const emoji = config.showEmoji ? config.emojiMap["sdk"] : ""
                                const prefix = checkHashNumberInFirstHalf(message.body.output)
                                let newOutput = ""
                                let output = message.body.output
                                // web
                                if (message.body.output.includes('dart-sdk/lib/_internal')) {
                                    let linePositionPattern = /(?:\d+\s+)?([\w/.-]+)\s+(\d+):(\d+)/;
                                    /(?:\d+\s+)?([\w/.-]+)\s+(\d+)(?::(\d+))?/
                                    const info = extractStackInfo(output, linePositionPattern);
                                    if (info) {
                                        let sdkPath = `${dartSdkPath}/${info.path}`;
                                        try {
                                            const filePath = fileURLToPath(sdkPath);
                                            const relativePath = path.relative(workspaceRootPath, filePath);
                                            const isSubdirectory = filePath.startsWith(workspaceRootPath);
                                            const isSessionSubdirectory = filePath.startsWith(sessionPath);
                                            let relativePathMode = config.relativePathMode
                                            if (relativePathMode === 'always' ||
                                                (relativePathMode === 'workspace' && isSubdirectory) ||
                                                (relativePathMode === 'session' && isSessionSubdirectory)) {
                                                sdkPath = `./${relativePath}`;
                                            }
                                            newOutput = output
                                                .replace(info.path, `${prefix}${emoji} ${sdkPath}`)
                                                .replace(` ${info.line}:${info.column}`, `:${info.line}:${info.column}`);
                                            message.body.output = newOutput
                                        } catch {
                                            if (label != null) {
                                                const fullWidthSpace = '\u3000';
                                                newOutput = output.replace(label, `${label} ${prefix}${emoji}`)
                                                message.body.output = newOutput
                                            }
                                        }

                                    }
                                }
                                // mobile
                                else if (message.body.output.includes('dart:core-patch/')) {
                                    let linePositionPattern = /\(([^)]+):(\d+):(\d+)\)/
                                    let output = message.body.output
                                    const ansiRegex = /\x1b\[[0-9;]*m/g;
                                    const cleanOutput = message.body.output.replace(ansiRegex, '');
                                    const info = extractStackInfo(cleanOutput, linePositionPattern);
                                    const label = getStackPatternLabel(output)
                                    if (info) {
                                        let sdkPath = dartSdkPath + "/dart-sdk/lib/_internal/vm/lib/" + info.path.replace('dart:core-patch/', "")
                                        const filePath = fileURLToPath(sdkPath);
                                        const relativePath = path.relative(workspaceRootPath, filePath);
                                        const isSubdirectory = filePath.startsWith(workspaceRootPath);
                                        const isSessionSubdirectory = filePath.startsWith(sessionPath);
                                        let relativePathMode = config.relativePathMode
                                        if (relativePathMode === 'always' ||
                                            (relativePathMode === 'workspace' && isSubdirectory) ||
                                            (relativePathMode === 'session' && isSessionSubdirectory)) {
                                            sdkPath = `./${relativePath}`;
                                        }
                                        newOutput = output
                                            .replace(`${info.path}:${info.line}:${info.column}`, `${sdkPath}:${info.line}:${info.column}`)

                                        if (label != null) {
                                            newOutput = newOutput.replace(label, `${label} ${prefix}${emoji}`)
                                        }
                                    }
                                } else if (message.body.output.includes('dart:core/')) {
                                    let linePositionPattern = /\(([^)]+):(\d+):(\d+)\)/
                                    let output = message.body.output
                                    const ansiRegex = /\x1b\[[0-9;]*m/g;
                                    const cleanOutput = message.body.output.replace(ansiRegex, '');
                                    const info = extractStackInfo(cleanOutput, linePositionPattern);
                                    const label = getStackPatternLabel(output)
                                    if (info) {
                                        let sdkPath = dartSdkPath + "dart-sdk/lib/core/" + info.path.replace('dart:core/', "")
                                        const filePath = fileURLToPath(sdkPath);
                                        const relativePath = path.relative(workspaceRootPath, filePath);
                                        const isSubdirectory = filePath.startsWith(workspaceRootPath);
                                        const isSessionSubdirectory = filePath.startsWith(sessionPath);
                                        let relativePathMode = config.relativePathMode
                                        if (relativePathMode === 'always' ||
                                            (relativePathMode === 'workspace' && isSubdirectory) ||
                                            (relativePathMode === 'session' && isSessionSubdirectory)) {
                                            sdkPath = `./${relativePath}`;
                                        }
                                        newOutput = output
                                            .replace(`${info.path}:${info.line}:${info.column}`, `${sdkPath}:${info.line}:${info.column}`)
                                        if (label != null) {
                                            newOutput = newOutput.replace(label, `${label} ${prefix}${emoji}`)
                                        }

                                    }
                                }
                                // has #prefix and includes ".dart"
                                else {
                                    const label = getStackPatternLabel(message.body.output)
                                    const prefix = checkHashNumberInFirstHalf(message.body.output)
                                    newOutput = output
                                        .replace(`${path}`, `${path}`)
                                    if (label != null) {
                                        newOutput = newOutput.replace(label, `${label} ${prefix}${emoji}`)
                                    }
                                }
                                message.body.output = newOutput
                            } else if (label != null && config.showEmoji) {
                                // let linePositionPattern = /\(([^)]+):(\d+):(\d+)\)/
                                // const ansiRegex = /\x1b\[[0-9;]*m/g;
                                const output = message.body.output
                                // const cleanOutput = output.replace(ansiRegex, '');
                                const prefix = checkHashNumberInFirstHalf(output)
                                // const emoji = config.showEmoji ? config.emojiMap["sdk"] : ""
                                // const info = extractStackInfo(cleanOutput, linePositionPattern);
                                const fullWidthSpace = '\u3000';
                                let newOutput = output.replace(label, `${label} ${prefix}${fullWidthSpace}`);
                                message.body.output = newOutput

                            }
                        }
                    }
                }
            };
        }
    }
    )
    );
    vscode.workspace.onDidRenameFiles(event => {
        console.log('Files renamed, scheduling update.');
        scheduleUpdateFiles();
    });

    vscode.workspace.onDidCreateFiles(event => {
        console.log('Files created, scheduling update.');
        scheduleUpdateFiles();
    });


    vscode.workspace.onDidDeleteFiles(event => {
        console.log('Files deleted, scheduling update.');
        scheduleUpdateFiles();
    });

}
interface StackInfo {
    path: string;
    line: string;
    column: string;
}

function extractStackInfo(output: string, pattern: RegExp): StackInfo | null {
    const match = output.match(pattern);
    if (!match) return null;

    return {
        path: match[1],
        line: match[2],
        column: match[3]
    };
}

function hasStackPattern(line: string): boolean {
    line = cleanLine(line)
    const regex = /#(\d+)/g;
    let match: RegExpExecArray | null;

    match = regex.exec(line);
    if (!match) return false;

    const hashIndex = match.index;
    const num = parseInt(match[1], 10);

    if (hashIndex <= line.length / 2) {
        return true;
    }
    return false;
}

function cleanLine(line: string) {
    const bar = "│"
    if (line.includes(bar)) {
        return line
            .split(bar)
            .slice(1)
            .join(bar)
            .trim();
    } else {
        return line
    }
}

function getStackPatternLabel(line: string): string | null {
    line = cleanLine(line)
    const regex = /#(\d+)/g;
    let match: RegExpExecArray | null;

    match = regex.exec(line);
    if (!match) return null;

    const hashIndex = match.index;
    const num = parseInt(match[1], 10);

    // 判斷 #number 是否出現在字串前半段
    if (hashIndex <= line.length / 2) {
        return `#${num}`;
    }
    return null;
}

function checkHashNumberInFirstHalf(line: string): string | null {
    line = cleanLine(line)
    const regex = /#(\d+)/g;
    let match: RegExpExecArray | null;

    match = regex.exec(line);
    if (!match) return null;

    const hashIndex = match.index;
    const num = parseInt(match[1], 10);

    if (hashIndex <= line.length / 2 && num < 10) {
        return " ";
    }
    return "";
}

function extractDartFiles(log: string): string[] {
    const regex = /\b\S+\.dart\b/g;
    const matches = log.match(regex);
    return matches ?? [];
}

function scheduleUpdateFiles() {
    if (updateFilesTimeout) {
        clearTimeout(updateFilesTimeout);
    }
    updateFilesTimeout = setTimeout(async () => {
        console.log('Updating file list due to debounced event.');
        await updateFiles();
        console.log('Updated files:', allFiles);
    }, 500); // 500ms delay
}

async function updateFiles() {
    allFiles = []
    await vscode.workspace.findFiles('**/*.dart').then((files) => {
        files.forEach((file) => {
            allFiles.push(file.path)
        });
    });
}

let refreshTimeout: NodeJS.Timeout | undefined = undefined;
let updateFilesTimeout: NodeJS.Timeout | undefined = undefined;

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


export interface PackageConfig {
    configVersion: number;
    packages: DartPackage[];
    generated: string;
    generator: string;
    generatorVersion: string;
    flutterRoot?: string;
    flutterVersion?: string;
    pubCache?: string;
}

export interface DartPackage {
    name: string;
    rootUri: string;
    packageUri: string;
    languageVersion: string;
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
        const packageConfig: PackageConfig = JSON.parse(packageConfigText);

        // 4. 清理並更新全域狀態
        dartToolPackage.clear();
        projectLibAbsPath.clear();
        pathCache.clear();

        sessionProjectPackageName = pubspecContent['name'];
        sessionToolConfigPath = packageConfigPath;
        dartToolPackage.set(sessionProjectPackageName, packageConfig);
        projectLibAbsPath.set(sessionProjectPackageName, projectDirectory);
        watchPackageConfigs(packageConfig)
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

export function toFileUri(absolutePath: string): string {
    const normalized = path.resolve(absolutePath);
    return pathToFileURL(normalized).toString();
}


function isLocalPackage(path: String): boolean {
    return !path.includes('.pub-cache') && !path.includes('packages/flutter');
}

function disposeWatchers(watchers: vscode.FileSystemWatcher[]) {
    watchers.forEach((watcher) => watcher.dispose());
    watchers.length = 0;
}

export async function watchPackageConfigs(packageConfig: PackageConfig) {
    disposeWatchers(watchers)
    for (const pkg of packageConfig.packages) {
        // 
        if (pkg.rootUri.includes(".fvm")||pkg.rootUri.includes("/fvm/")|| pkg.rootUri.includes('.pub-cache') && !pkg.rootUri.includes('packages/flutter')) {
            logInfo(`Ignoring .fvm package: ${pkg.name} at ${pkg.rootUri}`);
            continue;
        }

        if (pkg.rootUri.includes("dart-sdk/pkg")) {
            dartSdkPath = pkg.rootUri.split("dart-sdk")[0]
        }
        let absPath = pkg.rootUri;
        if (pkg.rootUri.startsWith("..")) {
            absPath = path.resolve(sessionPath, pkg.rootUri.replace("../", ""));
        }
        let localPath: string;
        try {
            localPath = vscode.Uri.parse(absPath).fsPath;
        } catch (e) {
            console.warn(`Invalid URI: ${pkg.rootUri}`);
            continue;
        }
        const configPath = path.join(localPath, '.dart_tool', 'package_config.json');

        if (!fs.existsSync(configPath)) continue;

        const watcher = vscode.workspace.createFileSystemWatcher(configPath);
        logInfo(`creating watcher for package_config.json in ${pkg.name} at ${configPath}`);
        const delayMs = 5000;

        watcher.onDidChange(() => {
            throttleRun(pkg.name, delayMs, async () => {
                console.log(`[FlutterLogger] package_config.json changed in ${pkg.name}, running pub get`);
                await runFlutterPubGet();
            });
        });

        watcher.onDidCreate(() => {
            throttleRun(pkg.name, delayMs, async () => {
                console.log(`[FlutterLogger] package_config.json created in ${pkg.name}, running pub get`);
                await runFlutterPubGet();
            });
        });

        watchers.push(watcher);
    }

    return watchers;
}

async function runFlutterPubGet() {
    let terminal = findTerminalAndActivate("LazyJ Logger", sessionPath)
    terminal.sendText('flutter pub get');
    terminal.show();
}

function findTerminalAndActivate(name: string, pwd: string): vscode.Terminal {
    const terminal = vscode.window.terminals.find(t => t.name == name);
    if (terminal) {
        // terminal.show();
        return terminal;
    }
    else {
        const newTerminal = vscode.window.createTerminal(name);
        newTerminal.sendText(`cd ${sessionPath}`)
        // newTerminal.show();
        return newTerminal;
    }
}


const throttleMap = new Map<string, NodeJS.Timeout>();

function throttleRun(key: string, delayMs: number, fn: () => void) {
    if (throttleMap.has(key)) return;

    fn();
    const timeout = setTimeout(() => {
        throttleMap.delete(key);
    }, delayMs);

    throttleMap.set(key, timeout);
}