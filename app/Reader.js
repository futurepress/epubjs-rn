import React, {
  Component,
  StyleSheet,
  Text,
  View,
	ScrollView,
	WebView,
	Dimensions,
} from 'react-native';

const ePub = require('epubjs');


class Reader extends Component {
	constructor(props) {
		super(props);

		this.state = {
			contents: undefined,
			spinePos: 6,
			toc: [],
		}

		var bounds = Dimensions.get('window');
		this.width = bounds.width;
		this.height = bounds.height;

	}

	componentDidMount() {
		// Load the book
		this.book = new ePub(this.props.src);

		// Listen for the book ready
		this.book.opened.then(() => {

			// Get chap 1
			this.book.spine.get(this.state.spinePos).render().then(
				(contents) => {
					this.setState({contents})
				}, (err) => console.error(err));
		
		});

		this.book.loaded.navigation.then((toc) => this.setState({toc}));

	}

	render() {
		return (
      <WebView
        ref="webviewbridge"
				styles={[styles.web, {width: this.width, height: this.height}]}
        source={{html: this.state.contents}}
      />
		);
	}

}

const styles = StyleSheet.create({
	web: {
    flex: 1,
		alignSelf: 'stretch',
  },
});

module.exports = Reader;
