import * as vscode from 'vscode'

import { checkGitExtensionInYamlIfDart } from './utils/src/language_utils/dart/pubspec/analyze_dart_git_dependency';
import { log } from 'console';
import { registerDebugConsole } from './vscode_debug_console/vscode_debug_console';

export class APP {
  public static yaml: any|undefined = undefined;
}

export async function activate(context: vscode.ExtensionContext) {
  registerDebugConsole(context)
  // checkGitExtensionInYamlIfDart(true).then((yaml) => {
  //   APP.yaml = yaml
  //   log(APP.yaml)
  // })
}


export function deactivate() { }

