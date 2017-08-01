import React, { Component } from "react"

import {
  StyleSheet,
  View,
  ActivityIndicator,
  AsyncStorage,
  Dimensions,
  Platform,
  AppState,
  WebView
} from "react-native";

import WKWebView from 'react-native-wkwebview-reborn';

import Orientation from "react-native-orientation";

import RNFetchBlob from "react-native-fetch-blob"

if (!global.Blob) {
  global.Blob = RNFetchBlob.polyfill.Blob;
}

global.JSZip = global.JSZip || require("jszip");

global.URL = require("epubjs/libs/url/url-polyfill.js");

if (!global.btoa) {
  global.btoa = require("base-64").encode;
}

import ePub, { Layout, EpubCFI } from "epubjs";

const core = require("epubjs/lib/utils/core");
const Uri = require("epubjs/lib/utils/url");
const Path = require("epubjs/lib/utils/path");

const Rendition = require("./Rendition");

class Epub extends Component {

  constructor(props) {
    super(props);

    var bounds = Dimensions.get("window");

    this.state = {
      toc: [],
      show: false,
      width : bounds.width,
      height : bounds.height,
      orientation: "PORTRAIT"
    }

    this.active = true;

  }

  componentDidMount() {
    this._isMounted = true;
    AppState.addEventListener('change', this._handleAppStateChange.bind(this));

    Orientation.addSpecificOrientationListener(this._orientationDidChange.bind(this));
    let orientation = Orientation.getInitialOrientation();
    if (orientation && (orientation === "PORTRAITUPSIDEDOWN" || orientation === "UNKNOWN")) {
      orientation = "PORTRAIT";
      this.setState({orientation})
    } else if (orientation) {
      this.setState({orientation})
    } else if (orientation === null) {
      // Android starts as null
      orientation = this.state.width > this.state.height ? "LANDSCAPE" : "PORTRAIT";
      this.setState({orientation})
    }
    // __DEV__ && console.log("inital orientation", orientation, this.state.width, this.state.height)

    if (this.props.src) {
      this._loadBook(this.props.src);
    }
  }

  componentWillUnmount() {
    this._isMounted = false;

    AppState.removeEventListener('change', this._handleAppStateChange);
    Orientation.removeSpecificOrientationListener(this._orientationDidChange);
    clearTimeout(this.orientationTimeout);

    this.destroy();
  }

  shouldComponentUpdate(nextProps, nextState) {

    if (nextState.show !== this.state.show) {
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

    if (nextProps.src != this.props.src) {
      return true;
    }

    if (nextProps.onPress != this.props.onPress) {
      return true;
    }

    if (nextProps.onLongPress != this.props.onLongPress) {
      return true;
    }

    return false;
  }

  componentWillUpdate(nextProps) {
    if (nextProps.src !== this.props.src) {
      this.destroy();
    }
  }

  componentDidUpdate(prevProps) {
    if (this.rendition &&
        this.props.themes &&
        JSON.stringify(prevProps.themes) !== JSON.stringify(this.props.themes)) {
      this.rendition.themes.register(this.props.themes);
      this.rendition.themes.apply(this.props.theme);
    }

    if (this.rendition && prevProps.theme !== this.props.theme) {
      this.rendition.themes.apply(this.props.theme);
    }

    if (this.rendition && prevProps.fontSize !== this.props.fontSize) {
      this.rendition.themes.fontSize(this.props.fontSize);
    }

    if (this.rendition && prevProps.font !== this.props.font) {
      this.rendition.themes.font(this.props.font);
    }

    if (prevProps.src !== this.props.src) {
      this._loadBook(this.props.src);
    } else if (prevProps.orientation !== this.props.orientation) {
      _orientationDidChange(this.props.orientation);
    } else if (prevProps.width !== this.props.width || prevProps.height !== this.props.height) {
      // this.redisplay();
    }

    if (prevProps.location !== this.props.location) {
      // this.rendition.display(this.props.location);
    }
  }

  // LANDSCAPE PORTRAIT UNKNOWN PORTRAITUPSIDEDOWN
  _orientationDidChange(orientation) {
    var wait = 10;

    if(!this.active) return;

    if (orientation === "UNKNOWN" || orientation == "PORTRAITUPSIDEDOWN" || this.orientation === orientation) {
      return;
    }

    this.orientationTimeout = setTimeout(()=> {
      if(this._isMounted) {
        this._updateOrientation(orientation);
      }
    }, wait);

  }

  _updateOrientation(orientation) {
    var location = this._visibleLocation ? this._visibleLocation.start.cfi : this.props.location;
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


    this.setState({orientation});


    if (reversed) {
      width = this.props.width || _height;
      height = this.props.height || _width;
    } else {
      width = this.props.width || _width;
      height = this.props.height || _height;
    }

    this.setState({ width, height });

    this.props.onOrientationChanged && this.props.onOrientationChanged(orientation);
  }

  redisplay(location) {
    var _location = location;
    if (!_location) {
      _location = this._visibleLocation ? this._visibleLocation.start.cfi : this.props.location;
    }

    if (this.rendition) {
      // this.rendition.display(_location);
    }
  }

  _loadBook(bookUrl) {
    __DEV__ && console.log("loading book: ", bookUrl);

    this.book = ePub({
      replacements: this.props.base64 || "none"
    });

    return this._openBook(bookUrl);

    /*
    var type = this.book.determineType(bookUrl);

    var uri = new Uri(bookUrl);
    if ((type === "directory") || (type === "opf")) {
      return this._openBook(bookUrl);
    } else {
      return this.streamer.start()
      .then((localOrigin) => {
        this.setState({localOrigin})
        return this.streamer.get(bookUrl);
      })
      .then((localUrl) => {
        this.setState({localUrl})
        return this._openBook(localUrl);
      });
    }
    */
  }

  _openBook(bookUrl, useBase64) {
    var type = useBase64 ? "base64" : null;

    this.book.open(bookUrl)
      .then(() => {
        // __DEV__ && console.log("book opened", Date.now() - unzipTimer);
      })
      .catch((err) => {
        console.error(err);
      })

    this.rendition = this.refs["rendition"];

    this.book.ready.then(() => {
      this.props.onReady && this.props.onReady(this.book);
    });

    this.book.loaded.navigation.then((nav) => {
      this.setState({toc : nav.toc});
      this.props.onNavigationReady && this.props.onNavigationReady(nav.toc);
    });

    if (this.props.generateLocations != false) {
      this.loadLocations().then((locations) => {
        this.rendition.setLocations(locations);
        // this.rendition.reportLocation();
        this.props.onLocationsReady && this.props.onLocationsReady(this.book.locations);
      });
    }

  }

  loadLocations() {
    return this.book.ready.then(() => {
      // Load in stored locations from json or local storage
      var key = this.book.key()+"-locations";

      return AsyncStorage.getItem(key).then((stored) => {
        if (this.props.regenerateLocations != true && stored !== null){
          return this.book.locations.load(stored);
        } else {
          return this.book.locations.generate(this.props.locationsCharBreak || 600).then((locations) => {
            // Save out the generated locations to JSON
            AsyncStorage.setItem(key, this.book.locations.save());
            return locations;
          });
        }
      })

    });
  }

  onRelocated(visibleLocation) {
    this._visibleLocation = visibleLocation;

    if (this.props.onLocationChange) {
      this.props.onLocationChange(visibleLocation);
    }
  }

  visibleLocation() {
    return this._visibleLocation;
  }

  getRange(cfi) {
    return this.book.getRange(cfi);
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
    return (
      <Rendition
        ref="rendition"
        url={this.props.src}
        flow={this.props.flow}
        minSpreadWidth={this.props.minSpreadWidth}
        stylesheet={this.props.stylesheet}
        script={this.props.script}
        onSelected={this.props.onSelected}
        onMarkClicked={this.props.onMarkClicked}
        onPress={(this.props.onPress)}
        onLongPress={(this.props.onLongPress)}
        onViewAdded={this.props.onViewAdded}
        beforeViewRemoved={this.props.beforeViewRemoved}
        themes={this.props.themes}
        theme={this.props.theme}
        fontSize={this.props.fontSize}
        font={this.props.font}
        display={this.props.location}
        onRelocated={this.onRelocated.bind(this)}
        orientation={this.state.orientation}
        minSpreadWidth={this.props.minSpreadWidth}
        />
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
