var cmd,
    expect = require('expect.js'),
    nockExec = require('../nock-exec'),
    os = require('os'),
    sinon = require('sinon'),
    exec, 
    nock;

describe('nock exec', function () {
  before(function () {
    exec = require('child_process').exec;
    nockExec.reset();
    cmd = 'foo';
  });
  
  describe('error codes', function() {
    before(function(){
      nock = nockExec(cmd);
    });
    describe('when the code is 0', function(){
      before(function(){
        nock.exit(0);
      });
      it('err is undefined', function(done){
        exec(cmd, function (err, stdout, stderr) {
           expect(err).to.be(null);
           done();
        });
      }); 
    });
    describe('when the code is non 0', function(){
      before(function(){
        nock.exit(1);
      });
      it('err is not undefined', function(done){
        exec(cmd, function (err, stdout, stderr) {
           expect(err).not.to.be(null);
           done();
        });
      }); 
    });
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
  
  describe("running once", function(){
    describe("when once is set", function(){
      
      before(function(){
        nockExec(cmd)
          .once()
          .err('foo')
          .exit(0);
      });
      
      it('only mocks once', function (done) {
        

        exec(cmd, function (err, stdout, stderr) {
          expect(stderr).to.be('foo');

          exec(cmd, function (err, stdout, stderr) {
            expect(stderr).not.to.be('foo');
            done();
          });
        });
      });
    });
    
    describe ("when once is not set", function(){
      before(function(){
        nockExec(cmd)
          .err('foo')
          .exit(0);
      });
      it('mocks multiple times', function (done) {
        exec(cmd, function (err, stdout, stderr) {
          expect(stderr).to.be('foo');

          exec(cmd, function (err, stdout, stderr) {
            expect(stderr).to.be('foo');
            done();
          });
        });
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

  it('should report if it has been run', function (done) {
    var instance = nockExec(cmd)
      .exit(100);

    exec(cmd, function (err, stdout, stderr) {
      expect(instance.ran()).to.be.ok();
      done();
    });
  });

  it('should report if it has not been run', function (done) {
    var instance = nockExec(cmd)
      .exit(100);

    exec('ls', function (err, stdout, stderr) {
      expect(instance.ran()).not.to.be.ok();
      done();
    });
  });
  
  describe("clearing mocks", function(){
    before(function(){
      var instance = nockExec(cmd)
      .exit(100);
    });
    it("does not retain mocks after clearing", function(done){
      nockExec.reset();
      exec(cmd, {}, function (err, stdout, stderr) {
        expect(err.code).not.to.be(100);
        done();
      });
    });
    
    
  
  });
  
  describe ('regular expression matching', function(){
    before(function(){
      var instance = nockExec(cmd+" bar.+")
        .regex()
        .out("foo")
        .exit(0);
    });
    describe ('when matching', function(){
      it('mocks the run', function(done){
        exec(cmd+" bard", function (err, stdout, stderr) {
          expect(stdout).to.be("foo");
          done();
        });
      });
      
    });
    
    describe ('when not matching', function(){
      it('doesn\'t mock the run', function(done){
        exec(cmd+" baz", function (err, stdout, stderr) {
          expect(stdout).not.to.be("foo");
          done();
        });
      });
    });
    
  });
});