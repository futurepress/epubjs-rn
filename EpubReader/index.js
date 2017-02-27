import React, { Component } from 'react';

import {
  AppRegistry,
  StyleSheet,
  Text,
  View
} from 'react-native';

import { Epub, Streamer } from "epubjs-rn";

class EpubReader extends Component {
  constructor(props) {
    super(props);
    this.state = {
      flow: "paginated", // paginated || scrolled-continuous
      location: 0,
      url: "http://localhost:8080/books/1842.epub",
      src: "",
      origin: ""
    };

    this.streamer = new Streamer();
  }

  componentDidMount() {
    this.streamer.start()
      .then((origin) => {
        this.setState({origin})
        return this.streamer.get(this.state.url);
      })
      .then((src) => {
        console.log("src", src);
        return this.setState({src});
      });
  }

  componentWillUnmount() {
    this.streamer.stop();
  }

  render() {
    return (
      <View style={styles.container}>
        <Epub style={styles.reader}
              //src={"https://s3.amazonaws.com/epubjs/books/moby-dick.epub"}
              src={this.state.src}
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
              onPress={(book)=> {
                console.log("Pressed")
              }}
              // regenerateLocations={false}
              // generateLocations={true}
              origin={this.state.origin}
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
    backgroundColor: '#3F3F3C'
  },
});

export default EpubReader;
