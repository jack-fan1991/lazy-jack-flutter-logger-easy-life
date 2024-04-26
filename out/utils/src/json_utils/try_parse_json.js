"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tryParseJson = void 0;
const logger_1 = require("../logger/logger");
function tryParseJson(text) {
    try {
        return JSON.parse(text);
    }
    catch (_) {
        (0, logger_1.logError)(`JSON parse error`, true);
        throw _;
    }
}
exports.tryParseJson = tryParseJson;
//# sourceMappingURL=try_parse_json.js.map