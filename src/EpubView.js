import React, { Component } from 'react'

import {
  StyleSheet,
  View,
  WebView,
  Text,
  Dimensions,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Platform
} from 'react-native';

import EventEmitter from 'event-emitter'

import WKWebView from 'react-native-wkwebview-reborn';

const core = require("epubjs/lib/utils/core");

const DOMAIN = "http://futurepress.org";

class EpubView extends Component {

  constructor(props) {
    super(props);

    let { width, height } = this.getBounds();

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

  shouldComponentUpdate(nextProps, nextState) {
    if (nextState.contents != this.state.contents) {
      return true;
    }

    if (nextState.width != this.state.width) {
      return true;
    }

    if (nextState.height != this.state.height) {
      return true;
    }

    if (nextState.visibility != this.state.visibility) {
      return true;
    }

    if (nextProps.style != this.props.style) {
      return true;
    }

    if (nextProps.backgroundColor != this.props.backgroundColor) {
      return true;
    }

    if (nextProps.color != this.props.color) {
      return true;
    }

    if (nextProps.size != this.props.size) {
      return true;
    }

    if (nextState.innerHeight != this.state.innerHeight) {
      return true;
    }

    if (nextState.marginLeft != this.state.marginLeft) {
      return true;
    }

    if (nextState.marginTop != this.state.marginTop) {
      return true;
    }

    if (nextState.opacity != this.state.opacity) {
      return true;
    }

    if (nextProps.origin != this.props.origin) {
      return true;
    }

    if (nextProps.layout != this.props.layout) {
      return true;
    }

    if (nextProps.delta != this.props.delta) {
      return true;
    }

    return false;
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.props.layout != prevProps.layout) {
      let { width, height } = this.getBounds();

      this.setState({ width, height });

      if (this.loading === false) {

        if (this.props.layout.name === "pre-paginated") {
          format = this.props.format(this.contents);
        } else if (this.props.horizontal) {
          format = this.props.format(this.contents);
        } else {
          format = this.contents.css("padding", `${this.props.gap/2}px ${this.props.gap}px`)
            .then(() => {
              return this.props.format(this.contents);
            });
        }

        format.then( () => {
           this.expand();
        });

      }
    }
  }

  getBounds () {
    let horizontal = this.props.horizontal;
    let height = this.props.boundsHeight;
    let width = 0;

    if (this.props.layout.name === "pre-paginated") {
      width = horizontal ? this.props.columnWidth : this.props.boundsWidth;

      if (this.props.spreads && this.props.section.index === this.props.lastSectionIndex && this.props.section.index % 2 > 0) {
        width = horizontal ? this.props.columnWidth * 2 : this.props.boundsWidth;
      }
    } else {
      width = horizontal ? this.props.delta : this.props.boundsWidth;
    }

    return { width, height };
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
    // this.refs.webviewbridge.evaluateJavaScript("document.dispatchEvent(new MessageEvent('message', {data: " + str + "}));")
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
    console.log("expanding", this.index);
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
          console.log("expanded", this.index, width);
        });

        return defered.promise;

      });
    } else {
      expanded = this.contents.width(this.state.width).then((w) => {
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
          console.log("expanded", this.index, height);
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
      format = this.contents.css("padding", `${this.props.gap/2}px ${this.props.gap}px`)
        .then(() => {
          return this.props.format(this.contents);
        });
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
    var decoded;
    if (typeof msg === "string") {
      decoded = JSON.parse(msg);
    } else {
      decoded = msg; // webkit may pass parsed objects
    }
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

    // __DEV__ && console.log("visibility", this.props.section.index, visibility);

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
    const WebViewer = (Platform.OS === 'ios') ? WKWebView : WebView;

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
            opacity: this.state.opacity,
            backgroundColor: this.props.backgroundColor || "#FFFFFF"
          }
        ]}
        onLayout={this._onLayout.bind(this)}
        collapsable={false}
        >
        <TouchableWithoutFeedback onPress={this.props.onPress}>
        <WebViewer
          ref="webviewbridge"
          key={`EpubViewSection:${this.props.section.index}`}
          style={{
            width: this.state.width,
            height: this.state.innerHeight,
            marginLeft: this.state.marginLeft,
            marginTop: this.state.marginTop,
            backgroundColor: this.props.backgroundColor || "#FFFFFF",
            overflow: "hidden" }}
          source={{html: this.state.contents, baseUrl: this.props.origin || DOMAIN }}
          scalesPageToFit={false}
          scrollEnabled={false}
          onLoadEnd={this._onLoad.bind(this)}
          onMessage={this._onBridgeMessage.bind(this)}
          javaScriptEnabled={true}
        />
        </TouchableWithoutFeedback>
      </View>
    );
  }

}

EventEmitter(EpubView.prototype);

module.exports = EpubView;
