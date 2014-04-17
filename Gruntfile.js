module.exports = function(grunt) {
    //load npm tasks
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-mocha-cov');

    //default
    grunt.registerTask('default', ['test']);

    //test tasks
    grunt.registerTask('test', ['jshint', 'mochacov:unit', 'mochacov:coverage']);
    grunt.registerTask('travis', ['jshint', 'mochacov:unit', 'mochacov:coverage'/*, 'mochacov:coveralls'*/]);

    //Project Configuration
    grunt.initConfig({
        //settings used throughout the configuration
        pkg: grunt.file.readJSON('package.json'),
        dirs: {
            lib: 'lib',
            test: 'test'
        },
        //jshint obviously lints our code
        jshint: {
            options: {
                jshintrc: '.jshintrc'
            },
            lib: {
                src: '<%= dirs.lib %>/**/*.js'
            }
        },
        //runs our tests
        mochacov: {
            options: {
                files: 'test/**/*.test.js',
                ui: 'bdd',
                colors: true,
                require: ['./test/fixtures/common']
            },
            unit: {
                options: {
                    reporter: 'spec'
                }
            },
            coverage: {
                options: {
                    reporter: 'mocha-term-cov-reporter',
                    coverage: true
                }
            },
            coveralls: {
                options: {
                    coveralls: {
                        serviceName: 'travis-ci'
                    }
                }
            }
        }
    });
};
