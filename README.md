Epub.js React Native Example
================================

Uses v0.3 of [EPUB.js](https://github.com/futurepress/epub.js) to parse and render epubs on iOS and Android using React Native.

Getting Started
-------------------------

Add Epub.js `view_managers` branch:

```bash
npm install --save futurepress/epub.js#view_managers
```

Include the built epub.js file `/node_modules/epubjs/dist/epub.js` in your Xcode project or Androids `files` directory.
You can set the location of epub.js as the const `EPUBJS_LOCATION` in `/app/Reader.js`, including setting it to a remote url.

Add react-native-webview-bridge:

```bash
npm install react-native-webview-bridge --save
```

Then follow the directions from their readme: https://github.com/alinz/react-native-webview-bridge

Add react-native-fs:

```bash
npm install react-native-fs --save
```

Then follow the directions from their readme: https://github.com/johanneslumpe/react-native-fs#adding-manually-in-xcode

To use the example components, copy over the `app` folder

Then you can add the reader element in your code:

```html
<Reader src={"https://s3.amazonaws.com/moby-dick/OPS/package.opf"} paginated={true} location={0}/>
```

* `src`: the url of your epub to render
* `paginated`: `true` : `false` - (default to false, which presents a scrolling view)
* `location`: Can be an EPUBCFI, Chapter Url or Spine Position

Other
-------------------------

EPUB is a registered trademark of the [IDPF](http://idpf.org/).

