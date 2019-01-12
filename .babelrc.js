const fs = require('fs');
const path = require('path');

process.env.POLYFILL = fs.readFileSync(path.resolve(__dirname, "node_modules/@babel/polyfill/dist/polyfill.min.js"), "utf8");
process.env.EPUBJS = fs.readFileSync(path.resolve(__dirname, "node_modules/epubjs/dist/epub.min.js"), "utf8");
process.env.BRIDGE = fs.readFileSync(path.resolve(__dirname, "contents/bridge.js"), "utf8");

module.exports = {
  "presets": ["module:metro-react-native-babel-preset"],
  "plugins": [
    ["module-resolver", {
      "alias": {
        "stream": "stream-browserify",
        "path": "path-webpack"
      }
    }],
    "transform-inline-environment-variables"
  ]
}
