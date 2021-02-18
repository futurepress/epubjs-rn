import React, { Component } from "react"

import {
  StyleSheet,
  View,
  ActivityIndicator,
  Dimensions,
  Platform,
  AppState,
  TouchableOpacity
} from "react-native";

import { WebView } from 'react-native-webview';

import EventEmitter from 'event-emitter'

import AsyncStorage from '@react-native-community/async-storage';

const URL = require("epubjs/libs/url/url-polyfill.js");

const EMBEDDED_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, user-scalable=no, shrink-to-fit=no, viewport-fit=cover">
  <title>epubjs</title>
  <script>${process.env.POLYFILL}</script>
  <script>${process.env.EPUBJS}</script>
  <script>${process.env.BRIDGE}</script>
  <style>
    body {
      margin: 0;
      -webkit-tap-highlight-color: rgba(0,0,0,0);
      -webkit-tap-highlight-color: transparent; /* For some Androids */
    }

    /* For iPhone X Notch */
    @media only screen
      and (min-device-width : 375px)
      and (max-device-width : 812px)
      and (-webkit-device-pixel-ratio : 3) {
      body {
        padding-top: calc(env(safe-area-inset-top) / 2);
      }
    }
  </style>
</head><body></body></html>
`;

class Rendition extends Component {
  constructor(props) {
    super(props);

    this.framerRef = React.createRef();
    this.webviewbridgeRef = React.createRef();

    this.state = {
      loaded: false,
    }

  }

  componentDidMount() {
    this._isMounted = true;

    if (this.props.url) {
      this.load(this.props.url);
    }
  }

  componentWillUnmount() {
    this._isMounted = false;
    this.destroy();
  }

  componentDidUpdate(prevProps) {
    if (prevProps.url !== this.props.url) {
      this.load(this.props.url);
    }

    if (prevProps.display !== this.props.display) {
      // this.setState({ loaded: false });
      this.display(this.props.display);
    }

    if (prevProps.orientation !== this.props.orientation) {
      // this.setState({ loaded: false });
    }

    if (prevProps.flow !== this.props.flow) {
      this.flow(this.props.flow || "paginated");
    }

    if (prevProps.themes !== this.props.themes) {
      this.themes(this.props.themes);
    }

    if (prevProps.themes !== this.props.theme) {
      this.theme(this.props.theme);
    }

    if (prevProps.fontSize !== this.props.fontSize) {
      this.fontSize(this.props.fontSize);
    }

    if (prevProps.font !== this.props.font) {
      this.font(this.props.font);
    }

    if (prevProps.width !== this.props.width ||
        prevProps.height !== this.props.height) {
      this.resize(this.props.width, this.props.height);
    }
  }

  load(bookUrl) {
    if (!this._webviewLoaded) return;

    __DEV__ && console.log("loading book: ", bookUrl);

    let config = {
      "minSpreadWidth": this.props.minSpreadWidth || 815,
      "flow": this.props.flow || "paginated",
      "gap": this.props.gap,
      "fullsize": true
    };

    if (this.props.stylesheet) {
      config.stylesheet = this.props.stylesheet;
    }

    if (this.props.webviewStylesheet) {
      config.webviewStylesheet = this.props.webviewStylesheet;
    }

    if (this.props.script) {
      config.script = this.props.script;
    }

    if (this.props.width) {
      config.width = this.props.width;
    }

    if (this.props.height) {
      config.height = this.props.height;
    }

    if (this.props.disableOrientationEvent) {
      config.resizeOnOrientationChange = this.props.resizeOnOrientationChange;
    }

    this.sendToBridge("open", [bookUrl, config]);

    this.display(this.props.display);

    if (this.props.themes) {
      this.themes(this.props.themes);
    }

    if (this.props.theme) {
      this.theme(this.props.theme);
    }

    if (this.props.fontSize) {
      this.fontSize(this.props.fontSize);
    }

    if (this.props.font) {
      this.font(this.props.font);
    }
  }

  display(target) {
    let spine = typeof target === "number" && target;

    if (!this._webviewLoaded) return;

    if (spine) {
      this.sendToBridge("display", [{ "spine": spine}]);
    } else if (target) {
      this.sendToBridge("display", [{ "target": target}]);
    } else {
      this.sendToBridge("display");
    }
  }

  resize(w, h) {
    if (!w || !h) {
      return;
    }
    this.sendToBridge("resize", [w,h]);
  }

  flow(f) {
    this.sendToBridge("flow", [f]);
  }

  themes(t) {
    this.sendToBridge("themes", [t]);
  }

  theme(t) {
    this.sendToBridge("theme", [t]);
  }

  font(f) {
    this.sendToBridge("font", [f]);
  }

  fontSize(f) {
    this.sendToBridge("fontSize", [f]);
  }

  override(name, value, priority) {
    this.sendToBridge("override", [name, value, priority]);
  }

  gap(gap) {
    this.sendToBridge("gap", [gap]);
  }

  setLocations(locations) {
    this.locations = locations;
    if (this.isReady) {
      this.sendToBridge("setLocations", [this.locations]);
    }
  }

  reportLocation() {
    if (this.isReady) {
      this.sendToBridge("reportLocation");
    }
  }

  highlight (cfiRange, data, cb, className, style) {
    this.sendToBridge("highlight", [cfiRange, data, cb, className,style]);
  }

  underline (cfiRange, data) {
    this.sendToBridge("underline", [cfiRange, data]);
  }

  mark (cfiRange, data) {
    this.sendToBridge("mark", [cfiRange, data]);
	}

  unhighlight (cfiRange) {
    this.sendToBridge("removeAnnotation", [cfiRange, "highlight"]);
	}

	ununderline (cfiRange) {
    this.sendToBridge("removeAnnotation", [cfiRange, "underline"]);
	}

	unmark (cfiRange) {
    this.sendToBridge("removeAnnotation", [cfiRange, "mark"]);
	}

  next() {
    this.sendToBridge("next");
  }

  prev() {
    this.sendToBridge("prev");
  }

  destroy() {

  }

  postMessage(str) {
    if (this.webviewbridgeRef.current) {
      return this.webviewbridgeRef.current.webviewbridge.postMessage(str);
    }
  }

  sendToBridge(method, args, promiseId) {
    var str = JSON.stringify({
      method: method,
      args: args,
      promise: promiseId
    });

    if (!this.webviewbridgeRef.current) {
      return;
    }

    this.webviewbridgeRef.current.postMessage(str);
  }

  _onWebViewLoaded() {
    this._webviewLoaded = true;
    if (this.props.url) {
      this.load(this.props.url);
    }
  }

  _onBridgeMessage(e) {
    var msg = e.nativeEvent.data;
    var decoded;
    if (typeof msg === "string") {
      decoded = JSON.parse(msg);
    } else {
      decoded = msg; // webkit may pass parsed objects
    }
    var p;

    switch (decoded.method) {
      case "log": {
        console.log.apply(console.log, [decoded.value]);
        break;
      }
      case "error": {
        if (this.props.onError) {
          this.props.onError(decoded.value);
        } else {
          console.error.apply(console.error, [decoded.value]);
        }
        break;
      }
      case "loaded": {
        this._onWebViewLoaded();
        break;
      }
      case "rendered": {
        if (!this.state.loaded) {
          this.setState({loaded: true});
        }
        break;
      }
      case "relocated": {
        let {location} = decoded;
        this._relocated(location);
        if (!this.state.loaded) {
          this.setState({loaded: true});
        }
        break;
      }
      case "resized": {
        let {size} = decoded;
        console.log("resized", size.width, size.height);
        break;
      }
      case "press": {
        this.props.onPress && this.props.onPress(decoded.cfi, decoded.position, this);
        break;
      }
      case "longpress": {
        this.props.onLongPress && this.props.onLongPress(decoded.cfi, this);
        break;
      }
      case "dblpress": {
        this.props.onDblPress && this.props.onDblPress(decoded.cfi, decoded.position, decoded.imgSrc, this);
        break;
      }
      case "selected": {
        let {cfiRange} = decoded;
        this._selected(cfiRange);
        break;
      }
      case "markClicked": {
        let {cfiRange, data} = decoded;
        this._markClicked(cfiRange, data);
        break;
      }
      case "added": {
        let {sectionIndex} = decoded;
        this.props.onViewAdded && this.props.onViewAdded(sectionIndex);
        break;
      }
      case "removed": {
        let {sectionIndex} = decoded;
        this.props.beforeViewRemoved && this.props.beforeViewRemoved(sectionIndex);
        break;
      }
      case "ready": {
        this._ready();
        break;
      }
      default: {
        console.log("msg", decoded);
      }
    }
  }

  _relocated(visibleLocation) {
    this._visibleLocation = visibleLocation;
    if (this.props.onRelocated) {
      this.props.onRelocated(visibleLocation, this);
    }
  }

  _selected(cfiRange) {
    if (this.props.onSelected) {
      this.props.onSelected(cfiRange, this);
    }
  }

  _markClicked(cfiRange, data) {
    if (this.props.onMarkClicked) {
      this.props.onMarkClicked(cfiRange, data, this);
    }
  }

  _ready() {
    this.isReady = true;
    if (this.locations) {
      this.sendToBridge("setLocations", [this.locations]);
    }
    this.props.onDisplayed && this.props.onDisplayed();
  }

  render() {
    let loader = (
      <TouchableOpacity onPress={() => this.props.onPress('')} style={styles.loadScreen}>
        <View style={[styles.loadScreen, {
            backgroundColor: this.props.backgroundColor || "#FFFFFF"
          }]}>
            <ActivityIndicator
                color={this.props.color || "black"}
                size={this.props.size || "large"}
                style={{ flex: 1 }}
              />
        </View>
      </TouchableOpacity>
    );

    if (!this.props.url) {
      return loader;
    }

    return (
      <View ref={this.framerRef} style={[styles.container, {
          maxWidth: this.props.width, maxHeight: this.props.height,
          minWidth: this.props.width, minHeight: this.props.height
        }]}>
        <WebView
          showsHorizontalScrollIndicator={this.props.showsHorizontalScrollIndicator}
          showsVerticalScrollIndicator={this.props.showsVerticalScrollIndicator}
          ref={this.webviewbridgeRef}
          source={{html: EMBEDDED_HTML, baseUrl: this.props.url}}
          style={[styles.manager, {
            backgroundColor: this.props.backgroundColor || "#FFFFFF"
          }]}
          bounces={false}
          javaScriptEnabled={true}
          scrollEnabled={this.props.scrollEnabled}
          pagingEnabled={this.props.pagingEnabled}
          onMessage={this._onBridgeMessage.bind(this)}
          contentInsetAdjustmentBehavior="never"
          contentInset={{top: 0}}
          automaticallyAdjustContentInsets={false}
          originWhitelist={['*']}
          allowsLinkPreview={false}
        />
        {!this.state.loaded ? loader : null}
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

Rendition.defaultProps = {
  showsHorizontalScrollIndicator: true,
  showsVerticalScrollIndicator: true,
};

EventEmitter(Rendition.prototype);

export default Rendition;
