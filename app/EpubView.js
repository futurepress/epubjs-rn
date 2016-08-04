import React, { Component } from 'react'

import {
  StyleSheet,
  View,
	WebView,
  Text,
  Dimensions,
  TouchableWithoutFeedback,
} from 'react-native';

import WebViewBridge from 'react-native-webview-bridge';

const RSVP = require('epubjs').RSVP;

class EpubView extends Component {

	constructor(props) {
		super(props);

    var bounds = Dimensions.get('window');
    var horizontal = this.props.horizontal;

		this.state = {
			visibility: true,
      height: horizontal ? bounds.height : 0,
      width: horizontal ? 0 : bounds.width,
      contents: '',
		}

    this.visible = true;

    this.waiting = {};

    this.contents = {
      width: (w) => this.ask("width", [w]),
      height: (h) => this.ask("height", [h]),
      textWidth: () => this.ask("textWidth"),
      textHeight: () => this.ask("textHeight"),
      scrollWidth: () => this.ask("scrollWidth"),
      scrollHeight: () => this.ask("scrollHeight"),
      overflow: (overflow) => this.ask("overflow", [overflow]),
      css: (property, value) => this.ask("css", [property, value]),
      viewport: () => this.ask("viewport"),
      addStylesheet: (src) => this.ask("addStylesheet", [src]),
      addStylesheetRules: (rules) => this.ask("addStylesheetRules", [rules]),
      addScript: (src) => this.ask("addScript", [src]),
      range: (_cfi, ignoreClass) => this.ask("addStylesheet", [_cfi, ignoreClass]),
      map: (map) => this.ask("addStylesheet", [map]),
    }

    this.rendering = new RSVP.defer();
    this.rendered = this.rendering.promise;

    this.loading = true;

	}

  componentWillMount() {
    console.log("start load");
    this.props.section.render()
      .then((contents) => {
        this.setState({ contents });
      });
  }

  componentDidMount() {
    this.bridge = this.refs.webviewbridge;
  }

  reset() {
    // this.rendering = new RSVP.defer();
    // this.rendered = this.rendering.promise;
    this.waiting = {};

    this.loading = true;
  }


  _injectScript() {

    function _ready(bridge) {
      // var bridge = window.WebViewBridge;
      var contents = new ePub.Contents(document);

      bridge.onMessage = function (message) {
        var decoded = JSON.parse(message);
        var response;
        var result;

        // alert('msg: ' + decoded.method);
        if (decoded.method in contents) {

          result = contents[decoded.method].apply(contents, decoded.args);

          response = JSON.stringify({
            method: decoded.method,
            promise: decoded.promise,
            value: result
          });

          bridge.send(response);

        }
      };

      contents.on("resize", function (size) {
        bridge.send(JSON.stringify({method:"resize", value: size }));
      })

      // Will only trigger on font load in chrome, for now
      contents.on("expand", function () {
        bridge.send(JSON.stringify({method:"expand", value: true}));
      })

      bridge.send(JSON.stringify({method:"loaded", value: true}));

    }

    return `
      (function () {
        ${_ready.toString()}

        document.onreadystatechange = function() {
          if (document.readyState === "complete") {
            bridge.send(JSON.stringify({method:"ready", value: true}));
          }
        }

        if (WebViewBridge) {
          _ready(WebViewBridge);
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

    this.bridge.sendToBridge(str);
  }

  ask(method, args) {
    var asking = new RSVP.defer();
    var promiseId = asking.promise._id;

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

    if (this.expanding || this.loading) {
      return;
    }
    this.expanding = true;

    if (this.props.horizontal) {

      expanded = this.contents.height(this.state.height).then((h) => {
        return this.contents.scrollWidth();
      }).then((w) => {
        var defered = new RSVP.defer();

        width = (this.props.spreadWidth) * Math.ceil(w / this.props.spreadWidth);
        console.log("Pages", Math.ceil(w / this.props.spreadWidth) );

        this.setState({ width }, () => {
          this.expanding = false;
          defered.resolve();
        });

        return defered.promise;

      });
    } else {
      expanded = this.contents.width(this.state.width).then((w) => {
        return this.contents.scrollHeight();
      }).then((h) => {
        var defered = new RSVP.defer();
        height = h;
        console.log("Height", height);

        this.setState({ height }, () => {
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

    this.bridge = this.refs.webviewbridge;

    if (this.props.horizontal) {
      format = this.contents.css("padding", `${this.props.gap/2}px ${this.props.gap/2}px`).then( () => {
        return this.props.format(this.contents);
      });
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

    var decoded = JSON.parse(msg);
    var p;
    // console.log("msg", msg);

    if (decoded.method === "log") {
      console.log("msg", msg);
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


	render() {

    if (this.state.visibility === false || !this.state.contents) {
      return (
        <View
          ref="wrapper"
          style={{width: this.state.width, height: this.state.height, overflow: "hidden"}}
          ></View>
      );
    }

		return (
      <View
        ref="wrapper"
        style={{width: this.state.width, height: this.state.height, overflow: "hidden"}}
        onLayout={this._onLayout.bind(this)}
        >
        <TouchableWithoutFeedback onPress={this.props.onPress.bind(this)}>
        <WebViewBridge
          ref="webviewbridge"
          key={`EpubViewSection:${this.props.section.index}`}
          style={{width: this.state.width, height: this.state.height, overflow: "hidden"}}
          source={{html: this.state.contents}}
          scalesPageToFit={false}
          scrollEnabled={false}
          onLoadEnd={this._onLoad.bind(this)}
          onBridgeMessage={this._onBridgeMessage.bind(this)}
          injectedJavaScript={this._injectScript()}
        />
        </TouchableWithoutFeedback>

      </View>
		);
	}

}

module.exports = EpubView;
