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

const RNFS = require('react-native-fs');

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
    // Load epubjs
    // RNFS.readFile(`${RNFS.MainBundlePath}/epub.min.js`, 'utf8')
    //   .then((result) => {
    //     this.ePubCode = result;
    //     return result;
    //   })
    //   .catch((err) => {
    //     console.log(err.message, err.code);
    //   });



	}

  componentWillMount() {
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

    // this.renderSection();
  }


  _injectScript() {

    function _ready(bridge) {
      // var bridge = window.WebViewBridge;
      var contents = new ePub.Contents(document);

      bridge.onMessage = function (message) {
        var decoded = JSON.parse(message);
        var response;

        // alert('msg: ' + decoded.method);
        if (decoded.method in contents) {
          var result = contents[decoded.method].apply(contents, decoded.args);
        }

        response = JSON.stringify({
          method: decoded.method,
          value: result
        });

        bridge.send(response);

      };

      bridge.send(JSON.stringify({method:"loaded", value: true}));

    }

    return `
      (function () {
        ${_ready.toString()}

        document.onreadystatechange = function() {
          if (document.readyState === "complete") {
            alert("ready")
          }
        }

        if (WebViewBridge) {
          _ready(WebViewBridge);
        }

      }());
    `;
  }

  renderSection() {
    // var renderer = this.props.renderer || this.state.section.render
    return this.props.section.render()
      .then((contents) => {

          this.setState({ contents });

          return this.rendered;
        }
      );
  }

  sendToBridge(method, args) {
    var str = JSON.stringify({
      method: method,
      args: args
    });

    if (!this.bridge) {
      return;
    }

    this.bridge.sendToBridge(str);
  }

  ask(method, args) {
    var asking = new RSVP.defer();

    if(method in this.waiting) {
      this.waiting[method].push(asking)
    } else {
      this.waiting[method] = [asking];
    }

    this.sendToBridge(method, args);

    return asking.promise;
  }

  expand() {
    var width, height;
    if (this.props.horizontal) {
      this.contents.height(this.state.height).then((h) => {
        return this.contents.scrollWidth();
      }).then((w) => {
        width = this.props.spreadWidth *  Math.ceil(w / this.props.spreadWidth);
        console.log("Pages",  Math.ceil(w / this.props.spreadWidth));
        this.setState({ width });
      });
    } else {
      this.contents.width(this.state.width).then((w) => {
        return this.contents.scrollHeight();
      }).then((h) => {
        height = h;
        console.log("Height", h);
        this.setState({ height });
      });
    }


  }

  _onLoad(e) {

    this.bridge = this.refs.webviewbridge;

    if (this.props.horizontal) {
      this.contents.css("margin", `${this.props.gap/2}px ${this.props.gap/2}px`);
    } else {
      this.contents.css("padding", `${this.props.gap/2}px ${this.props.gap}px`);
    }

    this.props.format(this.contents);
    this.expand();

    this.rendering.resolve();

    this.loading = false;

    this.props.afterLoad(this.props.section.index);
  }

  _onBridgeMessage(msg) {
    console.log("msg", msg);

    var decoded = JSON.parse(msg);
    var p;

    if (decoded.method in this.waiting) {
      p = this.waiting[decoded.method].shift();
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
