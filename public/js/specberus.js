/*global io*/

// TODO:
//  include socket.io
//  grab on submit and cancel, get values
//  client-side protocol
//  show errors

jQuery.extend({
    getQueryParameters : function(str) {
        return (str || document.location.search).replace(/(^\?)/,'').split("&").map(function(n){return n = n.split("="),this[n[0]] = n[1],this}.bind({}))[0];
    }
});

(function ($) {
    var $url = $("#url")
    ,   $profile = $("#profile")
    ,   $skipValidation = $("#skipValidation")
    ,   $noRecTrack = $("#noRecTrack")
    ,   $informativeOnly = $("#informativeOnly")
    ,   $processDocument = $("#processDocument")
    ,   $alert = $("#alert")
    ,   $results = $("#results")
    ,   $resultsBody = $results.find("table")
    ,   $progressContainer = $("#progressBar")
    ,   $progress = $progressContainer.find(".progress-bar")
    ,   $progressStyler = $progress.parent()
    ,   socket = io.connect(location.protocol + "//" + location.host)
    ,   $summary = $("#summary")
    ,   rows = {}
    ,   done = 0
    ,   total = 0
    ,   summary = {}
    ,   friendlyNames = {headers: 'Headers'
        , style: 'Style'
        , sotd: 'Status of this document'
        , structure: 'Structure'
        , links: 'Links'
        , heuristic: 'Heuristics'
        , validation: 'Validation'
        }
    ,   levels = {done: 0, info: 1, warning: 2, error: 3}
    ,   icons = {done: '\u2714', info: '\u2714', warning: '\u2714', error: '\u2718'}
    ;

    // handshake
    socket.on("handshake", function (data) {
        console.log("Using version", data.version);
        $(".navbar-brand small").remove();
        $("<small></small>")
            .css({ fontSize: "0.5em", opacity: "0.5" })
            .text(" (" + data.version + ")")
            .appendTo($(".navbar-brand"))
            ;
    });

    // show errors
    function showError (string) {
        $alert.clone()
              .find("span")
                .text(string)
              .end()
              .removeClass("hide")
              .insertAfter($alert);
    }

    // clear errors
    function clearError () {
        $('.alert').filter(":not('.hide')")
                   .remove();
    }

    // show progress
    function progress () {
        $progress.attr({
            "aria-valuenow":    done
        ,   "aria-valuemax":    total
        ,   "style":            "width: " + (total ? (done/total)*100 : 0) + "%"
        });
        $progress.text(done + '/' + total);
    }

    // validate
    function validate (options) {
        $resultsBody.find("tr:not(.h)").remove();
        socket.emit("validate", {
            url:                decodeURIComponent(options.url)
        ,   profile:            options.profile
        ,   skipValidation:     options.skipValidation
        ,   noRecTrack:         options.noRecTrack
        ,   informativeOnly:    options.informativeOnly
        ,   processDocument:    options.processDocument
        });
    }

    // terminate validation
    function endValidation () {
        $progressContainer.hide();
    }

    // handle results
    function row (id, wording) {
        if (rows[id]) return rows[id];
        rows[id] =  $("<tr><td id=\"section-" + id.split('.')[0] + "\" class='status'></td><td class='test'></td><td class='results'></td></tr>")
                        .find(".test")
                          .text(id) // +
                          // '<a href="#" tabindex="0" class="btn btn-lg btn-danger" data-toggle="popover" data-trigger="focus" title="Dismissible popover" data-content="And here\'s some amazing content. It\'s very engaging. Right?">Dismissible popover</a>')
                        .end()
                        .appendTo($resultsBody)
        ;
        // $('a.foo:last').popover({'placement': 'right', 'trigger': 'focus', 'content': wording, 'html': 'true'});
        // $('a.foo:last').popover({content: wording});
        // $('a.btn').popover({content: wording});
        return rows[id];
    }
    var type2class = {
        error:      "text-danger"
    ,   warning:    "text-warning"
    ,   info:       "text-info"
    };
    var type2bgclass = {
        error:      "bg-danger"
    ,   warning:    "bg-warning"
    ,   info:       "bg-info"
    };
    function addMessage ($row, type, msg, wording) {
        var $ul = $row.find("ul." + type, wording);
        if (!$ul.length) $ul = $("<ul></ul>").addClass(type).appendTo($row.find(".results"));
        $('<span class="' + type2bgclass[type] + '">' + type + '</span> ').prependTo($("<li></li>")
            .addClass(type2class[type])
            .html(' ' + msg)
            .appendTo($ul));
    }

    // protocol
    socket.on("exception", function (data) {
        console.log("exception", data);
        showError("Exception: " + data.message);
        endValidation();
    });
    socket.on("start", function (data) {
        console.log("start", data);
        rows = {};
        for (var i = 0, n = data.rules.length; i < n; i++) row(data.rules[i]);
        done = 0;
        total = data.rules.length;
        $progressStyler.addClass("active progress-striped");
        progress();
        $progressContainer.fadeIn();
        $results.fadeIn();
        $summary.show();
    });
    socket.on("ok", function (data) {
        console.log("ok", data);
        row(data.name)
            .find(".status")
                .append("<span class='text-success'>\u2714 <span class='sr-only'>ok</span></span>")
            .end()
            .find(".results")
                .prepend("<span class='text-success'>Ok</span>")
            .end();
    });
    socket.on("warning", function (data) {
        updateSummary(data, 'warning');
        addMessage(row(data.name), "warning", data.message, data.wording);
    });
    socket.on('info', function (data) {
        updateSummary(data, 'info');
        addMessage(row(data.name), 'info', data.message, data.wording);
    });
    socket.on("error", function (data) {
        updateSummary(data, 'error');
        var $row = row(data.name);
        addMessage(row(data.name), "error", data.message, data.wording);
        if (!$row.find(".status .text-danger").length) {
            $row
                .find(".status")
                    .append("<span class='text-danger'>\u2718 <span class='sr-only'>fail</span></span>")
                .end();
        }
    });
    socket.on("done", function (data) {
        updateSummary(data, 'done');
        done++;
        progress();
    });
    socket.on("finished", function () {
        console.log("END");
        $progressStyler.removeClass("active progress-striped");
        $progressContainer.hide();
        $progress.text('Done!');
        attachCustomScroll();
        // endValidation();
    });

    // handle the form
    $("#options").submit(function () {
        clearError();
        var url = $url.val()
        ,   profile = $profile.val()
        ,   skipValidation = $skipValidation.is(":checked") || false
        ,   noRecTrack = $noRecTrack.is(":checked") || false
        ,   informativeOnly = $informativeOnly.is(":checked") || false
        ,   processDocument = $processDocument.find('label.active').attr('id')
        ;
        if (!url) showError("Missing URL parameter.");
        if (!profile) showError("Missing profile parameter.");
        var options = {
                          "url"             : url
                        , "profile"         : profile
                        , "skipValidation"  : skipValidation
                        , "noRecTrack"      : noRecTrack
                        , "informativeOnly" : informativeOnly
                        , "processDocument" : processDocument
                      };
        validate(options);
        var newurl = document.URL.split('?')[0] + "?" + $.param(options)
        history.pushState(options, url + " - " + profile, newurl);
        return false;
    });

    function updateSummary(data, level) {

      var id
      ,   status;

      if(data && data.name) {
        id = data.name.split('.')[0];

        if(summary.hasOwnProperty(id)) {
          status = summary[id];
        }
        else {
          status = {current: -1, count: 0};
          summary[id] = status;
          $('<p id="link-' + id + '"><span class="icon"></span> <a href="#section-'
            + id + '">' + friendlyNames[id] + ' <span class="badge"></span></a></p>')
            .appendTo($summary.find('.panel-body'));
        }

        if(levels[level] > status['current']) {
          summary[id]['current'] = levels[level];
          $summary.find('p#link-' + id).find('> span.icon').text(icons[level]);
        }

        if(levels[level] > 2) {
          summary[id]['count'] = summary[id]['count'] + 1;
          $summary.find('p#link-' + id + ' > a > span.badge').text(status['count'] + '');
        }

      }

    }

    function attachCustomScroll() {

      $summary.find('a').click(function() {
        var location = $(this).attr("href")
        ,   offset = $(location).offset().top;
        $("body").scrollTop(offset-50);
        return false;
      });

    }

    function setFormParams(options) {
        if (options.url) $url.val(decodeURIComponent(options.url));
        if (options.profile) $profile.val(options.profile);
        if (options.skipValidation === "true") $skipValidation.prop('checked', true);
        if (options.noRecTrack === "true") $noRecTrack.prop('checked', true);
        if (options.informativeOnly === "true") $informativeOnly.prop('checked', true);
        if (options.processDocument) {
          $processDocument.find('label').removeClass('active');
          $processDocument.find('label#' + options.processDocument).addClass('active');
        }
    }

    var options = $.getQueryParameters();
    setFormParams(options);
    if (options.url && options.profile) validate(options);

    window.addEventListener('popstate', function(event) {
        var options = event.state;
        if (options == null) return;
        setFormParams(options);
        validate(options);
    })

}(jQuery));

