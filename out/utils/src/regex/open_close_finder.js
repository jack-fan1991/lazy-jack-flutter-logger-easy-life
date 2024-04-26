"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FlutterOpenCloseFinder = exports.SmallerOpenCloseFinder = exports.BiggerOpenCloseFinder = exports.OpenCloseFinder = void 0;
const vscode = require("vscode");
const regex_utils_1 = require("./regex_utils");
const logger_1 = require("../logger/logger");
class OpenCloseFinder {
    constructor(openRegExp, closeRegExp, reverse = false, debug = false) {
        this.openCount = 0;
        this.closeCount = 0;
        this.reverse = reverse;
        this.debug = debug;
        if (reverse) {
            this.openRegExp = closeRegExp;
            this.closeRegExp = openRegExp;
        }
        else {
            this.openRegExp = openRegExp;
            this.closeRegExp = closeRegExp;
        }
    }
    isDirty() {
        return this.openCount != this.closeCount;
    }
    incrementOpen(number) {
        this.openCount += number;
    }
    incrementClose(number) {
        this.closeCount += number;
    }
    decrementOpen(number) {
        this.openCount -= number;
    }
    decrementClose(number) {
        this.closeCount -= number;
    }
    findRange(document, startLine, debug = undefined) {
        if (debug != undefined) {
            this.debug = debug;
        }
        let finTextRange = this.reverse ? this.findReverse(document, startLine) : this.sequence(document, startLine);
        if (this.debug) {
            (0, logger_1.logInfo)(`FinRange in  => ${document.fileName}`);
            (0, logger_1.logInfo)(`Use finder => ${this.constructor.name}`);
            (0, logger_1.logInfo)(`Target line text => ${document.lineAt(startLine).text}`);
            (0, logger_1.logInfo)(`find text between => ${this.openRegExp} and ${this.closeRegExp}`);
            (0, logger_1.logInfo)(`is reverse => ${this.reverse}`);
            (0, logger_1.logInfo)(`find result ${document.getText(finTextRange)}`);
        }
        return finTextRange;
    }
    findReverse(document, startLine) {
        this.reset();
        let classRange = undefined;
        let endLine = startLine;
        let firstLineText = document.lineAt(startLine).text;
        let match = firstLineText.match(this.openRegExp);
        if (match == null)
            return undefined;
        let allText = document.getText(new vscode.Range(0, 0, document.lineCount + 1, 0));
        const lines = allText.split('\n');
        for (let i = endLine; i > 0; i--) {
            let lineText = lines[i];
            let matchOpen = lineText.match(this.openRegExp);
            let matchClose = lineText.match(this.closeRegExp);
            this.incrementOpen(matchOpen != null ? matchOpen.length : 0);
            this.incrementClose(matchClose != null ? matchClose.length : 0);
            if (this.isDirty()) {
                startLine--;
            }
            else {
                startLine--;
                classRange = new vscode.Range(startLine, 0, endLine + 1, 0);
                let result = document.getText(classRange);
                break;
            }
        }
        return classRange;
    }
    sequence(document, startLine) {
        this.reset();
        let classRange = undefined;
        let endLine = startLine;
        let firstLineText = document.lineAt(startLine).text;
        let match = firstLineText.match(this.openRegExp);
        if (match == null)
            return undefined;
        let allText = document.getText(new vscode.Range(startLine, 0, document.lineCount + 1, 0));
        const lines = allText.split('\n');
        let currentText = '';
        for (let i = 0; i < lines.length; i++) {
            let lineText = lines[i];
            currentText += lineText + '\n';
            let matchOpen = lineText.match(this.openRegExp);
            let matchClose = lineText.match(this.closeRegExp);
            this.incrementOpen(matchOpen != null ? matchOpen.length : 0);
            this.incrementClose(matchClose != null ? matchClose.length : 0);
            if (this.isDirty()) {
                endLine++;
            }
            else {
                endLine++;
                classRange = new vscode.Range(startLine, 0, endLine, 0);
                let result = document.getText(classRange);
                break;
            }
        }
        return classRange;
    }
    reset() {
        this.openCount = 0;
        this.closeCount = 0;
    }
}
exports.OpenCloseFinder = OpenCloseFinder;
class BiggerOpenCloseFinder extends OpenCloseFinder {
    constructor(reverse = false, debug = false) {
        super(regex_utils_1.biggerOpenRegex, regex_utils_1.biggerCloseRegex, reverse, debug);
    }
}
exports.BiggerOpenCloseFinder = BiggerOpenCloseFinder;
class SmallerOpenCloseFinder extends OpenCloseFinder {
    constructor(reverse = false, debug = false) {
        super(regex_utils_1.smallOpenRegex, regex_utils_1.smallCloseRegex, reverse, debug);
    }
}
exports.SmallerOpenCloseFinder = SmallerOpenCloseFinder;
class FlutterOpenCloseFinder extends OpenCloseFinder {
    constructor(debug = false) {
        super(regex_utils_1.biggerOpenRegex, regex_utils_1.biggerCloseRegex, false, debug);
    }
    findRange(document, startLine) {
        this.reset();
        let classRange = undefined;
        let endLine = startLine;
        let firstLineText = document.lineAt(startLine).text;
        let match = firstLineText.match(regex_utils_1.biggerOpenRegex);
        if (match == null) {
            let maxTry = 3;
            let tryCount = 0;
            while (tryCount < maxTry) {
                match = document.lineAt(startLine + tryCount).text.match(regex_utils_1.biggerOpenRegex);
                if (match != null)
                    break;
                tryCount++;
            }
            if (match == null)
                return undefined;
        }
        let allText = document.getText(new vscode.Range(startLine, 0, document.lineCount + 1, 0));
        const lines = allText.split('\n');
        let classMatch = firstLineText.match(regex_utils_1.findClassRegex);
        if (!classMatch)
            return undefined;
        let className = classMatch[1];
        let currentText = '';
        for (let i = 0; i < lines.length; i++) {
            let lineText = lines[i];
            currentText += lineText + '\n';
            let matchOpen = lineText.match(this.openRegExp);
            let matchClose = lineText.match(this.closeRegExp);
            this.incrementOpen(matchOpen != null ? matchOpen.length : 0);
            this.incrementClose(matchClose != null ? matchClose.length : 0);
            if (currentText.includes('StatefulWidget') && !currentText.includes(`extends State<${className}>`)) {
                endLine++;
            }
            else if (this.isDirty()) {
                endLine++;
            }
            else {
                endLine++;
                classRange = new vscode.Range(startLine, 0, endLine, 0);
                let result = document.getText(classRange);
                break;
            }
        }
        return classRange;
    }
}
exports.FlutterOpenCloseFinder = FlutterOpenCloseFinder;
//# sourceMappingURL=open_close_finder.js.map