"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SidebarManager = void 0;
const vscode = require("vscode");
const sidebar_tree_provider_1 = require("./sidebar_tree_provider");
const sidebar_model_1 = require("./sidebar_model");
const vscode_utils_1 = require("../../vscode_utils/vscode_utils");
class SidebarManager {
    constructor() {
        this.sideBars = [];
    }
    addSideBar(sideBar) {
        this.sideBars.push(sideBar);
        return this;
    }
    registerSideBar(context) {
        for (const sideBar of this.sideBars) {
            sideBar.registerToVscode(context);
        }
    }
    registerSideBarCommands(context, sidebarItemSelectClickCommand) {
        sidebar_tree_provider_1.BaseTreeDataProvider.sidebar_command_onselect = sidebarItemSelectClickCommand;
        vscode.commands.registerCommand(sidebarItemSelectClickCommand, (args) => {
            const itemScript = args;
            if (itemScript.scriptsType === sidebar_model_1.ScriptsType.browser) {
                (0, vscode_utils_1.openBrowser)(itemScript.script);
                return;
            }
            for (const sideBar of this.sideBars) {
                sideBar.handleCommand(context, itemScript);
            }
        });
        return this;
    }
}
exports.SidebarManager = SidebarManager;
//# sourceMappingURL=sidebar_manger.js.map