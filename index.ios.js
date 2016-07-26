/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 */

import React, { Component } from 'react';

import {
  AppRegistry,
  StyleSheet,
  Text,
  View
} from 'react-native';

const Reader = require('./app/Reader');

class EpubReader extends Component {
  render() {
    return (
      <View style={styles.container}>
        <Reader style={styles.reader} src={"https://s3.amazonaws.com/moby-dick/OPS/package.opf"} paginated={false}/>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  reader: {
    flex: 1,
    alignSelf: 'stretch',
  },
});

AppRegistry.registerComponent('EpubReader', () => EpubReader);
