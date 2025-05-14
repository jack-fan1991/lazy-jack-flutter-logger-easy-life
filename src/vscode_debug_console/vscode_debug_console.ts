import * as vscode from 'vscode';
import { logError } from '../utils/src/logger/logger';
import { getYAMLFileContent, readFileToText } from '../utils/src/vscode_utils/editor_utils';

let dartToolPackage = new Map<String, any>()
let allFiles: string[] = [];
export async function registerDebugConsole(context: vscode.ExtensionContext) {


    let isDart = await traverseFiles('.');
    updateFiles()
    if (isDart) {
        context.subscriptions.push(vscode.debug.registerDebugAdapterTrackerFactory('*', {
            createDebugAdapterTracker(session: vscode.DebugSession) {
                return {
                    async onDidSendMessage(message: any) {
                        // 检查是否是日志消息
                        if (message.event === 'initialized') {
                            traverseFiles('.')
                        }
                        if (message.type === 'event' && message.event === 'output' ) {
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
                                let r = allFiles.filter((e) => e.includes(filePath))
                                if (r.length > 0) {
                                    message.body.output = message.body.output.replace(filePath, `../${filePath}`)
                                }
                            }
                        }


                        if (message.type === 'event' && message.event === 'output' && (message.body.category === 'stdout'||message.body.category === 'console')) {
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
                                if (message.body.output.includes('package:')||message.body.output.includes('(packages/')) {
                                    findPackage = filePath.split('/')[0];
                                }
                                let fullPath = ""
                                for (let key of dartToolPackage.keys()) {
                                    let value = dartToolPackage.get(key)
                                    let packages = value.packages
                                    let packageRef
                                    for (let p of packages) {
                                        if (p.name === findPackage) {
                                            packageRef = p
                                            //fullPath = packageRef.rootUri  + packageRef.packageUri.replace('/', '')
                                            // Retrieve user configured prefix, defaulting to "" if not set
                                            const config = vscode.workspace.getConfiguration('FlutterLoggerEasyLife')
                                            let prefix = config.get('customPrefix', '')
                                            // if prefix is empty, then use packageRef.rootUri, else use prefix + '/' + findPackage + '/'
                                            prefix = prefix === '' ? packageRef.rootUri : prefix + '/' + findPackage + '/'
                                            fullPath = prefix + packageRef.packageUri.replace('/', '')
                                            break
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
    // 监听文件系统事件
    vscode.workspace.onDidRenameFiles(async event => {
        console.log('Files renamed.');
        // 更新文件列表
        await updateFiles();
        console.log('Updated files:', allFiles);
    });

    vscode.workspace.onDidCreateFiles(async event => {
        console.log('Files renamed.');
        // 更新文件列表
        await updateFiles();
        console.log('Updated files:', allFiles);
    });


    vscode.workspace.onDidDeleteFiles(async event => {
        console.log('Files deleted.');
        // 更新文件列表
        await updateFiles();
        console.log('Updated files:', allFiles);
    });
}



async function traverseFiles(directory: string): Promise<boolean> {

    let pubspec = '**/pubspec.yaml';
    // let packageConfig = '**/package_config.json';


    let pubspecFiles = await vscode.workspace.findFiles(pubspec, '{**/.symlinks/**,**/build/**,**/.dart_tool/**}')

    if (pubspecFiles.length > 1) {
        pubspecFiles = pubspecFiles.filter((e) => e.path.includes('example') == false)
    }
    if (pubspecFiles.length == 0) {
        return false
    }
    for (let pubspecPath of pubspecFiles) {
        let pubspecContent = await getYAMLFileContent(pubspecPath.path)
        let packageName = pubspecContent!['name']
        let target = pubspecPath.path.split('pubspec.yaml')[0] + '.dart_tool/package_config.json'
        try {
            let text = readFileToText(target)
            let json = {}
            try {
                json = JSON.parse(text);
            } catch (_) {

            }
            dartToolPackage.set(packageName, json);
        } catch (error) {
        }
    }


    return true

}

async function updateFiles() {
    allFiles = []
    await vscode.workspace.findFiles('**/*.dart').then((files) => {
        files.forEach((file) => {
            allFiles.push(file.path)
        });
    });
}