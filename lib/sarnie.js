
var http          = require('http'),
    io            = require('socket.io'),
    fs            = require('fs'),
    sys           = require('sys'),
    child_process = require('child_process');

var staticFiles = {
    '/'                 : 'static/index.html',
    '/js/sarnie.js'     : 'static/sarnie.js',
    '/js/socket.io.js'  : 'ext/Socket.IO/socket.io.js',
    '/js/smoothie.js'   : 'ext/smoothie/smoothie.js',
    '/js/underscore.js' : 'ext/underscore/underscore-min.js',
    '/css/style.css'    : 'static/style.css'
};

function getMimeType (filename) {
    return /\.js$/.test(filename)   ? 'text/javascript' :
           /\.html$/.test(filename) ? 'text/html' :
           /\.css$/.test(filename)  ? 'text/css' :
               'application/octet-stream';
}

function isText (filename) {
    return /\.(?:html|js|css)$/.test(filename);
}

var server = http.createServer(function (req, res) {
    if (req.method === 'GET' && req.url in staticFiles) {  
        var mimeType = getMimeType(staticFiles[req.url]),
            text     = isText(staticFiles[req.url]);
        fs.readFile(__dirname + '/../' + staticFiles[req.url], isText ? 'utf8' : null, function (err, data) {        
            if (err) {
                res.writeHead(500, {'Content-Type' : 'text/plain'});
                res.write('' + err);
            }
            else {
                res.writeHead(200, {'Content-Type' :  mimeType + (isText ? '; charset=utf-8' : '')});
                res.write(data);
            }
            res.end();
        });
    }
    else {
        res.writeHead(404, {'Content-Type': 'text/plain'});
        res.write('Not Found');
        res.end();
    }
});


function sar (handler) {
    var sar = child_process.spawn("/usr/bin/sar", ["-A", "2", "0"]),
        buffer = "",
        stage  = 1;

    function emit (lines) {
        var data = lines.map(function (line) {
            var fields = line.split(/\s+/),
                time   = fields.shift(),
                pm     = fields.shift() === "PM",
                hms    = time.split(/:/);
            if (pm) {
                hms[0] += 12;
            }
            for (var i = 0; i < 3; i++) {
                hms[i] = hms[i].replace(/^0/, "");
            }
            var date = new Date();
            date.setHours(hms[0]);
            date.setMinutes(hms[1]);
            date.setSeconds(hms[2]);
            fields.unshift(date.getTime());
            return fields;
        });
        var headers = data.shift();
        headers.shift();
        headers = headers.map(function (header) {
            return header.replace(/\W/g, "");
        });
        var result = {};
        for (var i = 0, l = data.length; i < l; i++) {
            if (! result.time) {
                result.time = data[i].shift();
            }
            else {
                data[i].shift();
            }
        }

        if (data.length === 1) {
            result.data = {};
            for (var i = 0, l = data[0].length; i < l; i++) {
                result.data[headers[i]] = data[0][i];
            }
        }
        else {
            var name = headers.shift();
            result[name] = {};
            for (var i = 0, l = data.length; i < l; i++) {
                var key = data[i].shift();
                result[name][key] = {};
                for (var j = 0, jl = headers.length; j < jl; j++) {
                    result[name][key][headers[j]] = data[i][j];
                }
            }
        }
        return result;
    }
    
    sar.stdout.on('data', function (data) {
        buffer += data;
        if (stage === 1) {
            var headerMatch = buffer.match(/^(?:[^\n]*\n){2}/);
            if (headerMatch) {
                buffer = buffer.substr(headerMatch[0].length);
                stage = 2;
            }
        }
        if (stage === 2) {
            do {
                var blockPattern = /^((?:[^\n]+\n)+)\n/,
                    match        = buffer.match(blockPattern);
                if (match) {
                    buffer = buffer.substr(match[0].length);
                    var lines = match[1].split("\n");
                    lines.pop();
                    handler(emit(lines));
                }
            } while (match);
        }
    });
    sar.stderr.on('data', function (data) {
        sys.debug('error: ' + data);
        exit(1);
    });
}

socket = io.listen(server);
socket.on('connection', function (client) {
    sar(function (e) {
        socket.broadcast(JSON.stringify(e));
    });
});

server.listen(8928);
