import * as vscode from 'vscode';
import { logError, logInfo } from '../utils/src/logger/logger';
import { getYAMLFileContent, readFileToText } from '../utils/src/vscode_utils/editor_utils';
import { checkGitExtensionInYamlIfDart } from '../utils/src/language_utils/dart/pubspec/analyze_dart_git_dependency';
import * as path from 'path';
let dartToolPackage = new Map<String, any>()
let projectLibAbsPath = new Map<String, String>()
let sessionPath = ""
let sessionToolConfigPath = ""
let sessionProjectPackageName = ""
let pubspecWatcher: vscode.FileSystemWatcher | undefined;
const workspaceFolders = vscode.workspace.workspaceFolders;
let workspaceRootPath = ""
export class APP {
    public static flutterYaml: any | undefined = undefined;
    public static flutterPackageName: any | undefined = undefined;
}
vscode.debug.onDidStartDebugSession(async (session) => {
    const cwd = session.configuration.cwd;
    console.log('Debug Session Started:', cwd);
    console.log('CWD:', session.name);
    sessionPath = cwd;
    await traverseFiles(sessionPath)
    setupPubspecWatcher(sessionPath);
});

export async function registerDebugConsole(context: vscode.ExtensionContext) {
    if (workspaceFolders && workspaceFolders.length > 0) {
        const workspaceRootUri = workspaceFolders[0].uri; 
        workspaceRootPath = workspaceRootUri.fsPath; 
        console.log('Workspace root:', workspaceRootPath);
    }
    context.subscriptions.push(vscode.debug.registerDebugAdapterTrackerFactory('*', {
        createDebugAdapterTracker(session: vscode.DebugSession) {
            return {
                async onDidSendMessage(message: any) {
                    if (sessionPath === "") {
                        return
                    }
                    // 检查是否是日志消息
                    if (message.event === 'initialized') {
                        traverseFiles('.')
                    }

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
                                                fullPath = "./" + relative +"/"+ "lib/"
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




async function traverseFiles(directory: string): Promise<boolean> {
    projectLibAbsPath.clear();
    let pubspec = '**/pubspec.yaml';
    // let packageConfig = '**/package_config.json';


    // let pubspecFiles = await vscode.workspace.findFiles(pubspec, '{**/.symlinks/**,**/build/**,**/.dart_tool/**}')

    const folderUri = vscode.Uri.file(directory);
    const include = new vscode.RelativePattern(folderUri, '**/pubspec.yaml');

    const pubspecFile = await vscode.workspace.findFiles(
        include,
        '{**/.symlinks/**,**/build/**,**/.dart_tool/**}'
    );


    if (pubspecFile.length != 1) {
        return false
    }
    for (let pubspecPath of pubspecFile) {
        let pubspecContent = await getYAMLFileContent(pubspecPath.path)
        sessionProjectPackageName = pubspecContent!['name']
        let target = pubspecPath.path.split('pubspec.yaml')[0] + '.dart_tool/package_config.json'
        sessionToolConfigPath = target;
        try {
            let text = readFileToText(target)
            let json = {}
            try {
                json = JSON.parse(text);
            } catch (_) {

            }
            dartToolPackage.set(sessionProjectPackageName, json);
            let absPath = pubspecPath.path.replace('pubspec.yaml', "")
            projectLibAbsPath.set(sessionProjectPackageName, absPath);

        } catch (error) {
        }
    }

    checkGitExtensionInYamlIfDart(false).then((yaml) => {
        if (yaml != undefined) {
            APP.flutterYaml = yaml
            APP.flutterPackageName = yaml["name"]
        }
    })
    return true

}



let refreshTimeout: NodeJS.Timeout | undefined = undefined;

function scheduleRefresh(directory: string) {
    if (refreshTimeout) {
        clearTimeout(refreshTimeout);
    }

    refreshTimeout = setTimeout(async () => {
        const ok = await traverseFiles(directory);
        logInfo('🔁 Refresh completed...');
    },1000);
}


function setupPubspecWatcher(directory: string) {
    if (pubspecWatcher) {
        pubspecWatcher.dispose();
        pubspecWatcher = undefined;
    }

    const folderUri = vscode.Uri.file(directory);
    const pattern = new vscode.RelativePattern(folderUri, '**/package_config.json');

    pubspecWatcher = vscode.workspace.createFileSystemWatcher(pattern);

    pubspecWatcher.onDidChange(async (uri) => {
        logInfo(`🔁 Refreshing after pubspec.yaml changed: ${uri.fsPath}`,);
        scheduleRefresh(directory);
    });

    pubspecWatcher.onDidCreate(async (uri) => {
        console.log('pubspec.yaml created:', uri.fsPath);
        scheduleRefresh(directory);
    });

    pubspecWatcher.onDidDelete((uri) => {
        console.log('pubspec.yaml deleted:', uri.fsPath);
    });
}