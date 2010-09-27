$(function(){
    var socket = new io.Socket(location.hostname, {
        port: location.port
    });

    var graphs = [];

    function addGraph (id, title, measures, initial) {

        $('#measures').append(
            '<li id="' + id + '">' +
            '<h2>' + title + '</h2>' +
            '<canvas width="400" height="100"></canvas>' +
            '<ul class="key"></ul>' +
            '</li>'
        );

        var item = $("#" + id),
            key  = item.find(".key");

        for (var i = 0, l = measures.length; i < l; i++) {
            key.append("<li style=\"border-left: 3px solid " + measures[i].stroke +  "\">" + measures[i].label + "</li>");
        }

        var smoothie = new SmoothieChart({
            millisPerPixel: 100,
            minValue: 0,
            grid: { strokeStyle:'rgb(125, 125, 125)', fillStyle:'rgb(255, 255, 255)',
                lineWidth: 1, millisPerLine: 5000, verticalSections: 6, },
            labels: { fillStyle:'rgb(60, 0, 0)' }
        });
        smoothie.streamTo(item.find("canvas").get(0), 1000);
        graphs.push({
            measures: measures.map(function (measure) {
                var series = new TimeSeries();
                smoothie.addTimeSeries(
                    series,
                    { strokeStyle: measure.stroke, fillStyle: measure.fill, lineWidth: 3 }
                );
                if (measure.initialValue) {
                    series.append((new Date()).getTime(), measure.initialValue);
                }
                return {
                    measure : measure.value,
                    series  : series
                };
            })
        });
    }

    function getValue (path) {
        if (path.length === 0) {
             return new Function("data", "return data");
        }
        var parts = path.split("."),
            cond  = [];
        for (var i = 0, l = parts.length; i < l; i++) {
            cond.push("data." + parts.slice(0, i + 1).join("."));
        }
        return new Function ("data", "return " + cond.join("&&"));
    }

    function measure (stroke, fill, label, value, initialValue) {
        return {
            stroke       : stroke,
            fill         : fill,
            label        : label,
            value        : getValue(value),
            initialValue : initialValue
        };
    }

    addGraph("cpu", "CPU (all)", [
        measure("rgb(0, 255, 0)", "rgba(0, 255, 0, 0.4)", "idle", "CPU.all.idle", 100),
        measure("rgb(255, 0, 0)", "rgba(255, 0, 0, 0.4)", "user", "CPU.all.user"),
        measure("rgb(0, 0, 255)", "rgba(0, 0, 255, 0.4)", "system", "CPU.all.system")
    ]);

    addGraph("ldavg", "Load Average", [
        measure("rgb(0, 255, 0)", "rgba(0, 255, 0, 0.4)", "load avg. (1)", "data.ldavg1"),
        measure("rgb(255, 0, 0)", "rgba(255, 0, 0, 0.4)", "load avg. (5)", "data.ldavg5"),
        measure("rgb(0, 0, 255)", "rgba(0, 0, 255, 0.4)", "load avg. (15)", "data.ldavg15")
    ]);

    addGraph("io", "Input/Output", [
        measure("rgb(0, 255, 0)", "rgba(0, 255, 0, 0.4)", "read transfers per second", "data.rtps"),
        measure("rgb(255, 0, 0)", "rgba(255, 0, 0, 0.4)", "write transfers per second", "data.wtps")
    ]);

    addGraph("procs", "Process Creation", [
        measure("rgb(0, 255, 0)", "rgba(0, 255, 0, 0.4)", "processes created per second", "data.procs")
    ]);

    addGraph("paging", "Paging", [
        measure("rgb(0, 0, 255)", "rgba(0, 0, 255, 0.4)", "kb paged in per second", "data.pgpgins"),
        measure("rgb(0, 255, 0)", "rgba(0, 255, 0, 0.4)", "kb paged out per second", "data.pgpgouts")
    ]);

    addGraph("memory", "Memory", [
        measure("rgb(0, 0, 255)", "rgba(0, 0, 255, 0.4)", "memory used (%)", "data.memused", 100)
    ], [0, 100]);

    addGraph("sockets", "Sockets", [
        measure("rgb(0, 0, 255)", "rgba(0, 0, 255, 0.4)", "total sockets", "data.totsck")
    ], [0, 100]);

    var dumped = {};

    function dump (pattern, data, times) {
        var value = getValue(pattern)(data);
        if (value) {
            if (! (pattern in dumped)) {
                dumped[pattern] = 0;
            }
            if (dumped[pattern]++ < times) {
                console.log(pattern, value);
            }
        }
    }

    socket.on('message', function(data){
        data = JSON.parse(data);
        //dump("", data, 100);
        for (var i = 0, l = graphs.length; i < l; i++) {
             for (var j = 0, jl = graphs[i].measures.length; j < jl; j++) {
                var value = graphs[i].measures[j].measure(data);
                if (value) {
                    value = parseFloat(value);
                    graphs[i].measures[j].series.append((new Date()).getTime(), value);
                }
            }
        }
    });

    socket.connect();
});

