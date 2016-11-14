import React, { Component } from 'react';

import {
  AppRegistry,
  StyleSheet,
  Text,
  View
} from 'react-native';

const EpubReader = require('./app/EpubReader');

class Reader extends Component {
  render() {
    return (
      <View style={styles.container}>
        <EpubReader style={styles.reader}
              src={"https://s3.amazonaws.com/epubjs/books/moby-dick/OPS/package.opf"}
              flow={"paginated"}
              location={6}
              onLocationChange={(visibleLocation)=> { console.log("locationChanged", visibleLocation) }}
            />
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

AppRegistry.registerComponent('Reader', () => Reader);
