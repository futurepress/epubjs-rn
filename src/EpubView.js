import React, { Component } from 'react'

import {
  StyleSheet,
  View,
  WebView,
  Text,
  Dimensions,
  TouchableWithoutFeedback,
  ActivityIndicator
} from 'react-native';

// import WebViewBridge from 'react-native-webview-bridge';
import EventEmitter from 'event-emitter'
const core = require("epubjs/lib/utils/core");
const INJECTED_SCRIPT = `
  window.epubContents = undefined;
  (function () {
    var waitForReactNativePostMessageReady;

    function _ready() {
      var contents;
      var targetOrigin = "*";

      var isReactNativePostMessageReady = !!window.originalPostMessage;
      clearTimeout(waitForReactNativePostMessageReady);
      if(!isReactNativePostMessageReady) {
        waitForReactNativePostMessageReady = setTimeout(_ready, 1);
      }

      if (typeof EPUBJSContents === "undefined") {
        return window.postMessage(JSON.stringify({
          method: "error",
          value: "EPUB.js is not loaded"
        }), targetOrigin);
      }

      contents = new EPUBJSContents(document);

      contents.setCfiBase = function(cfiBase) {
        contents.cfiBase = cfiBase;
      };

      var preventTap = false;
      contents.mark = function(cfiRange, data) {
        var m = EPUBJSContents.prototype.mark.call(contents, cfiRange, data);
        m.addEventListener("touchstart", function (e) {
          var bounds = e.target.getBoundingClientRect();
          var clientX = e.targetTouches[0].pageX;
          if (clientX > bounds.right) {
            preventTap = true;
            window.postMessage(JSON.stringify({method:"markClicked", data: data, cfiRange: cfiRange }), targetOrigin);
          }
        });
        return m;
      };

      document.addEventListener("message", function (e) {
        var message = e.data;
        var decoded = JSON.parse(message);
        var response;
        var result;

        if (decoded.method in contents) {
          result = contents[decoded.method].apply(contents, decoded.args);

          response = JSON.stringify({
            method: decoded.method,
            promise: decoded.promise,
            value: result
          });

          window.postMessage(response, targetOrigin);

        }
      });

      contents.on("resize", function (size) {
        window.postMessage(JSON.stringify({method:"resize", value: size }), targetOrigin);
      });

      contents.on("expand", function () {
        window.postMessage(JSON.stringify({method:"expand", value: true}), targetOrigin);
      });

      contents.on("link", function (href) {
        window.postMessage(JSON.stringify({method:"link", value: href}), targetOrigin);
      });

      contents.on("selected", function (sel) {
        preventTap = true;
        window.postMessage(JSON.stringify({method:"selected", value: sel}), targetOrigin);
      });

      var startPosition = { x: -1, y: -1 };
      var currentPosition = { x: -1, y: -1 };
      var isLongPress = false;
      var longPressTimer;
      var touchduration = 300;

      document.getElementsByTagName('body')[0].addEventListener("touchstart", function (e) {
        startPosition.x = e.targetTouches[0].pageX;
        startPosition.y = e.targetTouches[0].pageY;
        currentPosition.x = e.targetTouches[0].pageX;
        currentPosition.y = e.targetTouches[0].pageY;
        isLongPress = false;
        longPressTimer = setTimeout(function() {
          var cfi;
          if (!preventTap) {
            isLongPress = true;
            cfi = contents.cfiFromNode(e.targetTouches[0].target);
            window.postMessage(JSON.stringify({method:"longpress", position: currentPosition, cfi: cfi}), targetOrigin);
          }
        }, touchduration);
      }, false);

      document.getElementsByTagName('body')[0].addEventListener("touchmove", function (e) {
        currentPosition.x = e.targetTouches[0].pageX;
        currentPosition.y = e.targetTouches[0].pageY;
        clearTimeout(longPressTimer);
      }, false);

      document.getElementsByTagName('body')[0].addEventListener("touchend", function (e) {
        clearTimeout(longPressTimer);
        if(Math.abs(startPosition.x - currentPosition.x) < 2 &&
           Math.abs(startPosition.y - currentPosition.y) < 2) {
          setTimeout(function() {
            var cfi;
            if(preventTap || isLongPress) {
              preventTap = false;
              isLongPress = false;
              return;
            }
            cfi = contents.cfiFromNode(e.changedTouches[0].target);
            window.postMessage(JSON.stringify({method:"press", position: currentPosition, cfi: cfi}), targetOrigin);
          }, 10);
        }
      }, false);

      window.postMessage(JSON.stringify({method:"ready", value: true}), targetOrigin);

      window.epubContents = contents;
    }

    if ( document.readyState === 'complete' ) {
      _ready();
    } else {
      window.addEventListener("load", _ready, false);
    }
  }());
`;

const DOMAIN = "http://futurepress.org";

class EpubView extends Component {

  constructor(props) {
    super(props);
    var horizontal = this.props.horizontal;

    let height = this.props.bounds.height;
    let width = 0;

    if (this.props.layout.name === "pre-paginated") {
      width = horizontal ? this.props.columnWidth : this.props.bounds.width;

      if (this.props.spreads &&
          this.props.section.index === this.props.lastSectionIndex &&
          this.props.section.index % 2 > 0 ) {
        width = horizontal ? this.props.columnWidth * 2 : this.props.bounds.width;
      }

    } else {
      width = horizontal ? this.props.delta : this.props.bounds.width;
    }

    this.state = {
      visibility: false,
      opacity: 0,
      marginLeft: 0,
      marginTop: 0,
      height: height,
      width: width,
      innerHeight: height,
      contents: '',
    }

    this.visible = this.state.visibility;

    this.waiting = {};

    this.contents = {
      width: (w) => this.ask("width", [w]),
      height: (h) => this.ask("height", [h]),
      textWidth: () => this.ask("textWidth"),
      textHeight: () => this.ask("textHeight"),
      scrollWidth: () => this.ask("scrollWidth"),
      scrollHeight: () => this.ask("scrollHeight"),
      contentHeight: () => this.ask("contentHeight"),
      overflow: (overflow) => this.ask("overflow", [overflow]),
      overflowY: (overflow) => this.ask("overflowY", [overflow]),
      css: (property, value) => this.ask("css", [property, value]),
      addClass: (className) => this.ask("addClass", [className]),
      removeClass: (className) => this.ask("removeClass", [className]),
      viewport: () => this.ask("viewport"),
      addStylesheet: (src) => this.ask("addStylesheet", [src]),
      addStylesheetRules: (rules) => this.ask("addStylesheetRules", [rules]),
      addScript: (src) => this.ask("addScript", [src]),
      range: (_cfi, ignoreClass) => this.ask("addStylesheet", [_cfi, ignoreClass]),
      map: (map) => this.ask("map", [map]),
      columns: (width, height, columnWidth, gap) => this.ask("columns", [width, height, columnWidth, gap]),
      fit: (width, height) => this.ask("fit", [width, height]),
      size: (width, height) => this.ask("size", [width, height]),
      mapPage: (cfiBase, layout, start, end, dev) => this.ask("mapPage", [cfiBase, layout, start, end, dev]),
      locationOf: (target) => this.ask("locationOf", [target]),
      setCfiBase: (cfiBase) => this.ask("setCfiBase", [cfiBase]),
      highlight: (cfiRange, data) => this.ask("highlight", [cfiRange, data]),
      underline: (cfiRange, data) => this.ask("underline", [cfiRange, data]),
      mark: (cfiRange, data) => this.ask("mark", [cfiRange, data]),
      unhighlight: (cfiRange) => this.ask("unhighlight", [cfiRange]),
      ununderline: (cfiRange) => this.ask("ununderline", [cfiRange]),
      unmark: (cfiRange) => this.ask("unmark", [cfiRange])
    }

    EventEmitter(this.contents);

    this.rendering = new core.defer();
    this.rendered = this.rendering.promise;

    this.displaying = new core.defer();
    this.displayed = this.displaying.promise;

    this.loading = true;
    this.expanded = false;

    this.index = this.props.section && this.props.section.index;
  }

  componentWillMount() {
    // this.sectionRendering = this.props.section.render(this.props.request);
      // .then((contents) => {
      //   console.log("Still mounted?", this.mounted, this.props.section.index);
      //   if (!this.mounted) {
      //     return; // Prevent updating an unmounted component
      //   }
      //   this.setState({ contents }, function () {
      //     // console.log("done setting", contents.length);
      //   });
      // });
  }

  componentDidMount() {

    this.mounted = true;


  }

  componentWillUnmount() {
    this.mounted = false;
    this.props.section.unload();
  }

  load() {
    var loaded = new core.defer();

    if (!this.sectionRendering) {
      this.sectionRendering = this.props.section.render(this.props.request);
    }

    // console.log("loading", this.props.section.index);

    if (!this.state.contents) {
      this.sectionRendering.then((contents) => {
          if (!this.mounted) {
            return; // Prevent updating an unmounted component
          }
          this.setState({ contents }, () => {

            this.rendering.resolve();
            loaded.resolve();
            // console.log("done setting", this.props.section.index, contents.length);
          });
        });
    } else {
      loaded.resolve();
    }

    return loaded.promise;
  }

  reset() {
    // this.rendering = new RSVP.defer();
    // this.rendered = this.rendering.promise;
    this.waiting = {};

    this.loading = true;
  }

  postMessage(str) {
    if (this.refs.webviewbridge) {
      return this.refs.webviewbridge.postMessage(str);
    }
  }

  sendToBridge(method, args, promiseId) {
    var str = JSON.stringify({
      method: method,
      args: args,
      promise: promiseId
    });

    if (!this.refs.webviewbridge) {
      return;
    }
    // console.log("send", this.props.section.index, method);

    this.refs.webviewbridge.postMessage(str);
  }

  ask(method, args) {
    var asking = new core.defer();
    var promiseId = asking.id;

    if(method in this.waiting) {
      this.waiting[promiseId].push(asking)
    } else {
      this.waiting[promiseId] = [asking];
    }

    this.sendToBridge(method, args, promiseId);

    return asking.promise;
  }

  expand() {
    var width, height;
    var expanded;
    var expanding;

    // if (this.expanding || this.loading) {
    //   return;
    // }
    this.expanding = true;

    if (this.props.layout.name === "pre-paginated") {
      // this.expanding = false;
        var defered = new core.defer();
        let width = this.props.columnWidth;
        let marginLeft = 0;

        if (this.props.spreads && this.props.section.index === 0) {
          width = this.props.columnWidth * 2;
          marginLeft = this.props.columnWidth;
        }

        if (this.props.spreads &&
            this.props.section.index === this.props.lastSectionIndex &&
            this.props.section.index % 2 > 0 ) {
          width = this.props.columnWidth * 2;
        }

        this.setState({
          width,
          marginLeft
        }, () => {
          this.expanding = false;

          expanded = this.contents.size(this.props.columnWidth, this.state.height).then((w) => {
            this.expanding = false;
            this.expanded = true;
            this.setState({opacity: 1});
            this.props.onExpanded && this.props.onExpanded(this);
            this.emit("expanded");
            defered.resolve();

          });

        });

        expanded = defered.promise;



    } else if (this.props.horizontal) {
      var margin = this.props.gap / 2;
      var innerHeight = this.state.height - margin;
      expanded = this.contents.height(innerHeight).then((h) => {
        return this.contents.textWidth();
      }).then((w) => {
        var defered = new core.defer();
        width = (this.props.delta) * Math.ceil(w / this.props.delta);

        this.setState({
          width: width,
          marginLeft: margin,
          marginTop: margin/2,
          innerHeight: innerHeight
        }, () => {
          this.expanding = false;
          this.expanded = true;
          this.setState({opacity: 1});
          this.props.onExpanded && this.props.onExpanded(this);
          this.emit("expanded");
          defered.resolve();
        });

        return defered.promise;

      });
    } else {
      expanded = this.contents.width(this.state.width-margin).then((w) => {
        return this.contents.scrollHeight();
      }).then((h) => {
        var defered = new core.defer();
        var margin = 0;

        height = h;
        // console.log("Height", height);

        this.setState({
          height: height,
          innerHeight: height,
          marginLeft: 0,
          marginTop: 0
        }, () => {
          this.expanding = false;
          this.expanded = true;
          this.setState({opacity: 1});
          this.props.onExpanded && this.props.onExpanded(this);
          this.emit("expanded");
          defered.resolve();
        });

        return defered.promise;
      });
    }

    return expanded;
  }

  _onLoad(e) {
    // console.log("Loaded", this.props.section.index, this.props.origin);
    this.bridge = this.refs.webviewbridge;
  }

  _onReady(isReady) {
    var format;

    this.emit("displayed");

    this.setCfiBase();

    if (this.props.layout.name === "pre-paginated") {
      format = this.props.format(this.contents);
    } else if (this.props.horizontal) {
      // format = this.contents.css("padding", `${this.props.gap/2}px ${this.props.gap/2}px`).then( () => {
        // return this.props.format(this.contents);
      // });
      format = this.props.format(this.contents);
    } else {
      format = this.contents.css("padding", `${this.props.gap/2}px ${this.props.gap}px`);
    }

    return format.then( () => {

      this.loading = false;

      return this.expand().then(() => {

        this.displaying.resolve();

        this.props.afterLoad(this.props.section.index);

      });

    });

  }

  _onBridgeMessage(e) {
    var msg = e.nativeEvent.data;
    var decoded = JSON.parse(msg);
    var p;
    // console.log("msg", this.props.section.index, decoded);

    if (decoded.method === "log") {
      __DEV__ && console.log("msg", decoded.value);
    }

    if (decoded.method === "error") {
      console.error(decoded.value);
    }

    if (decoded.method === "resize") {
      this.expand();
    }

    if (decoded.method === "ready") {
      this._onReady();
    }

    if (decoded.method === "link") {
      this.contents.emit("link", decoded.value);
    }

    if (decoded.method === "selected") {
      this.contents.emit("selected", decoded.value);
    }

    if (decoded.method === "markClicked") {
      this.contents.emit("markClicked", decoded.cfiRange, decoded.data);
    }

    if (decoded.method === "press") {
      this.props.onPress && this.props.onPress(decoded.cfi, decoded.position, this.contents);
    }

    if (decoded.method === "longpress") {
      this.props.onLongPress && this.props.onLongPress(decoded.cfi, decoded.position, this.contents);
    }

    if (decoded.promise in this.waiting) {
      p = this.waiting[decoded.promise].shift();
      if (p) {
        p.resolve(decoded.value);
      }
    }

    this.props.onMessage && this.props.onMessage(msg);

  }

  _onLayout(e) {
    var widthDelta, heightDelta;

    if (this.bounds) {
      this.prevBounds = this.bounds;
    }

    this.bounds = e.nativeEvent.layout;

    this.props.onLayout && this.props.onLayout(e.nativeEvent.layout);

    if (this.prevBounds &&
        this.bounds.width === this.prevBounds.width &&
        this.bounds.height === this.prevBounds.height) {
      return;
    }

    if (this.props.onResize && this.bounds.width && this.bounds.height) {
      this.props.onResize && this.props.onResize({
        width: this.bounds.width,
        height: this.bounds.height,
        widthDelta: this.prevBounds ? this.bounds.width - this.prevBounds.width : this.bounds.width,
        heightDelta: this.prevBounds ? this.bounds.height - this.prevBounds.height : this.bounds.height,
      });
    }

  }

  componentWillUpdate(nextProps, nextState) {

    if (nextState.width &&
        nextState.height &&
       (this.state.width !== nextState.width || this.state.height !== nextState.height)) {

      this.props.willResize && this.props.willResize({
        width: nextState.width,
        height: nextState.height,
        widthDelta: nextState.width - this.state.width,
        heightDelta: nextState.height - this.state.height,
      });

    }

  }

  setVisibility(visibility, cb) {

    // if (visibility && (this.expanded === false)) {
    //   console.log("caught unexpanded");
    //   visibility = false;
    // }

    if (this.state.visibility == visibility) {
      cb && cb();
      return; // already have the passed in state, so return early
    }

    this.visible = visibility;

    __DEV__ && console.log("visibility", this.props.section.index, visibility);

    if (visibility == true) {
      this.setState({visibility: true });
      this.load().then(() => {
        cb && cb();
      });
    } else {
      this.setState({visibility: false, opacity: 0}, cb);
      // this.setState({visibility: false}, this.reset.bind(this));
    }
  }

  show () {
    this.setState({opacity: 1});
  }

  hide () {
    this.setState({opacity: 0});
  }

  /*
  shouldComponentUpdate(nextProps, nextState) {

    if (nextState.width !== this.state.width) { return true; }
    if (nextState.height !== this.state.height) { return true; }
    if (nextState.contents !== this.state.contents) { return true; }
    if (nextState.visibility !== this.state.visibility) { return true; }

    // might need to check layout here

    return nextProps.section.index !== this.props.section.index;
  }
  */

  measure(cb){
    if (this.refs.wrapper) {
      this.refs.wrapper.measure(cb);
    }
  }

  position() {
    var bounds = this.bounds;
    var position = {
      'top': 0,
      'bottom': 0,
      'left': 0,
      'right': 0
    }

    if (bounds) {
      position = {
        'top': bounds.y,
        'bottom': bounds.y + bounds.height,
        'left': bounds.x,
        'right': bounds.x + bounds.width
      }
    }

    return position;
  }

  get section() {
    return this.props.section;
  }

  mapPage(start, end) {
    return this.contents.mapPage(this.props.section.cfiBase, this.props.layout, start, end);
  }

  setCfiBase() {
    this.contents.cfiBase = this.props.section.cfiBase;
    this.contents.setCfiBase(this.props.section.cfiBase);
  }

  highlight(cfiRange) {
    this.contents.highlight(cfiRange);
  }

  locationOf(target) {
    var parentPos = this.position();

    return this.contents.locationOf(target).then((targetPos) => {
      return {
        // "left": parentPos.left + targetPos.left,
        // "top":  parentPos.top + targetPos.top
        "left": targetPos.left,
        "top":  targetPos.top
      };
    });

  };

  render() {
    if (!this.state.contents || !this.state.visibility) {
      return (
        <View
          ref="wrapper"
          style={[this.props.style, {
            width: this.state.width,
            height: this.state.height,
            backgroundColor: this.props.backgroundColor || "#FFFFFF",
            overflow: "hidden"
          }]}
          collapsable={false}
          onLayout={this._onLayout.bind(this)}
          >
          <ActivityIndicator
              color={this.props.color || "black"}
              size={this.props.size || "large"}
              style={{ flex: 1 }}
            />
        </View>
      );
    }

    return (
      <View
        ref="wrapper"
        style={[this.props.style, {
            width: this.state.width,
            height: this.state.height,
            overflow: "hidden",
            backgroundColor: this.props.backgroundColor || "#FFFFFF"
          }
        ]}
        onLayout={this._onLayout.bind(this)}
        collapsable={false}
        >
        <TouchableWithoutFeedback onPress={this.props.onPress}>
        <WebView
          ref="webviewbridge"
          key={`EpubViewSection:${this.props.section.index}`}
          style={{
            width: this.state.width,
            height: this.state.innerHeight,
            marginLeft: this.state.marginLeft,
            marginTop: this.state.marginTop,
            backgroundColor: this.props.backgroundColor || "#FFFFFF",
            opacity: this.state.opacity,
            overflow: "hidden" }}
          source={{html: this.state.contents, baseUrl: this.props.origin || DOMAIN }}
          scalesPageToFit={false}
          scrollEnabled={false}
          onLoadEnd={this._onLoad.bind(this)}
          onMessage={this._onBridgeMessage.bind(this)}
          injectedJavaScript={INJECTED_SCRIPT}
          javaScriptEnabled={true}
        />
        </TouchableWithoutFeedback>
      </View>
    );
  }

}

EventEmitter(EpubView.prototype);

module.exports = EpubView;
