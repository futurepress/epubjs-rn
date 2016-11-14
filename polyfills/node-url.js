const url = require('url');

function URL(string, base) {
	var _base = base || "";
	console.log("string", string);
	console.log("base", base);
	this.resolved = url.resolve(_base, string);
	console.log("resolved", this.resolved);
	this.parsed = url.parse(this.resolved || string);
	console.log(this.parsed);
}
module.exports = URL;
