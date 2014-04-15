//export some chai stuff
global.chai = require('chai');
global.expect = global.chai.expect;

//export some sinon
global.sinon = require('sinon');
global.chai.use(require('sinon-chai'));
