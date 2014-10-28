/*jshint es5: true*/

// The Express and Socket.io server interface
var express = require("express")
,   app = express()
,   server = require("http").createServer(app)
,   io = require("socket.io").listen(server)
,   Specberus = new require("./lib/validator").Specberus
,   l10n = require("./lib/l10n")
,   util = require("util")
,   events = require("events")
,   urlSafety = require("safe-url-input-checker")
,   version = require("./package.json").version
,   expressRest = require("express-rest")
,   rest = expressRest(app) /* , {
      serializers: {
        'text/html': {
          deserialize: function(req, rest, next) {
            req.body = object;
            next();
          }
        }
        , serialize: function(req, rest, next) {
            rest.send(buffer);
            next();
          }
        }
    }) */
,   profiles = {}
,   pending = {}
;
("FPWD FPLC WD LC CR PR PER REC RSCND " +
"CG-NOTE FPIG-NOTE IG-NOTE FPWG-NOTE WG-NOTE " +
"MEM-SUBM TEAM-SUBM").split(" ")
         .forEach(function (p) {
             profiles[p] = require("./lib/profiles/" + p);
         })
;

// middleware
app.use(express.logger());
app.use(express.compress());
app.use(express.json());
app.use(express.static("public"));

rest.get('/api/version', function(req, rest) {
  rest.ok('Specberus version ' + version);
});

rest.get('/api/request/:url', function(req, rest) {
  var url = req.params.url;
  if (pending[url]) {
    rest.ok('Spec at ' + url + ' is pending validation.');
  }
  else {
    pending[url] = true;
    processSpec(url);
    // rest.created('/ticket/' + url);
    rest.ok('Spec at ' + url + ' added to the queue.');
  }
});

function processSpec(url) {
  setInterval(function() {
        new Specberus().validate({
          url:                url
        , profile:            require('./lib/profiles/REC')
        , events:             new Sink()
/*        , skipValidation:     data.skipValidation
        , noRecTrack:         data.noRecTrack
        , informativeOnly:    data.informativeOnly
        , processDocument:    data.processDocument */
        });
        delete(pending[url]);
    }
  , 10000 * Math.random());
}

/* rest.put('/api/food/:id', function(req, rest) {
  records[req.params.id] = req.body;
  return rest.accepted('/api/food/' + encodeURI(req.params.id));
});

rest.post('/api/food', function(req, rest) {
  records.push(req.body);
  rest.created('/api/food/' + (records.length - 1));
});

rest.delete('/api/food/:id', function(req, rest) {
  delete records[req.params.id];
  rest.gone();
}) */

// listen up
server.listen(process.env.PORT || 80);

// VALIDATION PROTOCOL
//  Client:
//      validate, { url: "document", profile: "WD", skipValidation: skipValidation }
//  Server:
//      handshake, { version: "x.y.z"}
//      exception, { message: "blah", code: "FOO"} (for system errors)
//      start { rules: [rule names]}
//      ok, { name: "test name" }
//      warning, { name: "test name", code: "FOO" }
//      error, { name: "test name", code: "FOO" }
//      done, { name: "test name" }
//      finished
function Sink () {}
util.inherits(Sink, events.EventEmitter);

io.sockets.on("connection", function (socket) {
    socket.emit("handshake", { version: version });
    socket.on("validate", function (data) {
        if (!data.url) return socket.emit("exception", { message: "URL not provided." });
        if (!data.profile) return socket.emit("exception", { message: "Profile not provided." });
        if (!profiles[data.profile]) return socket.emit("exception", { message: "Profile does not exist." });
        var validator = new Specberus()
        ,   sink = new Sink
        ,   profile = profiles[data.profile]
        ;
        socket.emit("start", {
            rules:  (profile.rules || []).map(function (rule) { return rule.name; })
        });
        sink.on("ok", function (type) {
            socket.emit("ok", { name: type });
        });
        sink.on("err", function (type, data) {
            data.name = type;
            data.message = l10n.message(validator.config.lang, type, data.key, data.extra);
            socket.emit("error", data);
        });
        sink.on("warning", function (type, data) {
            data.name = type;
            data.message = l10n.message(validator.config.lang, type, data.key, data.extra);
            socket.emit("warning", data);
        });
        sink.on('info', function (type, data) {
            data.name = type;
            data.message = l10n.message(validator.config.lang, type, data.key, data.extra);
            socket.emit('info', data);
        });
        sink.on("done", function (name) {
            socket.emit("done", { name: name });
        });
        sink.on("end-all", function () {
            socket.emit("finished");
        });
        sink.on("exception", function (data) {
            socket.emit("exception", data);
        });
        urlSafety.checkUrlSafety(data.url, function(err, res) {
            if(!res) {
                socket.emit("exception", {message: "error while resolving " + data.url + " Check the spelling of the host, the protocol (http, https) and ensure that the page is accessible from the public Internet."});
            }
            else {
                try {
                    validator.validate({
                        url:                res
                    ,   profile:            profile
                    ,   events:             sink
                    ,   skipValidation:     data.skipValidation
                    ,   noRecTrack:         data.noRecTrack
                    ,   informativeOnly:    data.informativeOnly
                    ,   processDocument:    data.processDocument
                    });
                }
                catch (e) {
                    socket.emit("exception", { message: "Validation blew up: " + e });
                    socket.emit("finished");
                }
            }
        });

    });
});
