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
	module: {
		loaders: [
			{
				test: /\.js$/,
				//exclude: /node_modules/,
				loader: "babel-loader",
				query: {
					presets: ['es2015']
				}
			}
		]
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
