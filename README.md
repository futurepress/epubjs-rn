Epub.js React Native Components
================================

Uses v0.3 of [EPUB.js](https://github.com/futurepress/epub.js) to parse and render epubs on iOS and Android using React Native.

Getting Started
-------------------------

To use the components in your own app install via npm or yarn

```bash
npm install --save epubjs-rn
```

It may be necessary to include the following dependencies to your `package.json`
to allow link to work automatically

```bash
npm install --save react-native-fetch-blob react-native-fs react-native-orientation react-native-zip-archive react-native-static-server react-native-wkwebview-reborn
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
* `onViewAdded`: Function called once a view has been added to the screen.
* `beforeViewRemoved`: Function called before a view will be removed from the screen.
* `width`: width (int) of the Epub Rendition
* `height`: height (int) of the Epub Rendition
* `onReady`: Function called once book has been opened. Returns the book object
* `themes`: JSON object of themes names and css properties to be applied
* `theme`: Name of the theme to apply, such as `light`
* `fontSize`: CSS override for font size of theme, needs a css unit
* `font`: CSS override for font family
* `stylesheet`: Link to css stylesheet containing themes
* `script`: Url for a javascript file to be injected into the view
* `minSpreadWidth`: cut off width for spreads

Using a local file server
-------------------------

To unzip compressed epubs locally and use http to stream them to epubjs,
you will want to use the `Streamer` class to manage the files and start a [StaticServer](https://github.com/futurepress/react-native-static-server).

An example of this method is provided in the example app.

```
import { Epub, Streamer } from "epubjs-rn";
let streamer = new Streamer();

streamer.start("8899")
	.then((origin) => {
		console.log("Served from:", origin)
		return this.streamer.get("https://s3.amazonaws.com/epubjs/books/moby-dick.epub");
	})
	.then((src) => {
		console.log("Loading from:", src);
		return this.setState({src});
	});
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
