// test/coverage.js
var covererageOn = process.argv.some(function(arg) {
    return (/^--cover/).test(arg);
});

if (covererageOn) {
    exports.require = function(path) {
        var instrumentedPath = path.replace('/lib', '/lib-cov');
	
        try {
            require.resolve(instrumentedPath);
            return require(instrumentedPath);
        } catch (e) {
            return require(path);
        }
    };
} else {
    exports.require = require;
}