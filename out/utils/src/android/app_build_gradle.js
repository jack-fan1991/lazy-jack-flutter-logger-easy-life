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
exports.gradleAddFlavor = exports.findApplicationId = exports.getAndroidGradleText = exports.getAndroidGradlePath = void 0;
const vscode = require("vscode");
const open_close_finder_1 = require("../regex/open_close_finder");
const vscode_env_utils_1 = require("../vscode_utils/vscode_env_utils");
const editor_utils_1 = require("../vscode_utils/editor_utils");
const logger_1 = require("../logger/logger");
const APP_BUILD_GRADLE = 'android/app/build.gradle';
const biggerOpenCloseFinder = new open_close_finder_1.BiggerOpenCloseFinder(true);
function getAndroidGradlePath() {
    let root = (0, vscode_env_utils_1.getRootPath)();
    let path = root + '/' + APP_BUILD_GRADLE;
    return path;
}
exports.getAndroidGradlePath = getAndroidGradlePath;
function getAndroidGradleText() {
    let path = getAndroidGradlePath();
    let gradleText = (0, editor_utils_1.readFileToText)(path);
    return gradleText;
}
exports.getAndroidGradleText = getAndroidGradleText;
function findApplicationId() {
    var _a;
    let gradleText = getAndroidGradleText();
    let applicationId = (_a = gradleText.match(/applicationId\s+"(.*)"/)) !== null && _a !== void 0 ? _a : [];
    return applicationId;
}
exports.findApplicationId = findApplicationId;
function gradleAddFlavor(flavor) {
    return __awaiter(this, void 0, void 0, function* () {
        let gradleText = getAndroidGradleText();
        let editor = yield (0, editor_utils_1.openEditor)(getAndroidGradlePath());
        let line = gradleText.split('\n');
        let insertIndex = 0;
        for (let l of line) {
            insertIndex++;
            if (!l.includes('buildTypes'))
                continue;
            while (!l.includes('}')) {
                l = line[insertIndex];
                insertIndex--;
            }
            break;
        }
        insertIndex++;
        let productFlavorsRange = biggerOpenCloseFinder.findRange(editor.document, insertIndex);
        let productFlavorsText = editor === null || editor === void 0 ? void 0 : editor.document.getText(productFlavorsRange);
        if (!(productFlavorsText === null || productFlavorsText === void 0 ? void 0 : productFlavorsText.includes('productFlavors'))) {
            let template = productFlavorsTemplateAll(flavor);
            editor === null || editor === void 0 ? void 0 : editor.edit((editBuilder) => {
                editBuilder.insert(new vscode.Position(insertIndex + 1, 0), template);
            });
        }
        else {
            if (productFlavorsText.includes(flavor)) {
                (0, logger_1.logInfo)(`${flavor} already exists`);
                return;
            }
            let template = productFlavorsTemplate(flavor);
            editor === null || editor === void 0 ? void 0 : editor.edit((editBuilder) => {
                editBuilder.insert(new vscode.Position(insertIndex - 1, 0), template);
            });
        }
        return gradleText;
    });
}
exports.gradleAddFlavor = gradleAddFlavor;
function productFlavorsTemplate(flavor) {
    return `
        ${flavor} {
            dimension 'site'
            resValue "string", "app_name", app_name.${flavor}
            // signingConfig signingConfigs.${flavor}
        }
    `;
}
function productFlavorsTemplateAll(flavor) {
    return `
    flavorDimensions 'site'
    productFlavors {
        ${flavor} {
            dimension 'site'
            resValue "string", "app_name", app_name.${flavor}
            // signingConfig signingConfigs.${flavor}
        }
        
    }
    `;
}
//# sourceMappingURL=app_build_gradle.js.map