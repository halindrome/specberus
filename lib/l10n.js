
var messages = {
    es_ES: require("./l10n-es_ES").messages
,   en_GB: require("./l10n-en_GB").messages
,   selectors: require("./l10n-wording").selectors
,   wording: require("./rules")
};

exports.message = function (lang, rule, key, extra) {
    if (!messages[lang]) return "@@@No such language: " + lang + "@@@";
    var l10n = messages[lang][rule + "." + key];
    if (!l10n) return "@@@No such entry: " + rule + "." + key + "@@@";
    if (extra) {
        return l10n.replace(/\$\{([^\}]+)\}/g, function (m, p1) {
            if (extra.hasOwnProperty(p1)) return extra[p1];
            return "@@@No such data: ${" + p1 + "}@@@";
        });
    }
    return l10n;
};

exports.wording = function (lang, rule, key) {
    if (!messages.selectors) return "@@@Selectors not loaded@@@";
    if (!messages.wording) return "@@@Wording not loaded@@@";
    var selector = messages.selectors[rule + "." + key];
    if (!selector) return "@@@No such entry: " + rule + "." + key + "@@@";
    return eval('messages.wording' + selector);
};

