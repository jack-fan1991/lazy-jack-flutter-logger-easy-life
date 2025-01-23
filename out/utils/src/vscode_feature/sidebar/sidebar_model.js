"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SideBarEntryItem = exports.ScriptsType = void 0;
const vscode = require("vscode");
var ScriptsType;
(function (ScriptsType) {
    ScriptsType["terminal"] = "terminal";
    ScriptsType["command"] = "command";
    ScriptsType["browser"] = "browser";
    ScriptsType["customer"] = "customer";
})(ScriptsType || (exports.ScriptsType = ScriptsType = {}));
class SideBarEntryItem extends vscode.TreeItem {
    constructor(label, collapsibleState, scriptsType, description) {
        super(label, collapsibleState);
        this.label = label;
        this.collapsibleState = collapsibleState;
        this.scriptsType = scriptsType;
        this.description = description;
        this.tooltip = `${this.label}`;
        if (this.description != undefined) {
            this.tooltip += `( ${this.description} )`;
        }
        // this.description = `${this.version}-${Math.ceil(Math.random() * 1000)}`
    }
}
exports.SideBarEntryItem = SideBarEntryItem;
//# sourceMappingURL=sidebar_model.js.map