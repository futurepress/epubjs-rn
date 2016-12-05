import React, { Component } from 'react'

import {
  StyleSheet,
  View,
  WebView,
  Text,
  Dimensions,
  TouchableWithoutFeedback,
} from 'react-native';

const core = require('epubjs/src/core');

class EpubView extends Component {

  constructor(props) {
    super(props);
    var horizontal = this.props.horizontal;

    var height = horizontal ? this.props.bounds.height : 0;
    var width = horizontal ? 0 : this.props.bounds.width;

    this.state = {
      visibility: true,
      margin: 0,
      height: height,
      width: width,
      contents: '',
    }

    this.visible = true;

    this.waiting = {};

    this.baseUrl = this.props.baseUrl || "http://futurepress.org";

    this._injectedJavaScript = this._injectScript();
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
      viewport: () => this.ask("viewport"),
      addStylesheet: (src) => this.ask("addStylesheet", [src]),
      addStylesheetRules: (rules) => this.ask("addStylesheetRules", [rules]),
      addScript: (src) => this.ask("addScript", [src]),
      range: (_cfi, ignoreClass) => this.ask("addStylesheet", [_cfi, ignoreClass]),
      map: (map) => this.ask("map", [map]),
      columns: (width, height, columnWidth, gap) => this.ask("columns", [width, height, columnWidth, gap]),
      fit: (width, height) => this.ask("fit", [width, height]),
      size: (width, height) => this.ask("size", [width, height]),
      mapPage: (cfiBase, start, end) => this.ask("mapPage", [cfiBase, start, end]),
      locationOf: (target) => this.ask("locationOf", [target])
    }

    this.rendering = new core.defer();
    this.rendered = this.rendering.promise;

    this.loading = true;

  }

  componentWillMount() {

    this.props.section.render(this.props.request)
      .then((contents) => {
        this.setState({ contents }, function () {
          // console.log("done setting", contents.length);
        });
      });
  }

  reset() {
    // this.rendering = new RSVP.defer();
    // this.rendered = this.rendering.promise;
    this.waiting = {};

    this.loading = true;
  }


  _injectScript() {

    return `
      (function () {

        function _ready() {
          var contents;

          if (typeof ePub === "undefined") {
            return window.postMessage(JSON.stringify({
              method: "error",
              value: "EPUB.js is not loaded"
            }));
          }

          contents = new ePub.Contents(document);
          window.contents = contents;
          document.addEventListener('message', function (message) {
            var decoded = JSON.parse(message.data);
            var response;
            var result;

            if (decoded.method in contents) {
              result = contents[decoded.method].apply(contents, decoded.args);

              response = JSON.stringify({
                method: decoded.method,
                promise: decoded.promise,
                value: result
              });

              window.postMessage(response);

            }
        });

          contents.on("resize", function (size) {
            window.postMessage(JSON.stringify({method:"resize", value: size }));
          });

          contents.on("expand", function () {
            window.postMessage(JSON.stringify({method:"expand", value: true}));
          });

          window.postMessage(JSON.stringify({method:"loaded", value: true}));

        }

        if ( document.readyState === 'complete'  ) {
          return _ready();
        } else {
          document.addEventListener( 'interactive', _ready, false );
        }

      }());
    `;
  }

  sendToBridge(method, args, promiseId) {
    var str = JSON.stringify({
      method: method,
      args: args,
      promise: promiseId
    });

    if (!this.bridge) {
      return;
    }

    this.bridge.postMessage(str);
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

    if (this.expanding || this.loading) {
      return;
    }
    this.expanding = true;

    if (this.props.layout === "pre-paginated") {
      // this.expanding = false;
        var defered = new core.defer();

        this.setState({ width: this.props.delta  }, () => {
          this.expanding = false;

          expanded = this.contents.size(this.props.delta, this.state.height).then((w) => {
            this.expanding = false;

            defered.resolve();

          });

        });

        expanded = defered.promise;



    } else if (this.props.horizontal) {
      var margin = this.props.gap / 2;

      expanded = this.contents.height(this.state.height-margin).then((h) => {
        return this.contents.scrollWidth();
      }).then((w) => {
        var defered = new core.defer();

        width = (this.props.delta) * Math.ceil(w / this.props.delta);
        // console.log("Pages", Math.ceil(w / this.props.delta) );

        this.setState({ width, margin }, () => {
          this.expanding = false;
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

        this.setState({ height, margin }, () => {
          this.expanding = false;
          defered.resolve();
        });

        return defered.promise;
      });
    }

    return expanded;
  }

  _onLoad(e) {
    var format;

    if (this.props.layout === "pre-paginated") {
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

        this.rendering.resolve();

        this.props.afterLoad(this.props.section.index);

      });

    });


  }

  _onBridgeMessage(msg) {

    var decoded = JSON.parse(msg.nativeEvent.data);
    var p;
    // console.log("msg", decoded);

    if (decoded.method === "log") {
      console.log("msg", decoded.value);
    }

    if (decoded.method === "error") {
      console.error(decoded.value);
    }

    if (decoded.method === "resize") {
      this.expand();
    }

    if (decoded.promise in this.waiting) {
      p = this.waiting[decoded.promise].shift();
      p.resolve(decoded.value);
    }

  }

  _onLayout(e) {
    var widthDelta, heightDelta;

    if (this.bounds) {
      this.prevBounds = this.bounds;
    }

    this.bounds = e.nativeEvent.layout;

    if (this.prevBounds &&
        this.bounds.width === this.prevBounds.width &&
        this.bounds.height === this.prevBounds.height) {
      return;
    }

    if (this.props.onResize && this.bounds.width && this.bounds.height) {
      this.props.onResize({
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

      this.props.willResize({
        width: nextState.width,
        height: nextState.height,
        widthDelta: nextState.width - this.state.width,
        heightDelta: nextState.height - this.state.height,
      });

    }

  }

  setVisibility(visibility) {

    if (this.state.visibility == visibility) {
      return; // already have the passed in state, so return early
    }

    this.visible = visibility;

    if (visibility == true) {
      this.setState({visibility: true});

    } else if (!this.loading) {
      // this.setState({visibility: false}, this.reset.bind(this));
    }
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

  mapPage(start, end) {
    return this.contents.mapPage(this.props.section.cfiBase, start, end);
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

    if (this.state.visibility === false || !this.state.contents) {
      return (
        <View
          ref="wrapper"
          style={[this.props.style, {width: this.state.width, height: this.state.height, overflow: "hidden"}]}
          ></View>
      );
    }

    return (
      <View
        ref="wrapper"
        style={[this.props.style, {
          width: this.state.width,
          height: this.state.height,
          overflow: "hidden"
          }
        ]}
        onLayout={this._onLayout.bind(this)}
        >
        <TouchableWithoutFeedback onPress={this.props.onPress}>
        <WebView
          ref={webview => { this.bridge = webview }}
          key={`EpubViewSection:${this.props.section.index}`}
          style={[this.props.style, {
            width: this.state.width,
            height: this.state.height,
            marginLeft: this.state.margin,
            marginTop: (this.state.margin/2),
            overflow: "hidden" }]}
          source={{html: this.state.contents, baseUrl: this.baseUrl }}
          scalesPageToFit={false}
          scrollEnabled={false}
          onLoadEnd={this._onLoad.bind(this)}
          onMessage={this._onBridgeMessage.bind(this)}
          injectedJavaScript={this._injectedJavaScript}
          javaScriptEnabled={true}
        />
        </TouchableWithoutFeedback>

      </View>
    );
  }

}

module.exports = EpubView;
