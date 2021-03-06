// In order to manage code like:
//    var exec = require('child_process').exec;
// need to check around
//    var proxyquire =  require('proxyquire');

var cp = require('child_process');
var Stream = require('stream');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var os = require('os');

var CommandMatchStrategy = {
    STRING : "STRING",
    REGEX : "REGEX"
};

Object.freeze(CommandMatchStrategy);

util.inherits(DirectDuplex, Stream.Duplex);
function DirectDuplex(options) {
    if (!(this instanceof DirectDuplex))
        return new DirectDuplex(options);
    Stream.Duplex.call(this, options);
    this._buf = new Buffer('');
    this._cache = new Buffer('');
}

DirectDuplex.prototype._read = function(size) {
    var s = this._buf.toString();
    this._buf = new Buffer('');
    return s;
};

DirectDuplex.prototype.cache = function() {
    return this._cache.toString();
};

DirectDuplex.prototype._write = function(chunk, encoding, callback) {
    var buffer = (Buffer.isBuffer(chunk)) ? chunk :  new Buffer(chunk, encoding);
    this._buf = Buffer.concat([this._buf, buffer]);
    this._cache = Buffer.concat([this._cache, buffer]);
    if (typeof callback === 'function') {
        callback();
    }
    this.emit('data', chunk.toString());
};

util.inherits(ProcessMock, EventEmitter);
function ProcessMock(command) {
    if (!(this instanceof ProcessMock))
        return new ProcessMock(command);
    EventEmitter.call(this);
    this._command = command;
    this._actions = [];
    this._once = false;
    this._exited = false;
    this._callback = undefined;
    this._commandMatchStrategy = CommandMatchStrategy.STRING;
    
}

ProcessMock.prototype._run = function(options, callback) {
    var self = this;
    var err;
    this._callback = callback;
    this.stdout = new DirectDuplex();
    this.stderr = new DirectDuplex();
    this.stdin = new DirectDuplex();
    process.nextTick(function() {
        self._exited = false;
        this._actions.forEach(function (action) {
            if (self._exited) {
                return err = new Error('Command ' + self._command + ' has already exited');
            }
            switch (action.op) {
                case 'out':
                    if (typeof action.arg === 'function') {
                        action.arg(self.stdout);
                    }
                    else {
                        self.stdout.write('' + action.arg);
                    }
                    break;
                case 'err':
                    if (typeof action.arg === 'function') {
                        action.arg(self.stderr);
                    }
                    else {
                        self.stderr.write('' + action.arg);
                    }
                    break;
                case 'exit':
                    self._exited = true;
                    self.emit('exit', action.arg);
                    if (action.arg !== 0){                    
                      err = new Error('Exited with code ' + action.arg);
                      err.code = action.arg;
                    }
                    else{
                      err = null;
                    }
                    break;
            }
        });
        if (typeof callback === 'function') {
            var stdout = self.stdout.cache();
            var stderr = self.stderr.cache();
            callback(err, stdout, stderr);
        }
    }.bind(this));
    return this;
};

ProcessMock.prototype.reply = function(exitCode, output) {
    this._actions.push({op: 'out', arg: output});
    this._actions.push({op: 'exit', arg: exitCode});
    return this;
};

ProcessMock.prototype.out = function(output) {
    this._actions.push({op: 'out', arg: output});
    return this;
};

ProcessMock.prototype.outputLine = function(output) {
    this._actions.push({op: 'out', arg: output + os.EOL});
    return this;
};

ProcessMock.prototype.err = function(output) {
    this._actions.push({op: 'err', arg: output});
    return this;
};

ProcessMock.prototype.errorLine = function(output) {
    this._actions.push({op: 'err', arg: output + os.EOL});
    return this;
};

ProcessMock.prototype.once = function() {
    this._once = true;
    return this;
};

ProcessMock.prototype.regex = function() {
    this._commandMatchStrategy = CommandMatchStrategy.REGEX;
    return this;
};

ProcessMock.prototype.exit = function(code) {
    this._actions.push({op: 'exit', arg: code});
    return this;
};

ProcessMock.prototype.ran = function() {
    return this._exited;
};

var interceptors = {};
var exec = null;

function overrideExec(command /*, options, callback*/) {
    var options, callback;
    if (typeof arguments[1] === 'function') {
        options = undefined;
        callback = arguments[1];
    } else {
        options = arguments[1];
        callback = arguments[2];
    }
    
    var selectedCommand;
    
    // loop over each interceptor, work out if it matches the supplied command
    var matchedCommands = Object.keys(interceptors).filter(function(interceptCommand){
        switch(interceptors[interceptCommand]._commandMatchStrategy){
            case CommandMatchStrategy.STRING:
                return command === interceptCommand;
                break;
            case CommandMatchStrategy.REGEX:
                var regex = new RegExp(interceptCommand);
                return regex.test(command);
            default:
                throw ("Unexpected CommandMatchStrategy:"
                    + interceptors[interceptCommand]._commandMatchStrategy);
        }
    });
    
    // select the first matching one. Object.keys orders the command keys so it'll pick the first lexically I imagine
    // TODO: add an order added to introduce ordinality based on order of addition
    if (matchedCommands) {
      selectedCommand = matchedCommands[0];
    }
    
    if (selectedCommand) {
        var selectedInterceptor = interceptors[selectedCommand];
        if (selectedInterceptor._once) {
            delete interceptors[selectedInterceptor._command];
        }
        return selectedInterceptor._run(options, callback);
    }
    else {
        if (exec === null) {
            throw new Error('Cannot override exec before module initialization')
        }
        return exec(command, options, callback);
    }
}

function reset(){
  interceptors={};
}

function start() {
    if (exec !== null) {
        return;
    }
    exec = cp.exec;
    cp.exec = overrideExec;
}

function record(command) {
    interceptors[command] = new ProcessMock(command);
    return interceptors[command];
}

start();

var childProcessStub = {
    exec: function(command /*, options, callback*/) {
        return overrideExec.apply(this, arguments);
    }
};

module.exports = record;

/**
 * Usage:
 * var proxyquire =  require('proxyquire');
 * var nockExec =  require('nock-exec');
 * var myModuleUnderTest = proxyquire('my-module-under-test', {'child_process': nockExec.moduleStub});
 * @type {{exec: Function}}
 */
module.exports.moduleStub = childProcessStub;

module.exports.reset = reset;
