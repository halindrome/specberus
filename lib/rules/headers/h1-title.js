
// must have h1, with same content as title

exports.name = "headers.h1-title";
exports.check = function (sr, done) {
    var $title = sr.$("head > title").first()
    ,   $h1 = sr.$("body div.head h1").first()
    ;
    if (!$title.length || !$h1.length || sr.norm($title.text()) !== sr.norm($h1.text()))
        sr.error(this.name, "title");
    done();
};
