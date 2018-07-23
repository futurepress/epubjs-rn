var webpack = require("webpack");
var BabiliPlugin = require("babili-webpack-plugin");
const path = require('path');

module.exports = {
	mode: "development",
	entry: {
		"contents": "./contents/contents.js",
	},
	output: {
		path: path.resolve(__dirname),
		filename: "[name].min.js",
		library: "EPUBJSContents",
		libraryTarget: "umd",
	},
	externals: {
		"jszip": "JSZip",
		"xmldom": "xmldom"
	},
	module: {
		rules: [
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
