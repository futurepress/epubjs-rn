import React, { Component } from 'react';

import {
  AppRegistry,
  StyleSheet,
  Text,
  View
} from 'react-native';

const Epub = require('./components/Epub');

class EpubReader extends Component {
  render() {
    return (
      <View style={styles.container}>
        <Epub style={styles.reader}
              src={"https://s3.amazonaws.com/epubjs/books/moby-dick/OPS/package.opf"}
              flow={"paginated"}
              location={6}
              onLocationChange={(visibleLocation)=> { console.log("locationChanged", visibleLocation) }}
              onLocationsReady={(locations)=> { console.log("location total", locations.total) }}
              onReady={(book)=> {
                console.log("Metadata", book.metadata)
                console.log("Table of Contents", book.toc)
              }}
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

AppRegistry.registerComponent('EpubReader', () => EpubReader);
