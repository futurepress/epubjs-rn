var webpack = require("webpack");
var BabiliPlugin = require("babili-webpack-plugin");

module.exports = {
	entry: {
		"contents": "./contents/contents.js",
	},
	output: {
		filename: "./contents/[name].min.js",
		library: "EPUBJSContents",
		libraryTarget: "umd",
	},
	externals: {
		"jszip": "JSZip",
		"xmldom": "xmldom"
	},
	plugins: [
		new BabiliPlugin()
	],
	resolve: {
		alias: {
			path: "path-webpack"
		}
	}
}
