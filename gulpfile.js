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

gulp.task("copy:package", function () {
	return gulp.src(['./package.json'])
		.pipe(gulp.dest("./EpubReader/node_modules/epubjs-rn"));
});

gulp.task("copy:epubjs", function () {
	return gulp.src(['../epub.js/lib/**/*.js'])
		.pipe(gulp.dest("./EpubReader/node_modules/epubjs/lib"));
});

gulp.task("copy:epubjs-src", function () {
	return gulp.src(['../epub.js/src/**/*.js'])
		.pipe(gulp.dest("./node_modules/epubjs/src"));
});

gulp.task("copy:contents", function () {
	return gulp.src(['./contents/contents.js','./contents/contents.min.js'])
		.pipe(gulp.dest("./EpubReader/node_modules/epubjs-rn/contents"));
});

gulp.task("watch", function () {
	return gulp.watch('./src/**/*.js', ['build', 'copy', 'copy:package']);
});

gulp.task("watch:epubjs", function () {
	return gulp.watch('../epub.js/lib/**/*.js', ['copy:epubjs']);
});

gulp.task("default", ["build"]);
