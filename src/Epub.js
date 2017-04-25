import React, { Component } from "react"

import {
  StyleSheet,
  View,
  ActivityIndicator,
  AsyncStorage,
  Dimensions,
  Platform,
  AppState
} from "react-native";

import Orientation from "react-native-orientation";

import RNFetchBlob from "react-native-fetch-blob"

import { readFileSync } from "fs";

if (!global.Blob) {
  global.Blob = RNFetchBlob.polyfill.Blob;
}

global.JSZip = global.JSZip || require("jszip");

global.URL = require("epubjs/libs/url/url.js");

if (!global.btoa) {
  global.btoa = require("base-64").encode;
}

import ePub, { Rendition, Layout, EpubCFI } from "epubjs";

const core = require("epubjs/lib/utils/core");
const Uri = require("epubjs/lib/utils/url");
const Path = require("epubjs/lib/utils/path");

const EpubViewManager = require("./EpubViewManager");

const EPUBJS = readFileSync(__dirname + "/../contents/contents.min.js", "utf8");

class Epub extends Component {

  constructor(props) {
    super(props);

    var bounds = Dimensions.get("window");

    this.book_url = this.props.src;
    this.state = {
      title: "",
      modalVisible: false,
      toc: [],
      page: 0,
      show: false,
      width : bounds.width,
      height : bounds.height
    }

    this.active = true;

  }

  componentDidMount() {

    AppState.addEventListener('change', this._handleAppStateChange.bind(this));

    Orientation.addSpecificOrientationListener(this._orientationDidChange.bind(this));
    this.orientation = Orientation.getInitialOrientation();
    if (this.orientation === "PORTRAITUPSIDEDOWN" || this.orientation === "UNKNOWN") {
      this.orientation = "PORTRAIT";
    }

    // Android starts as null
    if (this.orientation === null) {
      this.orientation = this.state.width > this.state.height ? "LANDSCAPE" : "PORTRAIT";
    }
    __DEV__ && console.log("inital orientation", this.orientation, this.state.width, this.state.height)

    if (this.book_url) {
      this._loadBook(this.book_url);
    }
  }

  componentWillUnmount() {
    AppState.removeEventListener('change', this._handleAppStateChange);
    Orientation.removeSpecificOrientationListener(this._orientationDidChange);
    clearTimeout(this.orientationTimeout);

    this.destroy();
  }

  shouldComponentUpdate(nextProps, nextState) {

    if (nextProps.show != this.state.show) {
      return true;
    }

    if ((nextProps.width !== this.props.width) ||
        (nextProps.height !== this.props.height)) {
      return true;
    }

    if ((nextState.width !== this.state.width) ||
        (nextState.height !== this.state.height)) {
      return true;
    }

    if (nextProps.color != this.props.color) {
      return true;
    }

    if (nextProps.backgroundColor != this.props.backgroundColor) {
      return true;
    }

    if (nextProps.size != this.props.size) {
      return true;
    }

    if (nextProps.flow != this.props.flow) {
      return true;
    }

    if (nextProps.origin != this.props.origin) {
      return true;
    }

    if (nextProps.orientation != this.props.orientation) {
      return true;
    }


    return false;
  }

  componentWillUpdate(nextProps) {
    if (this.rendition &&
        nextProps.themes &&
        JSON.stringify(nextProps.themes) !== JSON.stringify(this.props.themes)) {
      this.rendition.themes.register(nextProps.themes);
      this.rendition.themes.apply(nextProps.theme);
    }

    if (this.rendition && nextProps.theme !== this.props.theme) {
      this.rendition.themes.apply(nextProps.theme);
    }

    if (this.rendition && nextProps.fontSize !== this.props.fontSize) {
      this.rendition.themes.fontSize(nextProps.fontSize);
    }

    if (nextProps.src !== this.props.src) {
      this.destroy();
      this.book_url = nextProps.src;
      this._loadBook(this.book_url);
    } else if (nextProps.orientation !== this.props.orientation) {
      _orientationDidChange(nextProps.orientation);
    } else if (nextProps.width !== this.props.width ||
        nextProps.height !== this.props.height) {
      this.redisplay();
    } else if (nextProps.flow !== this.props.flow) {
      this.rendition.flow(nextProps.flow || "paginated");
      this.redisplay();
    }

    if (nextProps.location !== this.props.location) {
      this.rendition.display(nextProps.location);
    }
  }

  // LANDSCAPE PORTRAIT UNKNOWN PORTRAITUPSIDEDOWN
  _orientationDidChange(orientation) {
    var wait = 10;

    if(!this.active) return;

    if (orientation === "UNKNOWN" || orientation == "PORTRAITUPSIDEDOWN" || this.orientation === orientation) {
      return;
    }

    if (this.rendition) {
      this.rendition.manager.clear(() => {
        this.orientationTimeout = setTimeout(()=> {
          this._updateOrientation(orientation);
        }, wait);
      });
    } else {
      this.orientationTimeout = setTimeout(()=> {
          this._updateOrientation(orientation);
      }, wait);
    }

  }

  _updateOrientation(orientation) {
    var location = this._visibleLocation ? this._visibleLocation.start : this.props.location;
    var width, height;
    var bounds = Dimensions.get('window');
    var _width = bounds.width, _height = bounds.height;
    var reversed = false;

    __DEV__ && console.log("orientation", orientation, bounds.width, bounds.height);

    switch (orientation) {
      case "PORTRAIT":
        if (_width > _height) { reversed = true };
        break;
      case "LANDSCAPE":
        width = this.props.height || _width;
        height = this.props.width || _height;
        break;
      case "LANDSCAPE-RIGHT":
        if (_height > _width) { reversed = true };
        break;
      case "LANDSCAPE-LEFT":
        if (_height > _width) { reversed = true };
        break;
      default:
        reversed = false;
    }


    this.orientation = orientation;


    if (reversed) {
      width = this.props.width || _height;
      height = this.props.height || _width;
    } else {
      width = this.props.width || _width;
      height = this.props.height || _height;
    }

    this.setState({ width, height}, () => {
      if (this.rendition) {
        this.redisplay(location);
      }
    });

    this.props.onOrientationChanged && this.props.onOrientationChanged(orientation);
  }

  redisplay(location) {
    var _location = location;
    if (!_location) {
      _location = this._visibleLocation ? this._visibleLocation.start : this.props.location;
    }

    if (this.rendition) {
      this.rendition.manager.clear(() => {
        this.rendition.layout(this.rendition.settings.globalLayoutProperties);
        this.rendition.display(_location);
      });
    }
  }

  _loadBook(bookUrl) {

    __DEV__ && console.log("loading book: ", bookUrl);

    this.book = ePub({
      replacements: this.props.base64 || "none"
    });

    return this._openBook(bookUrl);

    // var type = this.book.determineType(bookUrl);

    // var uri = new Uri(bookUrl);
    // if ((type === "directory") || (type === "opf")) {
    //   return this._openBook(bookUrl);
    // } else {
      // return this.streamer.start()
      // .then((origin) => {
      //   this.setState({origin})
      //   return this.streamer.get(bookUrl);
      // })
      // .then((localUrl) => {
      //   console.log("local", localUrl);
      //   return this._openBook(localUrl);
      // });
    // }

  }

  _openBook(bookUrl, useBase64) {
    var type = useBase64 ? "base64" : null;
    var unzipTimer = Date.now();

    this.book.open(bookUrl)
      .then(() => {
        __DEV__ && console.log("book opened", Date.now() - unzipTimer);
      })
      .catch((err) => {
        console.error(err);
      })



    // load epubjs in views
    /*
    book.spine.hooks.content.register(function(doc, section) {
      var script = doc.createElement("script");
      script.setAttribute("type", "text/javascript");
      script.setAttribute("src", EPUBJS_LOCATION);

      doc.getElementsByTagName("head")[0].appendChild(script);
    });
    */

    // Load the epubjs library into a hook for each webview
    this.book.spine.hooks.content.register(function(doc, section) {
      var script = doc.createElement("script");
      script.setAttribute("type", "text/javascript");
      script.textContent = EPUBJS;
      doc.getElementsByTagName("head")[0].appendChild(script);
    }.bind(this));

    this.manager = this.refs["manager"];

    this.rendition = new Rendition(this.book, {
      flow: this.props.flow || "paginated",
      minSpreadWidth: 550,
      manager: this.manager,
      stylesheet: this.props.stylesheet,
      script: this.props.script,
    });

    this.rendition.on("selected", (cfiRange, contents) => {
      console.log('selected', cfiRange);
      contents.mark(cfiRange);
    });

    this.rendition.themes.default({
      '::selection': {
        'background': 'rgba(255,255,0, 0.3)'
      },
      '.epubjs-hl' : {
        'fill': 'yellow', 'fill-opacity': '0.3', 'mix-blend-mode': 'multiply'
      },
      'p': {
        'padding': '0 35px',
        'position': 'relative'
      },
      '[ref="epubjs-mk"]::before' : {
        'content': '""',
        'background': 'url("data:image/svg+xml;base64,PHN2ZyB2ZXJzaW9uPScxLjEnIHhtbG5zPSdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZycgeG1sbnM6eGxpbms9J2h0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsnIHg9JzBweCcgeT0nMHB4JyB2aWV3Qm94PScwIDAgNzUgNzUnPjxnIGZpbGw9JyNCREJEQkQnIGlkPSdidWJibGUnPjxwYXRoIGNsYXNzPSdzdDAnIGQ9J00zNy41LDkuNEMxOS42LDkuNCw1LDIwLjUsNSwzNC4zYzAsNS45LDIuNywxMS4zLDcuMSwxNS42TDkuNiw2NS42bDE5LTcuM2MyLjgsMC42LDUuOCwwLjksOC45LDAuOSBDNTUuNSw1OS4yLDcwLDQ4LjEsNzAsMzQuM0M3MCwyMC41LDU1LjQsOS40LDM3LjUsOS40eicvPjwvZz48L3N2Zz4=") no-repeat',
        'display': 'block',
        'right' : '0',
        'position' : 'absolute',
        'width': '30px',
        'height': '30px',
        'cursor': 'pointer'
      }
    });

    this.rendition.highlight = function(cfi) {
      var _cfi = new EpubCFI(cfi);

      var found = this.manager.visible().filter(function (view) {
        if(_cfi.spinePos === view.index) return true;
      });

      // Should only every return 1 item
      if (found.length) {
        return found[0].contents.highlight(cfi);
      }
    }.bind(this.rendition);

    this.rendition.manager.on("added", (view) => {
      if (view.index === 6) {
        view.contents.mark('epubcfi(/6/14[xchapter_001]!/4/2/4/2[c001s0001],/1:0,/1:16)');
      }
    });

    // this.rendition.setManager(this.manager);

    if (this.props.themes) {
      this.rendition.themes.register(this.props.themes);
    }

    if (this.props.theme) {
      this.rendition.themes.apply(this.props.theme);
    }

    if (this.props.fontSize) {
      this.rendition.themes.fontSize(this.props.fontSize);
    }

    this.rendition.display(this.props.location || 0).then(() => {
      if (this.props.generateLocations != false) {
        requestAnimationFrame(() => this.loadLocations());
      }
    });
    // Disable Scrollbar for Android
    /*
    this.rendition.hooks.content.register((contents) => {
      contents.addStylesheetRules([
        ["html",
          ["position", "fixed"],
          ["overflow", "hidden"],
          ["height", "100%"],
          ["width", "100%"]
        ]
      ]);
    });
    */

    this.rendition.on("locationChanged", (visibleLocation)=> {

      this._visibleLocation = visibleLocation;

      if (this.props.onLocationChange) {
        this.props.onLocationChange(visibleLocation);
      }
    });

    this.book.ready.then(() => {
      this.setState({show: true});
      this.props.onReady && this.props.onReady(this.book);
    });

    this.book.loaded.navigation.then((nav) => {
      this.setState({toc : nav.toc});
      this.props.onNavigationReady && this.props.onNavigationReady(nav.toc);
    });

  }

  loadLocations() {
    this.book.ready.then(() => {
      // Load in stored locations from json or local storage
      var key = this.book.key()+"-locations";

      return AsyncStorage.getItem(key).then((stored) => {
        if (this.props.regenerateLocations != true && stored !== null){
          return this.book.locations.load(stored);
        } else {
          var locationsTimer = Date.now();
          return this.book.locations.generate(600).then((locations) => {
            __DEV__ && console.log("locations generated", Date.now() - locationsTimer);
            // Save out the generated locations to JSON
            AsyncStorage.setItem(key, this.book.locations.save());
          });
        }
      })

    }).then(() => {
      this.props.onLocationsReady && this.props.onLocationsReady(this.book.locations);
    })
  }

  visibleLocation() {
    return this._visibleLocation;
  }

  getRange(cfi) {
    return this.book.getRange(cfi);
  }
  _onShown(shouldShow) {
    this.setState({show: shouldShow});
  }

  _handleAppStateChange(appState) {
    if (appState === "active") {
      this.active = true;
    }

    if (appState === "background") {
      this.active = false;
    }

    if (appState === "inactive") {
      this.active = false;
    }
  }

  destroy() {
    if (this.book) {
      this.book.destroy();
    }
  }

  render() {

    var loader;
    if (!this.state.show) {
      loader = (
        <View style={[styles.loadScreen, {
            backgroundColor: this.props.backgroundColor || "#FFFFFF"
          }]}>
          <ActivityIndicator
              color={this.props.color || "black"}
              size={this.props.size || "large"}
              style={{ flex: 1 }}
            />
        </View>);
    }

    return (
      <View ref="framer" style={styles.container}>
        <EpubViewManager
          ref="manager"
          style={[styles.manager, {
            backgroundColor: this.props.backgroundColor || "#FFFFFF"
          }]}
          flow={this.props.flow || "paginated"}
          request={this.book && this.book.load.bind(this.book)}
          onPress={this.props.onPress}
          onShow={this._onShown.bind(this)}
          origin={this.props.origin}
          backgroundColor={this.props.backgroundColor}
          lastSectionIndex={this.book && (this.book.spine.length - 1)}
          bounds={{ width: this.props.width || this.state.width,
                    height: this.props.height || this.state.height }}
        />
        {loader}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "column",
  },
  manager: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
    marginTop: 0,
    flexDirection: "row",
    flexWrap: "nowrap",
    backgroundColor: "#F8F8F8",
  },
  rowContainer: {
    flex: 1,
  },
  loadScreen: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center"
  }
});

module.exports = Epub;
