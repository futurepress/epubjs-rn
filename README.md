Epub.js React Native Components
================================

Uses v0.3 of [EPUB.js](https://github.com/futurepress/epub.js) to parse and render epubs on iOS and Android using React Native.

Getting Started
-------------------------

To use the components in your own app install via npm

```bash
npm install --save futurepress/epubjs-rn
```

Add the native adapters to your `package.json`
```
"react-native-fetch-blob": "^0.10.0",
"react-native-orientation": "yamill/react-native-orientation",
"react-native-webview-bridge": "^0.33.0"
```

then install and link the required libraries with
```bash
npm install
react-native link
```

then require the `components` you need

```
import { Epub } from 'epubjs-rn';
```

Then you can add the reader element in your code:

```html
<Epub src={"https://s3.amazonaws.com/epubjs/books/moby-dick/OPS/package.opf"}
		  flow={"paginated"} />
```

* `src`: the url of your epub to render
* `flow`: `paginated` : `scrolled` - (default to false, which presents a scrolling view)
* `location`: Can be an EPUBCFI, Chapter Url or Spine Position
* `onLocationChange`: Function called on every page change, reports current CFI
* `onLocationsReady`: Function called once the locations has been generated. Returns the locations object.
* `width`: width (int) of the Epub Rendition
* `height`: height (int) of the Epub Rendition
* `onReady`: Function called once book has been opened. Returns the book object
* `themes`: Link to css stylesheet containing themes
* `theme`: Name of the theme to apply, such as `light`
* `fontSize`: CSS override for font size of theme

Update (or add) the `.babelrc` to include the polyfills for `path`, and `stream` and `fs`.

```json
{
"presets": ["react-native"],
"plugins": [
    ["module-resolver", {
      "alias": {
        "stream": "stream-browserify",
        "path": "path-webpack"
      }
    }],
    "static-fs"
  ]
}
```

Finally install `babel-plugin-module-resolver`, `babel-plugin-static-fs` and `util` (required by `jszip`) 

```bash
npm install babel-plugin-module-resolver --save-dev
npm install babel-plugin-static-fs --save-dev
npm install util --save
```

Running the example app
-------------------------

Install from NPM or Yarn

```bash
npm install -g react-native-cli
npm install
```
Then start the iOS or Android App

```bash
react-native run-ios
react-native run-android
```

Other
-------------------------

EPUB is a registered trademark of the [IDPF](http://idpf.org/).
