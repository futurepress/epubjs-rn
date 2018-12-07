import React, { Component } from 'react';
import * as Animatable from 'react-native-animatable';
let img = require("./asset/book.png")

export default class CustomLoading extends Component {
  constructor(props) {
    super(props);
    this.state = {
    };
  }

  render() {
    return (
        <Animatable.Image animation="slideInDown" duration={500} iterationCount="infinite" direction="alternate" source={img} />
    );
  }
}
