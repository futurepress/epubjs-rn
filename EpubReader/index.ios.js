import React, { Component } from 'react';

import {
  AppRegistry,
  StyleSheet,
  Text,
  View
} from 'react-native';

// const Epub = require('epubjs-rn').Epub;
import { Epub } from "epubjs-rn";

class EpubReader extends Component {
  constructor(props) {
    super(props);
    this.state = {
      flow: "paginated", // paginated || scrolled-continuous
      location: 6
    };
  }
  render() {
    return (
      <View style={styles.container}>
        <Epub style={styles.reader}
              src={"https://s3.amazonaws.com/epubjs/books/moby-dick/OPS/package.opf"}
              flow={this.state.flow}
              location={this.state.location}
              onLocationChange={(visibleLocation)=> {
                // console.log("locationChanged", visibleLocation)
              }}
              onLocationsReady={(locations)=> {
                // console.log("location total", locations.total);
              }}
              onReady={(book)=> {
                // console.log("Metadata", book.package.metadata)
                // console.log("Table of Contents", book.toc)
              }}
              regenerateLocations={true}
              generateLocations={true}
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
