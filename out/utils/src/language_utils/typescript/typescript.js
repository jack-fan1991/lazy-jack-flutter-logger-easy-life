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
exports.getPackageJsonAsMap = exports.getPackageJsonPath = void 0;
const editor_utils_1 = require("../../vscode_utils/editor_utils");
const vscode_env_utils_1 = require("../../vscode_utils/vscode_env_utils");
const PACKAGEJson = "package.json";
function getPackageJsonPath() {
    return (0, vscode_env_utils_1.getWorkspacePath)(PACKAGEJson);
}
exports.getPackageJsonPath = getPackageJsonPath;
function getPackageJsonAsMap() {
    return __awaiter(this, void 0, void 0, function* () {
        const packageJson = getPackageJsonPath();
        return (0, editor_utils_1.getYAMLFileContent)(packageJson);
    });
}
exports.getPackageJsonAsMap = getPackageJsonAsMap;
//# sourceMappingURL=typescript.js.map