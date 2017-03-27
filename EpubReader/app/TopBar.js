import React, { Component } from 'react';

import {
  Platform,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  Animated
} from 'react-native';

import Icon from 'react-native-vector-icons/EvilIcons'

const styles = StyleSheet.create({
  title: {
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
    height: 64,
    right: 0,
    left: 0,
    borderBottomWidth: 1,
    borderBottomColor:"#000",
    position: 'absolute',
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


class TopBar extends Component {
  constructor(props) {
    super(props);
    this.state = {
      fadeAnim: new Animated.Value(1),
    };


    this.barsShown = true;
  }

  componentDidMount() {
    setTimeout(() => {
      if (this.props.shown) {
        this.show();
      } else {
        this.hide();
      }
    }, 1000);
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevProps.shown !== this.props.shown) {
      if (this.props.shown) {
        this.show();
      } else {
        this.hide();
      }
    }
  }

  show() {
    const timing = Animated.timing;

    Animated.sequence([
      timing( this.state.fadeAnim, {
        toValue: 1,
        duration: 20
      })
    ]).start();

    this.barsShown = true;
  }

  hide() {
    const timing = Animated.timing;

    Animated.sequence([
      timing( this.state.fadeAnim, {
        toValue: 0,
        duration: 20
      })
    ]).start();


    this.barsShown = false;
  }

  render() {
    return (
      <Animated.View style={[styles.header, { opacity: this.state.fadeAnim }]}>
        <Text style={styles.title}>{this.props.title}</Text>
        <TouchableOpacity style={styles.backButton}
          onPress={this.props.onLeftButtonPressed}>
          <Icon name="navicon" size={34} />
        </TouchableOpacity>
      </Animated.View>
    );
  }
}

export default TopBar;
