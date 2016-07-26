import React, { Component } from 'react'

import {
  StyleSheet,
  Text,
  View,
	ListView,
	TouchableHighlight,
} from 'react-native';

// import NavigationBar from 'react-native-navbar';

// const Icon = require('react-native-vector-icons/EvilIcons');

const TableView = require('react-native-tableview');
const Section = TableView.Section;
const Item = TableView.Item;
const Cell = TableView.Cell;

class Nav extends Component {

	constructor(props) {
		super(props);

		this.state = {
			error: '',
		}
	}
	_closeModal() {
		this.props.onClose();
	}

  _onPress(event) {
    var item = this.props.toc[event.selectedIndex];
    if(this.props.display) {
      this.props.display(item.href);
    }
    this._closeModal();
  }

	renderRow(row) {
		return (
			<TouchableHighlight onPress={() => this.pressRow(row)}>
				<View style={styles.row}>
					<Text style={styles.title}>
						{row.label}
					</Text>
				</View>
			</TouchableHighlight>
		);
	}

  render() {
		const rightButtonConfig = {
    	title: <Icon name="close" size={30} color="#007AFF" />,
    	handler: () => this._closeModal(),
  	};

    return (
			<View style={styles.container}>


				<TableView style={{flex:1}}
						tableViewCellStyle={TableView.Consts.CellStyle.Default}
						onPress={this._onPress.bind(this)}
						tableViewStyle={TableView.Consts.Style.Plain}
						>
					<Section arrow={true}>
						{this.props.toc.map((item)=><Item key={item.id}>{item.label}</Item>)}
					</Section>
				</TableView>
      </View>
    );
  }
}


const styles = StyleSheet.create({
  navBar: {
    backgroundColor: '#f7f7f7',
		height: 40,
		flex: 1,
		flexDirection: 'row',
		borderBottomColor: "#b2b2b2",
		borderBottomWidth: .5,
  },
  toc: {
    flex: 14,
  },
  button: {
		marginTop: 8,
		marginRight: 4
  },
	buttonLabel: {
		color: "#007AFF",
		textAlign: 'center',
		fontSize: 16,
	},
  container: {
    backgroundColor: 'white',
  },
  navTitle: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 10,
		flex: 20,
		marginRight: -40,
		fontWeight: "bold",
		// fontFamily: "georgia",
  },
	row: {
    flexDirection: 'row',
    // justifyContent: 'center',
    padding: 10,
    backgroundColor: '#FFFFFF',
		overflow: "hidden",
  },
	title: {
		fontFamily: "georgia",
	},
  separator: {
    height: 1,
    backgroundColor: '#CCCCCC',
  },
	container: {
		flex: 1,
		backgroundColor: '#FFFFFF',
	},
});

module.exports = Nav;
