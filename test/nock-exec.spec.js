var cmd = 'foo',
    expect = require('expect.js'),
    nockExec = require('../nock-exec'),
    os = require('os'),
    sinon = require('sinon'),
    exec;

describe('nock exec', function () {
  beforeEach(function () {
    exec = require('child_process').exec;
  });

  it('should reply with a code and message', function (done) {
    nockExec(cmd)
      .reply(100, 'foo');

    exec(cmd, function (err, stdout, stderr) {
      expect(err.code).to.be(100);
      done();
    });
  });

  it('should output a message', function (done) {
    nockExec(cmd)
      .out('foo');

    exec(cmd, function (err, stdout, stderr) {
      expect(stdout).to.be('foo');
      done();
    });
  });

  it('should output a messages over lines', function (done) {
    nockExec(cmd)
      .outputLine('foo')
      .outputLine('bar')
      .outputLine('foobar');

    exec(cmd, function (err, stdout, stderr) {
      expect(stdout).to.be('foo' + os.EOL + 'bar' + os.EOL + 'foobar' + os.EOL);
      done();
    });
  });

  it('should output an error message', function (done) {
    nockExec(cmd)
      .err('foo');

    exec(cmd, function (err, stdout, stderr) {
      expect(stderr).to.be('foo');
      done();
    });
  });

  it('should output an error message over lines', function (done) {
    nockExec(cmd)
      .errorLine('foo')
      .errorLine('bar')
      .errorLine('foobar');

    exec(cmd, function (err, stdout, stderr) {
      expect(stderr).to.be('foo' + os.EOL + 'bar' + os.EOL + 'foobar' + os.EOL);
      done();
    });
  });

  it('should only mock once', function (done) {
    nockExec(cmd)
      .once()
      .err('foo');

    exec(cmd, function (err, stdout, stderr) {
      expect(stderr).to.be('foo');

      exec(cmd, function (err, stdout, stderr) {
        expect(err.code).to.be(127);
        expect(stderr).to.contain('foo');
        expect(stderr).to.contain('not found');
        done();
      });
    });
  });

  it('should output an exit code', function (done) {
    nockExec(cmd)
      .exit(100);

    exec(cmd, function (err, stdout, stderr) {
      expect(err.code).to.be(100);
      done();
    });
  });

  it('should accept options', function (done) {
    nockExec(cmd)
      .exit(100);

    exec(cmd, {}, function (err, stdout, stderr) {
      expect(err.code).to.be(100);
      done();
    });
  });

  it('should run stdout and stderr function callbacks', function (done) {
    var errSpy = sinon.spy(),
        outSpy = sinon.spy();

    nockExec(cmd)
      .out(1)
      .out(outSpy)
      .err(2)
      .err(errSpy)
      .exit(0);

    exec(cmd, function (err, stdout, stderr) {
      expect(outSpy.called).to.be.ok();
      expect(errSpy.called).to.be.ok();
      done();
    });
  });

  it('should throw an error if already exited', function (done) {
    var instance = nockExec(cmd)
      .exit(100);

    exec(cmd, function (err, stdout, stderr) {
      instance.out('foo');

      exec(cmd, function (err, stdout, stderr) {
        expect(err.message).to.contain('has already exited');
        done();
      });
    });
  });
});
