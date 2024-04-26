"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runPowerShellCommand = exports.runCommand = exports.runTerminal = void 0;
const vscode = require("vscode");
const child_process = require("child_process");
const iconv = require("iconv-lite");
const vscode_env_utils = require("../vscode_utils/vscode_env_utils");
const logger_1 = require("../logger/logger");
function findTerminalAndActivate(name) {
    const terminal = vscode.window.terminals.find(t => t.name == name);
    if (terminal) {
        terminal.show();
        return terminal;
    }
    else {
        const newTerminal = vscode.window.createTerminal(name);
        newTerminal.show();
        return newTerminal;
    }
}
function runTerminal(cmd, terminalName = "", enter = false) {
    vscode.window.showInformationMessage('正在執行' + cmd + ' 命令...');
    terminalName = 'Lazy Jack ' + terminalName;
    let terminal = findTerminalAndActivate(terminalName);
    terminal.sendText(cmd);
    if (enter) {
        terminal.sendText('\r');
    }
    return terminal;
}
exports.runTerminal = runTerminal;
function runCommand(command, cwdPath = undefined, forceCmd = false) {
    const cwd = vscode_env_utils.getRootPath();
    if (cwd && cwd == null) {
        (0, logger_1.logError)('No active workspace folder was found.');
    }
    if (cwd) {
        if (vscode_env_utils.isWindows()) {
            command = "cd " + cwd + ` ;  ${command}`;
        }
        else {
            command = "cd " + cwd + ` &&  ${command}`;
        }
    }
    if (vscode_env_utils.isWindows() && !forceCmd) {
        return runPowerShellCommand(command);
    }
    return new Promise((resolve, reject) => {
        child_process.exec(command, (error, stdout, stderr) => {
            console.log(`${stderr}`);
            if (error) {
                reject(error);
            }
            else {
                resolve(stdout);
            }
        });
    });
}
exports.runCommand = runCommand;
function runPowerShellCommand(command) {
    return new Promise((resolve, reject) => {
        const powershell = child_process.spawn('powershell.exe', [command]);
        let stdout = '';
        let stderr = '';
        powershell.stdout.on('data', (data) => {
            stdout += iconv.decode(data, 'cp936');
        });
        powershell.stderr.on('data', (data) => {
            stderr += iconv.decode(data, 'cp936');
        });
        powershell.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`PowerShell command failed with code ${code}: ${stderr}`));
            }
            else {
                resolve(stdout.trim());
            }
        });
    });
}
exports.runPowerShellCommand = runPowerShellCommand;
//# sourceMappingURL=terminal_utils.js.map