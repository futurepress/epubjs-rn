var gulp = require("gulp");
var gutil = require('gulp-util');
var babel = require("gulp-babel");
var plumber = require('gulp-plumber');
var onError = function (err) {
	gutil.log(err);
};
gulp.task("build", function () {
	return gulp.src(["./src/**/*.js"])
	.pipe(plumber({ errorHandler: onError }))
	.pipe(babel({
		"plugins": [
				"syntax-jsx",
				["module-resolver", {
					"alias": {
						"stream": "stream-browserify",
						"path": "path-webpack"
					}
				}],
				"static-fs"
			]
		}
	))
	.pipe(gulp.dest("components"));
});

gulp.task("copy", ["build"], function () {
	return gulp.src(['./components/**/*.js'])
		.pipe(gulp.dest("./EpubReader/node_modules/epubjs-rn/components"));
});

gulp.task("watch", function () {
	return gulp.watch('./src/**/*.js', ['build', 'copy']);
});

gulp.task("default", ["build"]);
