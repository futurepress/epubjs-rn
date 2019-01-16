import React, { Component } from 'react'

import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableHighlight,
  Modal,
  TouchableOpacity,
  Platform
} from 'react-native';


import Icon from 'react-native-vector-icons/EvilIcons'


class Nav extends Component<{}> {

  constructor(props) {
    super(props);

    this.state = {
      error: '',
      dataSource: this.props.toc || [],
      modalVisible: false
    }
  }

  componentDidMount() {
    if (this.props.shown) {
      this.show();
    } else {
      this.hide();
    }
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevProps.toc !== this.props.toc) {
      this.setState({
        dataSource: this.props.toc || []
      });
    }

    if (prevProps.shown !== this.props.shown) {
      if (this.props.shown) {
        this.show();
      } else {
        this.hide();
      }
    }
  }

  show() {
    this.setState({modalVisible: true});
  }

  hide() {
    this.setState({modalVisible: false});
  }

  _closeModal() {
    this.props.onClose();
  }

  _onPress(item) {
    // var item = this.props.toc[event.selectedIndex];
    if(this.props.display) {
      this.props.display(item.href);
    }
    this.hide();
  }

  renderRow(row) {
    return (
      <TouchableHighlight onPress={() => this._onPress(row)}>
        <View style={styles.row}>
          <Text style={styles.title}>
            {row.label}
          </Text>
        </View>
      </TouchableHighlight>
    );
  }

  render() {

    return (
      <View style={styles.container}>
        <Modal
          animationType={"slide"}
          visible={this.state.modalVisible}
          onRequestClose={() => console.log("close requested")}
          >
          <View
            style={styles.header}>
            <Text style={styles.headerTitle}>Table of Contents</Text>
            <TouchableOpacity style={styles.backButton}
              onPress={() => this.hide()}>
              <Icon name="close" size={34} />
            </TouchableOpacity>
          </View>
          <FlatList
            style={styles.container}
            data={this.state.dataSource}
            renderItem={(row) => {
              return this.renderRow(row.item);
            }}
            keyExtractor={item => item.id}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </Modal>
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
  headerTitle: {
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '400',
    color: '#000',
    position: 'absolute',
    top: 20,
    left: 0,
    right: 0,
    ...Platform.select({
      ios: {
        fontFamily: "Baskerville",
      },
      android: {
        fontFamily: "serif"
      },
    }),
  },
  header: {
    backgroundColor: "#cdcdcd",
    paddingTop: 0,
    top: 0,
    ...Platform.select({
      ios: {
        height: 64,
      },
      android: {
        height: 54,
      },
    }),
    right: 0,
    left: 0,
    borderBottomWidth: 1,
    borderBottomColor:"#000",
  },
  backButton: {
    width: 130,
    height: 30,
    position: 'absolute',
    top: 20,
    left: 20,
    padding: 0,
    flexDirection: 'row',
  },
  backButtonImage: {
    width: 30,
    height: 30,
  }
});

export default Nav;
