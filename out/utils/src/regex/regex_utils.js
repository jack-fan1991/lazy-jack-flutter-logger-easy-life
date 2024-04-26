"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testLowerCamelGroup = exports.isLowerCamelCase = exports.isPlural = exports.toSnakeCase = exports.toLowerCamelCase = exports.toUpperCamelCase = exports.findFileName = exports.smallCloseRegex = exports.smallOpenRegex = exports.biggerCloseRegex = exports.biggerOpenRegex = exports.findEmailRegex = exports.nameCheckerRegex = exports.findFreezedClassRegex = exports.findPartOfLine = exports.findPartLine = exports.findDartImportRegex = exports.findSuperClassRegex = exports.findClassRegex = exports.findSubClassRegex = void 0;
///这个正则表达式的含义是：以 class 开头，后面可以跟任意数量的空格（\s+）,0~任意空格(\s*/)，
///然后是一个以字母开头的单词（[a-zA-Z]\w*）表示类名，
///然后是 extends 和一个单词（\w+），表示类的继承关系
///匹配泛型 (<[\w\s<>,]*>)?
///这个正则表达式会匹配整个 class 声明语句，而类名会匹配为第一个捕获组。
exports.findSubClassRegex = /class\s+([a-zA-Z]\w*)(<[\w\s<>,]*>)?\s+extends\s+\w*/;
exports.findClassRegex = /class\s+([a-zA-Z]\w*)(<[\w\s<>,]*>)?\s*/;
exports.findSuperClassRegex = /extends\s+([a-zA-Z]\w*)/;
exports.findDartImportRegex = /^import\s+['"][^'"]+['"];/gm;
exports.findPartLine = /part\s+([a-zA-Z]\w*).dart/;
exports.findPartOfLine = /part of\s+([a-zA-Z]\w*).dart/;
exports.findFreezedClassRegex = /with _\$/;
/// 檢查是否符合常用命名規範
exports.nameCheckerRegex = /^(?:[a-z]+(?:[A-Z][a-z]*)*|^[A-Z][a-z]*([A-Z][a-z]*)*$|^[a-z]+(_[a-z]+)*$)$/;
exports.findEmailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
exports.biggerOpenRegex = /{/g;
exports.biggerCloseRegex = /}/g;
exports.smallOpenRegex = /\(/g;
exports.smallCloseRegex = /\)/g;
/// 'd:\work\git\vscode_extension_lazy_jack\test\test1.dart match => ['test1', index: 44, input: 'd:\work\git\vscode_extension_lazy_jack\test\test1.dart', groups: undefined]
/// fileName =match[0].dart
exports.findFileName = /[^\\\/]+(?=\.\w+$)/;
const changeCase = require("change-case");
const console_1 = require("console");
function toUpperCamelCase(str) {
    return changeCase.pascalCase(str).replace(/\s+/g, "");
    return str
        .replace(/[^a-zA-Z0-9]+/g, '')
        .replace(/(?:^\w|[A-Z]|\b\w)/g, (word) => {
        return word.toUpperCase();
    })
        .replace(/\s+/g, '');
}
exports.toUpperCamelCase = toUpperCamelCase;
function toLowerCamelCase(str) {
    return changeCase.camelCase(str);
    str
        .replace(/[^a-zA-Z0-9]+/g, '')
        .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
        return index === 0 ? word.toLowerCase() : word.toUpperCase();
    })
        .replace(/\s+/g, '');
}
exports.toLowerCamelCase = toLowerCamelCase;
function toSnakeCase(str) {
    return changeCase.snakeCase(toUpperCamelCase(str));
}
exports.toSnakeCase = toSnakeCase;
/// 這個函數的作用是判斷一個單詞是否是複數形式
function isPlural(word) {
    return /s$/.test(word);
}
exports.isPlural = isPlural;
function isLowerCamelCase(str) {
    return /^[a-z]+(?:[A-Z][a-z]*)*$/.test(str);
}
exports.isLowerCamelCase = isLowerCamelCase;
function testLowerCamelGroup() {
    (0, console_1.assert)(testLowCamel("test1") === true);
    (0, console_1.assert)(testLowCamel("this_is_not_camel_case") === false);
    (0, console_1.assert)(testLowCamel("thisIsCamelCase") === true);
    (0, console_1.assert)(testLowCamel("thisIsCamelCase1") === true);
    (0, console_1.assert)(testLowCamel("ThisIsNotCamelCase") === false);
    (0, console_1.assert)(testLowCamel("this-is-not-camel-case") === false);
    (0, console_1.assert)(testLowCamel("this_is_not_camel_case") === false);
    (0, console_1.assert)(testLowCamel("this is not camel case") === false);
    (0, console_1.assert)(testLowCamel("123CamelCase") === false);
}
exports.testLowerCamelGroup = testLowerCamelGroup;
function testLowCamel(string) {
    console.log(`${string} =>${isLowerCamelCase(string)} `);
    return isLowerCamelCase(string);
}
//# sourceMappingURL=regex_utils.js.map