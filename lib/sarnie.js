
var http          = require('http'),
    io            = require('socket.io'),
    fs            = require('fs'),
    sys           = require('sys'),
    child_process = require('child_process');

var server = http.createServer(function (req, res) {
    if (req.method === 'GET' && req.url === '/') {  
        fs.readFile(__dirname + '/../static/index.html', 'utf8', function (err, data) {        
            if (err) {
                res.writeHead(500, {'Content-Type' : 'text/plain'});
                res.write('' + err);
            }
            else {
                res.writeHead(200, {'Content-Type' : 'text/html; charset=utf-8'});
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

socket = io.listen(server);
socket.on('connection', function (client) {
    var sar = child_process.spawn("sar -A 1 0");
    sar.stdout.on('data', function (data) {
        sys.debug(data);
    });

    client.on('message', function (data) {
        sys.debug('client sent: ' + data);
    });
    client.on('disconnect', function () {
        sys.debug('client disconnected');
    });
});

server.listen(8000);
