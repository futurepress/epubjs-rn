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

class Reader extends Component {

	constructor(props) {
		super(props);

    this.book_url = this.props.src || this.props.row.book_url;

		this.state = {
			title: '',//this.props.row.title,
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

    // this.setState({
    //   book : ePub(this.state.book_url)
    // });

		global.book = this.book;

    this.rendition = new Rendition(this.book, {});
    this.manager = this.refs['manager'];

    this.rendition.setManager(this.manager);

    // load epubjs in views
    book.spine.hooks.content.register(function(doc, section) {
      var script = doc.createElement('script');
      script.setAttribute('type', 'text/javascript');
      script.setAttribute('src', `file://${RNFS.MainBundlePath}/epub.js`);

      doc.getElementsByTagName('head')[0].appendChild(script);
    });

    this.rendition.start();

    this.horizontal = this.props.paginated;

    if (this.horizontal) {
      this.rendition.layout = new Layout.Reflowable();
    } else {
      this.rendition.layout = new Layout.Scroll();
    }


    this.spreads = 1;
    this.gap = 60;
    this.height = Dimensions.get('window').height;
    this.width = Dimensions.get('window').width;

    this.rendition.layout.calculate(
        this.width,
        this.height,
        this.gap,
        this.spreads
      );

    // fixes
    // this.rendition.layout.column = this.rendition.layout.column - 20

    this.layout = this.rendition.layout;
    this.display = this.rendition.display;

    if (this.props.location) {
      this.rendition.display(this.props.location);
    } else {
      this.rendition.display(0);
    }

		this.book.loaded.navigation.then((toc) => this.setState({toc}));

    // this.props.hideNavBar(true);

    // setTimeout(() => {
    //   if (this.state.showMenus) {
    //     this._toggleMenus();
    //   }
    // }, 3200);

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
          horizontal={this.horizontal}
          layout={this.layout}
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
  },
	web: {
		// height: 200,
		// width: 200
  },
	toolbar: {
		backgroundColor: '#f7f7f7',
		flex: 1,
		height: 60,
		flexDirection: 'row',
		flexWrap: 'nowrap',
		justifyContent: "center",
		alignItems: "center",
		borderTopColor: "#b2b2b2",
		borderTopWidth: .5,
		position: 'absolute',
		left: 0,
		bottom: 0,
		width: 400
	},
	toolbar_item: {
		flex: 1,
    alignItems: 'center',
		width: 40,
	},
	toolbar_icon: {
		marginLeft: -40,
	},
	toolbar_slider: {
		flex: 2,
		width: 200,
		alignItems: 'center',
	},
  topbar: {
		backgroundColor: '#f7f7f7',
		flex: 1,
		height: 60,
		flexDirection: 'row',
		flexWrap: 'nowrap',
		justifyContent: "space-between",
		alignItems: "center",
		borderBottomColor: "#b2b2b2",
		borderBottomWidth: .5,
		position: 'absolute',
		left: 0,
		top: 0,
	},
  topbar_item: {
    marginTop: 10,
    paddingLeft: 10,
		flex: 1,
    // alignItems: 'flex-start',
	},
  topbar_title: {
    marginTop: 10,
    paddingLeft: 10,
    flex: 2,
    // justifyContent: "space-between",
    // alignItems: "center",
  },
	modal: {
		backgroundColor: "white",
	}
});

module.exports = Reader;
