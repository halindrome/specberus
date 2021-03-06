
// SotD
//  must start with
//      <p><em>This section describes the status of this document at the time of its publication.
//      Other documents may supersede this document. A list of current W3C publications and the
//      latest revision of this technical report can be found in the
//      <a href="http://www.w3.org/TR/">W3C technical reports index</a> at http://www.w3.org/TR/.</em></p>


exports.name = "sotd.supersedable";
exports.check = function (sr, done) {
    var $sotd = sr.getSotDSection();
    if (!$sotd || !$sotd.length) {
        sr.error(exports.name, "no-sotd");
        return done();
    }
    
    var $em = $sotd.filter("p").find("> em").first();
    if (!$em.length) $em = $sotd.find("p").find("> em").first();
    var txt = sr.norm($em.text())
    ,   wanted = "This section describes the status of this document at the time of its " +
                 "publication. Other documents may supersede this document. A list of current " +
                 "W3C publications and the latest revision of this technical report can be found " +
                 "in the W3C technical reports index at http://www.w3.org/TR/."
    ,   $a = $em.find("a[href='http://www.w3.org/TR/']")
    ;
    if (txt !== wanted) sr.error(exports.name, "no-sotd-intro");
    if (!$a.length) sr.error(exports.name, "no-sotd-tr");
    done();
};
