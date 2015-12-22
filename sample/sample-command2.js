var exec = require('child_process').exec;
var os = require('os');

var dir = os.tmpdir();
var cmdLine = 'dir ' + dir;

function start(testNo, args) {
    command = exec(cmdLine+args);
    command.stdin.end();

    command.stdout.on('data', function (data) {
        console.log(testNo + ': got listing data:' + data);
    });

    command.on('error', function (err) {
        console.log(testNo + ': ERROR: Listing ' + dir);
        console.log(err);
    });

    command.on('exit', function (code) {
        console.log(testNo + ':-- done listing ' + dir + ' / exit=' + code);
    });
}

function startWithCallback() {
    command = exec(cmdLine, function(error, stdout, stderr) {
        console.log('Listing ' + dir);
        console.log(stdout);
        console.log(stderr);
        if (error) {
            console.error('ERROR:' + error);
        }
        console.log('-- done listing ' + dir);
    });
}

exports.start = start;
exports.startWithCallback = startWithCallback;
exports.cmdLine = cmdLine;
