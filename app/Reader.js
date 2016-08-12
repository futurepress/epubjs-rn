import React, { Component } from 'react'

import {
  StyleSheet,
  Text,
  View,
	Image,
	ScrollView,
	WebView,
	StatusBar,
	TouchableHighlight,
  TouchableWithoutFeedback,
	SliderIOS,
	Modal,
} from 'react-native';

import Dimensions from 'Dimensions';

const ePub = require('epubjs');
const Rendition = require('epubjs/src/rendition');
const Layout = require('epubjs/src/layout');

// const Nav = require('./Nav');

// const Icon = require('react-native-vector-icons/EvilIcons');

const EpubViewManager = require('./EpubViewManager');

const RNFS = require('react-native-fs');

const EPUBJS_LOCATION = `file://${RNFS.MainBundlePath}/epub.js`

class Reader extends Component {

	constructor(props) {
		super(props);

    this.book_url = this.props.src || this.props.row.book_url;

		this.state = {
			title: '',
			modalVisible: false,
			toc: [],
      page: 0,
      statusBarHidden: false,
      showMenus: true,
      height: Dimensions.get('window').height,
      width: Dimensions.get('window').width,
    }

    this.book = ePub(this.book_url);
  }

	componentDidMount() {
		console.log("loading book: ", this.book_url);

		global.book = this.book;

    // load epubjs in views
    book.spine.hooks.content.register(function(doc, section) {
      var script = doc.createElement('script');
      script.setAttribute('type', 'text/javascript');
      script.setAttribute('src', EPUBJS_LOCATION);

      doc.getElementsByTagName('head')[0].appendChild(script);
    });

    this.flow = this.props.flow || "paginated";

    this.rendition = new Rendition(this.book, {
      flow: this.flow
    });

    this.manager = this.refs['manager'];
    this.rendition.setManager(this.manager);


    // this.rendition.flow(this.flow);


    // this.spreads = 1;
    // this.gap = 60;
    // this.height = Dimensions.get('window').height;
    // this.width = Dimensions.get('window').width;

    // this.rendition.layout.calculate(
    //     this.width,
    //     this.height,
    //     this.gap,
    //     this.spreads
    //   );

    // fixes
    // this.rendition.layout.column = this.rendition.layout.column - 20

    // this.layout = this.rendition.layout;
    this.display = this.rendition.display;

    if (this.props.location) {
      this.rendition.display(this.props.location);
    } else {
      this.rendition.display(0);
    }

		this.book.loaded.navigation.then((toc) => this.setState({toc}));

    // this.props.hideNavBar(true);

    setTimeout(() => {
      if (this.state.showMenus) {
        this._toggleMenus();
      }
    }, 3200);

	}

	_setModalVisible(visible) {
		this.setState({
			modalVisible: visible
		});
	}

  _toggleMenus() {
    this.setState({
      statusBarHidden: !this.state.statusBarHidden,
      showMenus: !this.state.showMenus
    })
  }

  _goBack() {
    this.setState({statusBarHidden: false})
    this.props.hideNavBar(false);
    this.props.navigator.pop();
  }


  render() {
    return (
			<View style={styles.container}>
				<StatusBar hidden={this.state.statusBarHidden} showHideTransition="slide" />
				<EpubViewManager
          ref="manager"
          style={styles.manager}
          flow={this.flow}
          // layout={this.layout}
          onPress={this._toggleMenus.bind(this)}
        />
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
  }
});

module.exports = Reader;
