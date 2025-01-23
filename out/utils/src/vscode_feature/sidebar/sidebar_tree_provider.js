"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseTreeDataProvider = void 0;
const terminal_utils_1 = require("../../terminal_utils/terminal_utils");
const sidebar_model_1 = require("./sidebar_model");
const vscode = require("vscode");
/*

* Every tree Item is register on common 'lazyjack.sidebar.command.onselect'
* BaseTreeDataProvider provide handleCommand for every tree item call back with TreeScriptModel
* Implement your own BaseTreeDataProvider.handleCommand to handle your TreeScriptModel

How to use:

* project/src/extension.ts
* see FirebaseDataProvider =>root/lazy_jack_flutter_flavor_magic/src/sidebar/firebase.ts
* register your own BaseTreeDataProvider

export async function activate(context: vscode.ExtensionContext) {
  let sideBars: BaseTreeDataProvider[] = []
  sideBars.push(new FirebaseDataProvider())
  for (let sideBar of sideBars) {
    sideBar.register(context)
  }

  vscode.commands.registerCommand(sidebar_command_onselect, (args) => {
    let dataScript = args as TreeDataScript
    if (dataScript.scriptsType == sidebar.ScriptsType.browser) {
      openBrowser(dataScript.script)
      return
    }
    for (let sideBar of sideBars) {
      sideBar.handleCommand(context, dataScript)
    }
  })
}
export function deactivate() { }
*/
class BaseTreeDataProvider {
    // 用於註冊在package.json
    // "views": {
    //     "explorer": [
    //         {
    //             "id": "lazyjack.sidebar",
    //             "name": "Lazy Jack",
    //             "when": "explorerResourceIsFolder && explorerViewletVisible && !inputFocus"
    //         }
    //     ]
    // },
    viewsId() {
        return this.constructor.name;
    }
    constructor(workspaceRoot) {
        this.workspaceRoot = workspaceRoot;
    }
    static parseScripts(scripts) {
        var _a;
        let childrenList = [];
        for (let index = 0; index < scripts.length; index++) {
            let script = scripts[index];
            let item = new sidebar_model_1.SideBarEntryItem((_a = script.label) !== null && _a !== void 0 ? _a : script.script, vscode.TreeItemCollapsibleState.None, script.scriptsType);
            item.command = {
                command: BaseTreeDataProvider.sidebar_command_onselect,
                title: "run" + scripts[index].label + "on" + scripts[index].scriptsType,
                arguments: [scripts[index]], //命令接收的参数
            };
            childrenList[index] = item;
        }
        return childrenList;
    }
    /// register to vscode
    registerToVscode(context) {
        vscode.window.registerTreeDataProvider(this.viewsId(), this);
    }
    getTreeItem(element) {
        return element;
    }
    getChildren() {
        return Promise.resolve(BaseTreeDataProvider.parseScripts(this.supportScripts()));
    }
    // 分發事件
    dispatchEvent(context, scriptModel) {
        if (scriptModel.itemAction != undefined) {
            scriptModel.itemAction();
            return;
        }
        //default run terminal
        if (scriptModel.scriptsType == sidebar_model_1.ScriptsType.terminal) {
            (0, terminal_utils_1.runTerminal)(scriptModel.script);
        }
        else {
            (0, terminal_utils_1.runCommand)(scriptModel.script);
        }
    }
    // 在 extension.ts 會註冊 ../sidebar_command_onselect
    // BaseTreeDataProvider 皆會收到命令 並透過 handleCommand 處理進行分發
    handleCommand(context, scriptModel) {
        let allScripts = this.supportScripts().map((item) => { return item.script; });
        if (allScripts.includes(scriptModel.script)) {
            this.dispatchEvent(context, scriptModel);
        }
    }
}
exports.BaseTreeDataProvider = BaseTreeDataProvider;
BaseTreeDataProvider.sidebar_command_onselect = 'sidebar.command.onselect';
//# sourceMappingURL=sidebar_tree_provider.js.map