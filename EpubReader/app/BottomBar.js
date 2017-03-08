import React, { Component } from 'react';

import {
  Platform,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  Animated,
  Slider
} from 'react-native';

import Icon from 'react-native-vector-icons/EvilIcons'

const styles = StyleSheet.create({
  footer: {
    backgroundColor: "#cdcdcd",
    paddingTop: 0,
    bottom: 0,
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
    borderTopWidth: 1,
    borderTopColor:"#000",
    position: 'absolute',
    alignItems:'center',
    justifyContent:'center',
    flexDirection: 'row'
  },
  slider: {
    height: 30,
    alignItems:'center',
    justifyContent:'center',
    flexDirection: 'row',
    flex: 1,
    marginLeft: 50,
    marginRight: 50
  }
});

class BottomBar extends Component {
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
      <Animated.View style={[styles.footer, { opacity: this.state.fadeAnim }]}>
        <Slider
            style={styles.slider}
            disabled={this.props.disabled}
            value={this.props.value}
            onSlidingComplete={this.props.onSlidingComplete} />
      </Animated.View>
    );
  }
}

export default BottomBar;
