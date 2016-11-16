import React, { Component } from 'react'

import {
  StyleSheet,
  View,
  ActivityIndicator,
} from 'react-native';

import Dimensions from 'Dimensions';
import Orientation from 'react-native-orientation';

import RNFetchBlob from 'react-native-fetch-blob'

import { readFileSync } from 'fs';
import { join } from 'path';

if (!global.Blob) {
  global.Blob = RNFetchBlob.polyfill.Blob
}

global.JSZip = global.JSZip || require('jszip');

global.URL = require("epubjs/libs/url/url.js");

if (!global.btoa) {
  global.btoa = require('base-64').encode;
}

const ePub = require('epubjs');
const Rendition = require('epubjs/src/rendition');
const Layout = require('epubjs/src/layout');
const core = require('epubjs/src/core');

const EpubViewManager = require('./EpubViewManager');

const RNFS = require('react-native-fs');

const EPUBJS = readFileSync(join(__dirname, '../node_modules/epubjs/dist/epub.min.js'), 'utf8');

class Epub extends Component {

  constructor(props) {
    super(props);

    this.book_url = this.props.src;
    this.state = {
      title: '',
      modalVisible: false,
      toc: [],
      page: 0,
      show: false
    }

    this.book = ePub({
      replacements: "base64"
    });


    this.bounds = Dimensions.get('window');
  }

  componentDidMount() {

    Orientation.addOrientationListener(this._orientationDidChange.bind(this));

    // fetch(EPUBJS_LOCATION)
    //   .then((response) => response.text())
    //   .then((text) => {
    //     this._epubjsLib = text;

        this._loadBook(this.book_url);


      //   return text;
      // })
      // .catch((error) => {
      //   console.error(error);
      // });
  }

  componentWillUnmount() {
    Orientation.removeOrientationListener(this._orientationDidChange);
  }

  _orientationDidChange(orientation) {
    var location = this._visibleLocation ? this._visibleLocation.start : this.props.location;

    if (this.rendition && location) {
      this.rendition.layout();
      this.rendition.display(location);
    }
  }

  _loadBook(bookUrl) {
    console.log("loading book: ", bookUrl);
    var type = this.book.determineType(bookUrl);

    global.book = this.book;

    if ((type === "directory") || (type === "opf")) {
      return this._openBook(bookUrl);
    }

    return RNFetchBlob
      .config({
        fileCache : true,
      })
      .fetch('GET', bookUrl)
      .then((res) => {

        return res.base64().then((content) => {
          // new_zip.loadAsync(content, {"base64" : true });
          this._openBook(content, true);

          // remove the temp file
          res.flush();
        });

      })
      .catch((err) => {
        console.error(err);
      })

;
  }

  _openBook(bookArrayBuffer, useBase64) {

    this.book.open(bookArrayBuffer)
      .catch((err) => {
        console.error(err);
      })

    // Load the epubjs library into a hook for each webview
    book.spine.hooks.content.register(function(doc, section) {
      var script = doc.createElement('script');
      script.setAttribute('type', 'text/javascript');
      script.textContent = EPUBJS;
      // script.src = EPUBJS_DATAURL;
      doc.getElementsByTagName('head')[0].appendChild(script);
    }.bind(this));

    // load epubjs in views
    /*
    book.spine.hooks.content.register(function(doc, section) {
      var script = doc.createElement('script');
      script.setAttribute('type', 'text/javascript');
      script.setAttribute('src', EPUBJS_LOCATION);

      doc.getElementsByTagName('head')[0].appendChild(script);
    });
    */

    this.flow = this.props.flow || "paginated";

    this.manager = this.refs['manager'];

    this.rendition = new Rendition(this.book, {
      flow: this.flow,
      minSpreadWidth: 600,
      manager: this.manager
    });

    // this.rendition.setManager(this.manager);

    this.display = this.rendition.display;

    if (this.props.location) {
      this.rendition.display(this.props.location);
    } else {
      this.rendition.display(0);
    }

    this.rendition.on("locationChanged", (visibleLocation)=> {

      this._visibleLocation = visibleLocation;

      if (this.props.onLocationChange) {
        this.props.onLocationChange(visibleLocation);
      }
    });

    this.book.loaded.navigation.then((toc) => this.setState({toc}));
  }

  visibleLocation() {
    return this._visibleLocation;
  }

  _onShown(shouldShow) {
    this.setState({show: shouldShow});
  }

  render() {

    var loader;
    if (!this.state.show) {
      loader = (
        <View style={styles.loadScreen}>
          <ActivityIndicator
              color={this.props.color || "black"}
              size={this.props.size || "large"}
              style={{ flex: 1 }}
            />
        </View>);
    }

    return (
      <View style={styles.container}>

        <EpubViewManager
          ref="manager"
          style={styles.manager}
          flow={this.flow}
          request={this.book.load.bind(this.book)}
          onPress={this.props.onPress}
          onShow={this._onShown.bind(this)}
          bounds={{ width: this.props.width || this.bounds.width,
                    height: this.props.height || this.bounds.height }}
        />
        {loader}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
  },
  manager: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
    marginTop: 0,
    flexDirection: 'row',
    flexWrap: 'nowrap',
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
    justifyContent: 'center',
    alignItems: 'center'
  }
});

module.exports = Epub;
