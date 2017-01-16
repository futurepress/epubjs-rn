var gulp = require("gulp");
var babel = require("gulp-babel");

gulp.task("build", function () {
	return gulp.src(["./src/**/*.js"])
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
