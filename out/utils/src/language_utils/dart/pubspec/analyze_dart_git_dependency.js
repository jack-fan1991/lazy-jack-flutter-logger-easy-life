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
exports.selectUpdateDependency = exports.checkGitExtensionInYamlIfDart = exports.OverrideDependenciesInfo = exports.DependenciesInfo = void 0;
const logger_1 = require("../../../logger/logger");
const terminal_utils_1 = require("../../../terminal_utils/terminal_utils");
const activate_editor_utils_1 = require("../../../vscode_utils/activate_editor_utils");
const vscode_env_utils_1 = require("../../../vscode_utils/vscode_env_utils");
const language_utils_1 = require("../../language_utils");
const pubspec_utils_1 = require("./pubspec_utils");
const vscode = require("vscode");
const update_git_dependency_1 = require("./update_git_dependency");
const vscode_utils_1 = require("../../../vscode_utils/vscode_utils");
class DependenciesInfo {
    constructor(name, uri, branch, hide) {
        this.name = name;
        this.uri = uri;
        this.branch = branch;
        this.hide = hide;
    }
}
exports.DependenciesInfo = DependenciesInfo;
class OverrideDependenciesInfo {
    constructor(name, path) {
        this.name = name;
        this.path = path;
    }
    commentString() {
        return `${this.name}:\n    path: ${this.path}`;
    }
    unCommentString() {
        return `# ${this.name}:\n  #   path: ${this.path}`;
    }
    isActivate() {
        return (0, pubspec_utils_1.getPubspecAsText)().indexOf(this.unCommentString()) == -1;
    }
    isDeactivate() {
        return !this.isActivate();
    }
}
exports.OverrideDependenciesInfo = OverrideDependenciesInfo;
let gitExtensions = [];
let gitDependenciesOverrides = [];
let gitDependenciesPickerList = [];
let versionPickerCache = new Map();
let isFirstOpen = true;
let pubspecLock;
let pubspec;
function checkGitExtensionInYamlIfDart(showUpdate = false) {
    return __awaiter(this, void 0, void 0, function* () {
        gitExtensions = [];
        gitDependenciesOverrides = [];
        gitDependenciesPickerList = [];
        pubspecLock = yield (0, pubspec_utils_1.getPubspecLockAsMap)();
        return yield (0, language_utils_1.onDart)((pubspecData) => __awaiter(this, void 0, void 0, function* () {
            pubspec = pubspecData;
            if (pubspecData == undefined)
                return undefined;
            let gitDependencies = pubspecData['dependencies'];
            let dependencyOverrides = pubspecData['dependency_overrides'];
            if (dependencyOverrides != undefined) {
                gitDependenciesOverrides = convertToOverrideDependenciesInfo(dependencyOverrides);
            }
            gitDependenciesOverrides = [...gitDependenciesOverrides, ...parseIfOverrideMark()];
            if (gitDependencies != undefined) {
                gitExtensions = convertToDependenciesInfo(gitDependencies);
                yield convertDependenciesToPickerItems(pubspecData, gitExtensions, showUpdate);
            }
            return pubspecData;
        }), () => undefined, true);
    });
}
exports.checkGitExtensionInYamlIfDart = checkGitExtensionInYamlIfDart;
function convertDependenciesToPickerItems(pubspecData, gitDependencies, showUpdate = false) {
    return __awaiter(this, void 0, void 0, function* () {
        let versionPickerList = [];
        for (let dependenciesInfo of gitDependencies) {
            versionPickerList = [];
            const gitCommand = {
                windows: `git ls-remote --heads --sort=-v:refname '${dependenciesInfo.uri}' | ForEach-Object { $_.Split()[1] } `,
                mac: `git ls-remote --heads  --sort=-v:refname '${dependenciesInfo.uri}' | awk '{print $2}' `,
            };
            let allBranch = yield (0, terminal_utils_1.runCommand)((0, vscode_env_utils_1.isWindows)() ? gitCommand.windows : gitCommand.mac);
            let currentVersion = pubspecData['dependencies'][dependenciesInfo.name]['git']['ref'];
            // get all branch from git
            let branchList = allBranch.split('\n').filter((x) => x != "");
            let showBranch = [];
            let onlyVersionRepo = true;
            for (let branch of branchList) {
                branch = branch.replace('refs/heads/', '').replace(/\r/g, '');
                let hideList = dependenciesInfo.hide;
                if (hideList.includes(branch)) {
                    continue;
                }
                versionPickerList.push({ label: `${branch}`, description: `current version => ${currentVersion} `, url: dependenciesInfo.uri });
                showBranch.push(branch);
                //檢查字串有幾個.
                if (onlyVersionRepo) {
                    const matches = branch.match(/\./g);
                    let total = matches ? matches.length : 0;
                    if (total < 2) {
                        onlyVersionRepo = false;
                    }
                }
            }
            let lastVersion = versionPickerList[0].label;
            if (onlyVersionRepo && showUpdate) {
                yield showUpdateIfNotMatch(dependenciesInfo, lastVersion);
            }
            else {
                checkCommitHashInYamlIfDart(dependenciesInfo);
            }
            versionPickerCache.set(dependenciesInfo.name, versionPickerList);
            // Add git dependency to picker list 
            gitDependenciesPickerList.push({ label: dependenciesInfo.name, description: `current version => ${currentVersion} `, url: dependenciesInfo.uri });
            versionPickerCache.set(dependenciesInfo.name, versionPickerList);
        }
    });
}
function showUpdateIfNotMatch(dependenciesInfo, latestVersion) {
    return __awaiter(this, void 0, void 0, function* () {
        if (dependenciesInfo.branch == latestVersion)
            return;
        let dependencyOverride = gitDependenciesOverrides.filter((x) => x.name.includes(dependenciesInfo.name))[0];
        let overrideActivate = dependencyOverride == undefined ? false : dependencyOverride.isActivate();
        let localPathInfo = overrideActivate ? `Project using override path「 ${dependencyOverride.path} 」 ` : ""; // show update or use locale
        vscode.window.showInformationMessage(`[ New Version ${latestVersion}] ${dependenciesInfo.name} : In Project from ${dependenciesInfo.branch}=>${latestVersion},  ${localPathInfo} `, 'Update', !overrideActivate ? 'Debug Local' : "").then((selectedOption) => __awaiter(this, void 0, void 0, function* () {
            if (selectedOption === 'Debug Local') {
                if (!overrideActivate) {
                    if (dependencyOverride == undefined) {
                        yield vscode.window.showInputBox({ prompt: `Please input ${dependenciesInfo.name} local path`, value: `../${dependenciesInfo.name}` }).then((localPath) => __awaiter(this, void 0, void 0, function* () {
                            if (localPath == undefined)
                                return;
                            dependencyOverride = new OverrideDependenciesInfo(dependenciesInfo.name, localPath);
                            let editor = yield (0, pubspec_utils_1.openYamlEditor)();
                            let text = (0, activate_editor_utils_1.getActivateText)();
                            let assertLineAt = text.split('\n').indexOf('assets:') - 1;
                            editor.edit((editBuilder) => {
                                editBuilder.insert(new vscode.Position(assertLineAt, 0), `\ndependency_overrides:\n  ${dependencyOverride.commentString()}\n`);
                            });
                            (0, logger_1.logInfo)(`Activate ${dependencyOverride.name} local override ${dependencyOverride.path}`);
                        }));
                    }
                    else {
                        yield (0, pubspec_utils_1.replaceInPubspecFile)(dependencyOverride.unCommentString(), dependencyOverride.commentString());
                        (0, logger_1.logInfo)(`Activate ${dependencyOverride.name} local override ${dependencyOverride.path}`);
                    }
                }
            }
            else if (selectedOption === 'Update') {
                yield vscode.commands.executeCommand(update_git_dependency_1.extension_updateDependencyVersion, dependenciesInfo, latestVersion, dependencyOverride);
            }
            (0, activate_editor_utils_1.saveActivateEditor)();
        }));
    });
}
function convertToDependenciesInfo(data) {
    let gitExtensions = [];
    let keys = Object.keys(data);
    for (let key of keys) {
        let extension = data[key];
        if (extension == undefined) {
            continue;
        }
        let gitInfo = extension['git'];
        if (gitInfo != undefined) {
            let hide = [];
            if (gitInfo['skipBranch'] != undefined) {
                if (typeof gitInfo['skipBranch'] === 'string') {
                    hide.push(gitInfo['skipBranch']);
                }
                else {
                    for (let b of gitInfo['skipBranch']) {
                        hide.push(b);
                    }
                }
            }
            gitExtensions.push(new DependenciesInfo(key, gitInfo['url'], gitInfo['ref'], hide));
        }
    }
    return gitExtensions;
}
function convertToOverrideDependenciesInfo(data) {
    let dependenciesOverrideInfo = [];
    let keys = Object.keys(data);
    for (let key of keys) {
        let extension = data[key];
        if (extension != undefined && extension['path'] != undefined) {
            dependenciesOverrideInfo.push(new OverrideDependenciesInfo(key, extension['path']));
        }
    }
    return dependenciesOverrideInfo;
}
function parseIfOverrideMark() {
    let dependenciesOverrideInfo = [];
    let start = false;
    let text = (0, pubspec_utils_1.getPubspecAsText)();
    let textLine = text.split('\n');
    textLine.forEach((line) => {
        let index = text.indexOf(line);
        if (!start && line.includes('dependency_overrides:')) {
            start = true;
        }
        if (line.includes('flutter:')) {
            start = false;
        }
        if (start && line.includes('#')) {
            let target = line + text[index + 1];
            let dependency = line.replace('#', '').replace(':', '').trim();
            let path = (0, pubspec_utils_1.getPubspecDependencyOverridePath)(dependency);
            if (path != undefined) {
                dependenciesOverrideInfo.push(new OverrideDependenciesInfo(dependency, path !== null && path !== void 0 ? path : ''));
            }
        }
    });
    return dependenciesOverrideInfo;
}
function selectUpdateDependency() {
    return __awaiter(this, void 0, void 0, function* () {
        yield checkGitExtensionInYamlIfDart();
        (0, vscode_utils_1.showPicker)('Select dependencies', gitDependenciesPickerList, (item) => {
            let dependenciesInfo = gitExtensions.filter((x) => x.name == item.label)[0];
            let dependencyOverride = gitDependenciesOverrides.filter((x) => x.name.includes(dependenciesInfo.name))[0];
            let versionPickerList = versionPickerCache.get(item.label);
            if (dependencyOverride != null) {
                showOverrideDependencySwitcher(dependenciesInfo, dependencyOverride);
            }
            (0, vscode_utils_1.showPicker)('Select version', versionPickerList, (item) => __awaiter(this, void 0, void 0, function* () {
                let version = item.label.replace(`${dependenciesInfo.name} => `, '');
                yield vscode.commands.executeCommand(update_git_dependency_1.extension_updateDependencyVersion, dependenciesInfo, version, dependencyOverride), dependencyOverride;
            }));
        });
    });
}
exports.selectUpdateDependency = selectUpdateDependency;
// 這裡處理override 的切換
function showOverrideDependencySwitcher(dependenciesInfo, dependenciesOverrideInfo) {
    let msg = '';
    if (dependenciesOverrideInfo.isActivate()) {
        msg = `${dependenciesInfo.name} is using override path「 ${dependenciesOverrideInfo.path} 」 `;
    }
    else {
        msg = `Switch ${dependenciesInfo.name} to override path「 ${dependenciesOverrideInfo.path} 」 `;
    }
    vscode.window.showInformationMessage(` ${msg}`, dependenciesOverrideInfo.isActivate() ? 'comment override path' : 'Switch to override path').then((selectedOption) => __awaiter(this, void 0, void 0, function* () {
        if (selectedOption === 'comment override path') {
            (0, pubspec_utils_1.replaceInPubspecFile)(dependenciesOverrideInfo.commentString(), dependenciesOverrideInfo.unCommentString());
            (0, logger_1.logInfo)(`${dependenciesInfo.name} using remote branch ${dependenciesInfo.branch} now`);
        }
        if (selectedOption === 'Switch to override path') {
            (0, pubspec_utils_1.replaceInPubspecFile)(dependenciesOverrideInfo.unCommentString(), dependenciesOverrideInfo.commentString());
            (0, logger_1.logInfo)(`${dependenciesInfo.name} using override path ${dependenciesOverrideInfo.path} now`);
        }
    }));
}
function checkCommitHashInYamlIfDart(dependenciesInfo) {
    return __awaiter(this, void 0, void 0, function* () {
        let libName = dependenciesInfo.name;
        let lockInfo = pubspecLock['packages'][libName];
        let lockRef = lockInfo['description']['resolved-ref'];
        const gitCommand = {
            windows: `git ls-remote '${dependenciesInfo.uri}' ${dependenciesInfo.branch} `,
            mac: `git ls-remote '${dependenciesInfo.uri}' ${dependenciesInfo.branch} `,
        };
        let remoteCommitHash = yield (0, terminal_utils_1.runCommand)((0, vscode_env_utils_1.isWindows)() ? gitCommand.windows : gitCommand.mac);
        const regex = /^([a-z0-9]{8})/;
        let remoteRefHash = remoteCommitHash.match(regex)[1];
        let localRefHash = lockRef.match(regex)[1];
        if (remoteRefHash != localRefHash) {
            vscode.window.showInformationMessage(`[ Update pubspec package : ${libName}]  : In Project from ${localRefHash}=>${remoteRefHash} `, 'Update').then((selectedOption) => __awaiter(this, void 0, void 0, function* () {
                if (selectedOption === 'Update') {
                    yield updatePackage(libName, remoteCommitHash);
                }
            }));
        }
    });
}
function updatePackage(packageName, remoteCommitHash) {
    return __awaiter(this, void 0, void 0, function* () {
        let text = yield (0, pubspec_utils_1.getPubspecLockAsText)();
        let line = text.split('\n');
        let packageString = [];
        let unPackageString = [];
        let start = false;
        for (let l of line) {
            if (l.includes(packageName)) {
                start = true;
            }
            // 計算空格數量
            const regex = /^\s+/;
            const match = l.match(regex);
            let total = 0;
            if (match == undefined) {
                total = 0;
            }
            else {
                total = match[0].length;
            }
            if (start) {
                packageString.push(l);
                unPackageString.push(`# ${l}`);
                let isPackageStart = (total == 2 || total == 0 || l == '');
                if (isPackageStart && !l.includes(packageName)) {
                    packageString.pop();
                    unPackageString.pop();
                    break;
                }
            }
        }
        let packageText = packageString.join('\n');
        let unPackageText = unPackageString.join('\n');
        yield (0, pubspec_utils_1.replaceInPubspecLockFile)(packageText, "");
        yield (0, terminal_utils_1.runTerminal)('flutter pub get');
        (0, logger_1.logInfo)(`${packageName} in last version : hash ${remoteCommitHash}`);
    });
}
//# sourceMappingURL=analyze_dart_git_dependency.js.map