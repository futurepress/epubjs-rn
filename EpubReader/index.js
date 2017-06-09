import React, { Component } from 'react';

import {
  AppRegistry,
  StyleSheet,
  Text,
  View,
  Animated,
  Modal,
  StatusBar
} from 'react-native';

import { Epub, Streamer } from "epubjs-rn";

import TopBar from './app/TopBar'
import BottomBar from './app/BottomBar'
import Nav from './app/Nav'

class EpubReader extends Component {
  constructor(props) {
    super(props);
    this.state = {
      flow: "paginated", // paginated || scrolled-continuous
      location: 6,
      url: "https://s3.amazonaws.com/epubjs/books/moby-dick.epub",
      src: "",
      origin: "",
      title: "",
      toc: [],
      showBars: false,
      showNav: false,
      sliderDisabled: true
    };

    this.streamer = new Streamer();

    this.barsShown = false;
  }

  componentDidMount() {
    this.streamer.start()
      .then((origin) => {
        this.setState({origin})
        // console.log("origin", origin);
        return this.streamer.get(this.state.url);
      })
      .then((src) => {
        return this.setState({src});
      });
  }

  componentWillUnmount() {
    this.streamer.kill();
  }

  toggleBars() {

    if (this.barsShown) {
      this.setState({ showBars: false });
    } else {
      this.setState({ showBars: true });
    }

    this.barsShown = !this.barsShown;
  }


  render() {
    return (
      <View style={styles.container}>
        <StatusBar hidden={true}/>
        <Epub style={styles.reader}
              //src={"https://s3.amazonaws.com/epubjs/books/moby-dick.epub"}
              src={this.state.src}
              flow={this.state.flow}
              location={this.state.location}
              onLocationChange={(visibleLocation)=> {
                console.log("locationChanged", visibleLocation)
                this.setState({visibleLocation});
              }}
              onLocationsReady={(locations)=> {
                // console.log("location total", locations.total);
                this.setState({sliderDisabled : false});
              }}
              onReady={(book)=> {
                // console.log("Metadata", book.package.metadata)
                // console.log("Table of Contents", book.toc)
                this.setState({
                  title : book.package.metadata.title,
                  toc: book.toc
                });
              }}
              onPress={(cfi)=> {
                this.toggleBars();
                console.log(cfi);
              }}
              onViewAdded={(view, contents) => {
                console.log("added", view.index)
              }}
              beforeViewRemoved={(view, contents) => {
                console.log("removed", view.index)
              }}
              onSelected={(cfiRange, contents) => {
                console.log("selected", cfiRange, contents)
                // Add marker
                contents.mark(cfiRange, {});
              }}
              // regenerateLocations={true}
              // generateLocations={true}
              origin={this.state.origin}
            />
            <View
              style={[styles.bar, { top:0 }]}>
              <TopBar
                title={this.state.title}
                shown={this.state.showBars}
                onLeftButtonPressed={() => this.refs.nav.show()}
                onRightButtonPressed={
                  (value) => {
                    if (this.state.flow === "paginated") {
                      this.setState({flow: "scrolled-continuous"});
                    } else {
                      this.setState({flow: "paginated"});
                    }
                  }
                }
               />
            </View>
            <View
              style={[styles.bar, { bottom:0 }]}>
              <BottomBar
                disabled= {this.state.sliderDisabled}
                value={this.state.visibleLocation ? this.state.visibleLocation.percentage : 0}
                shown={this.state.showBars}
                onSlidingComplete={
                  (value) => {
                    this.setState({location: value})
                  }
                }/>
            </View>
            <View>
              <Nav ref="nav"
                display={(loc) => {
                  this.setState({ location: loc });
                }}
                toc={this.state.toc}
              />

            </View>
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
  bar: {
    position:"absolute",
    left:0,
    right:0,
    height:55
  }
});

export default EpubReader;
