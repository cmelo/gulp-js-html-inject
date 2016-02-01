var fs = require('fs');
var path = require('path');
var through = require('through2');
var xtend = require('xtend');
var htmlMinify = require('html-minifier').minify;
var removeNewline = require('newline-remove');

module.exports = function(options) {
    var opts = xtend({
        basepath: '',
        pattern: /'@@import ([a-zA-Z0-9\-_.\\/]+)'/g,
        relativePath: false,
        debug: false
    }, options);

    if(opts.debug) console.log('Injecting resources:');

    return through.obj(
        function(file, enc, callback) {
            if(file.isNull()) callback(null, file);

            var process = function(contents) {
                return contents.replace(opts.pattern, function(match, filepath) {
                    var dir = file.path.match('^(.+)/([^/]+)$')[1];
                    var fp = path.join(opts.relativePath ? dir : opts.basepath, filepath);
                    var filecontents = '';
                    try {
                        filecontents = fs.readFileSync(fp, {encoding: 'utf8'});
                        //filecontents = removeNewline(filecontents);
                        filecontents = filecontents.replace(/\n/g, '\\n');
                    } catch(e) {}
                    if(opts.debug) {
                        var status = (filecontents == '' ? 'not found' : 'OK');
                        console.log('   ', filepath, status);
                    }
                    return "'" + filecontents.replace(/'/g, "\\'") + "'";
                });
            };

            if(opts.debug) console.log(' ', file.path);

            if(file.isBuffer()) {
                file.contents = new Buffer(process(String(file.contents)));
                callback(null, file);
            } else if(file.isStream()) {
                file.contents.on('data', function(data) {
                    file.contents = new Buffer(process(data));
                    callback(null, file);
                });
            } else callback(null, file);
        }
    );
};
