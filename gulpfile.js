var gulp = require("gulp");
// var gutil = require('gulp-util');
// var babel = require("gulp-babel");
// var plumber = require('gulp-plumber');
// var onError = function (err) {
// 	gutil.log(err);
// };

function copy() {
	return gulp.src(['./components/**/*.js'])
		.pipe(gulp.dest("./EpubReader/node_modules/epubjs-rn/components"));
}

function copyPackage() {
	return gulp.src(['./package.json'])
		.pipe(gulp.dest("./EpubReader/node_modules/epubjs-rn"));
}

function copyEpubjs() {
	return gulp.src(['../epub.js/lib/**/*.js'])
		.pipe(gulp.dest("./EpubReader/node_modules/epubjs/lib"));
}

function watch() {
	return gulp.watch('./components/**/*.js', gulp.parallel(copy, copyPackage));
}

exports.watch = watch;
exports.copy = copy;
exports.copyPackage = copyPackage;
exports.copyEpubjs = copyEpubjs;
exports.default = gulp.parallel(copy, copyPackage);
