var nockExec = require('./../nock-exec');
var sample = require('./sample-command2.js');

console.log('===== Take 1 : without nock-exec');
sample.start(1);
console.log('===== Take 2 : without nock-exec with args');
sample.start(2,' .');

var myOutput = 'This is a different output for the command\nNothing more to see here !';

console.log('===== Take 3 : with nock-exec');
nockExec(sample.cmdLine).out('Doh').outputLine('Dah').reply(2, myOutput);
sample.start(3);

console.log('===== Take 4 : with nock-exec and callback');
sample.startWithCallback();

console.log('===== Take 5 : with args not matching the callback');
sample.start(5,' .');

console.log('===== Take 6 : with args and a regex callback');
var regexOutput = 'This is the one that should display when there are any args';
nockExec(sample.cmdLine+" .").regex().reply(0, regexOutput);
sample.start(6," .");

console.log('===== Done');

