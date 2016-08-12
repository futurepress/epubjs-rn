import React, { Component } from 'react'

import {
  StyleSheet,
  View,
	ScrollView,
	Dimensions,
  InteractionManager,
} from 'react-native';

const EpubView = require('./EpubView');
const RSVP = require('epubjs').RSVP;
const _ = require('lodash');
const merge = require('merge');

const RCTScrollViewManager = require('NativeModules').ScrollViewManager;

const DEFAULT_SCROLL_RENDER_AHEAD = 1000;
const DEFAULT_END_REACHED_THRESHOLD = 1000;
const DEFAULT_SCROLL_CALLBACK_THROTTLE = 16;
const SCROLLVIEW_REF = "scrollview";

class EpubViewManager extends Component {
	constructor(props) {
		super(props);

    // var horizontal = this.props.horizontal;
    this.state = {
			sections: [],
      layout: undefined,
      gap: 60,
      horizontal: this.props.flow === "vertical" ? false : true,
      rate : this.props.flow === "vertical" ? 200 : 800
		}

		this.scrollProperties = {};

    this.scrollLeft = 0;
    this.scrollTop = 0;

    this.lookAhead = 3;
    this.lookBehind = 2;

    this.minGap = 20;

    this.loading = false;

    this.addingQ = [];

    this.scrolling = false;
    this.scrolled = _.throttle(this._check.bind(this), this.state.rate, { 'trailing': true });
    this.updateVisible = _.throttle(this._updateVisible.bind(this), this.state.rate, { 'trailing': true });
	}


	// getDefaultProps() {
	// 	return {}
	// }


	// componentWillReceiveProps: function(nextProps) {
	// 	// Check if book changed?
	// }
	//
	// shouldComponentUpdate(nextProps, nextState) {
	// 	console.log(book.url);
  // 	return nextProps.book.url !== this.props.book.url;
	// }
	//
	componentWillMount() {
		// Reset vars
    this.scrollProperties = {
      visibleLength: null,
      contentLength: null,
      offset: 0
    };
    this._visible = [];
    this._childFrames = [];
  }

	componentDidMount() {

    requestAnimationFrame(() => {
      this._measureAndUpdateScrollProps();
    });

	}

  componentDidUpdate() {
    // console.log("updated", arguments);
    requestAnimationFrame(() => {
      this._measureAndUpdateScrollProps();
    });
  }

	componentWillUnmount() {
		// destroy
	}

	start(stage) {
		this.bounds = this.getBounds();

	}

  getView(sectionIndex) {
    return this.refs["section_"+sectionIndex];
  }

	display(section, moveTo) {
		var displaying = new RSVP.defer();

    for (var i = 0; i < this.state.sections.length; i++) {
      if (section.index === this.state.sections[i].index) {
        displaying.resolve();
        return displaying.promise;
      }
    }

    this._childFrames = [];
    this._visible = [];
    this.scrollProperties.offset = 0;

    console.log("displaying", section.index);

    this.setState({
        sections: [section],
      },
      (r) => {
        var view = this.getView(section.index);

        this._measureAndUpdateScrollProps();

        view.rendered
          .then(displaying.resolve, displaying.reject)
          .then(() => {
            this.loading = false;
          });

          // this.getScrollResponder().scrollTo({x: 0, y: 0})
      }
		);

    this.lastDisplayedSection = section;
    this.loading = true;

		return displaying.promise;
	}

	append(section) {
		var displaying = new RSVP.defer();
    console.log("append", section.index);

    this.setState({
        sections: this.state.sections.concat([section]),
      },
      (r) => {
        var view = this.getView(section.index);
        if (view) {
          view.rendered.then(displaying.resolve, displaying.reject);
        } else {
          console.log("Missing View for", section.index);

          displaying.resolve();
        }
      }
		);

    this.loading = true;

		return displaying.promise;
	}

	prepend(section) {
		var displaying = new RSVP.defer();

    // if (this.scrolling) {
    //   // queue
    //   console.log("queue");
    //   return;
    // }

    console.log("prepend", section.index);
    this.setState({
        sections: [section].concat(this.state.sections),
      },
      (r) => {
        var view = this.getView(section.index);

        view.rendered.then(displaying.resolve, displaying.reject);

      }
		);

    this.loading = true;

    //this.addingQ.push(section);

		return displaying.promise;
	}

	next() {
		// scroll forward by a spreadWidth
	}

	next() {
		// scroll backwards by a spreadWidth
	}

	currentLocation() {
		console.log("looking for location");
	}

	getBounds() {
		var bounds = Dimensions.get('window');
    console.log(bounds);
		return {
			height: bounds.height,
			width: bounds.width
		};
	}

	_onScroll(e) {
    var isVertical = !this.state.horizontal;
    this.scrollProperties.visibleLength = e.nativeEvent.layoutMeasurement[
      isVertical ? 'height' : 'width'
    ];
    this.scrollProperties.contentLength = e.nativeEvent.contentSize[
      isVertical ? 'height' : 'width'
    ];
    this.scrollProperties.offset = e.nativeEvent.contentOffset[
      isVertical ? 'y' : 'x'
    ];

    if (this.silentScroll) {
      this.silentScroll = false;
    } else {

      if (this.scrollTimeout) {
        clearTimeout(this.scrollTimeout);
      }

      this.scrolled(e.nativeEvent);
      this.updateVisible(e.nativeEvent.updatedChildFrames);
      this.props.onScroll && this.props.onScroll(e);

      this.scrollTimeout = setTimeout(this._afterScrolled.bind(this), 20);
      this.scrolling = true;

    }

  }

  _afterScrolled() {
    this.scrolling = false;
  }

  _measureAndUpdateScrollProps() {
    var scrollComponent = this.getScrollResponder();
    if (!scrollComponent || !scrollComponent.getInnerViewNode) {
      return;
    }

  }

  _getVisible() {
    var visible =  [];
    var isVertical = !this.state.horizontal;
    var visibleMin = this.scrollProperties.offset;
    var visibleMax = visibleMin + this.scrollProperties.visibleLength;
    var children = this._childFrames;

    children.forEach((frame) => {
      var min = isVertical ? frame.y : frame.x;
      var max = min + (isVertical ? frame.height : frame.width);
      var section = this.state.sections[frame.index];
      var view = this.getView(section.index);

      if (min > visibleMax || max < visibleMin) {

        visible.push(section);

      }
    });

    return visible;
  }

  _updateVisible(updatedFrames) {
    var visible =  [];
    var isVertical = !this.state.horizontal;
    var delta = this.state.layout.delta || DEFAULT_SCROLL_RENDER_AHEAD;
    var visibleMin = this.scrollProperties.offset;
    var visibleMax = visibleMin + this.scrollProperties.visibleLength;

    if (updatedFrames && updatedFrames.length) {
      updatedFrames.forEach((newFrame) => {
        this._childFrames[newFrame.index] = merge(newFrame);
      });
    }

    this._childFrames.forEach((frame) => {
      var min = isVertical ? frame.y : frame.x;
      var max = min + (isVertical ? frame.height : frame.width);
      var section = this.state.sections[frame.index];
      var view = this.getView(section.index);

      if (frame.height === 0 || frame.width === 0) {
        return;
      }

      if (max && min > visibleMax + (delta * this.lookAhead) || max < visibleMin - (delta * this.lookBehind)) {

        if (view.visible && !view.loading) {
          // console.log("hideing", frame.index, section.index);
          view.setVisibility(false);
        }

        visible.push(section);

      } else {
        if (!view.visible) {
          // console.log("showing", frame.index, section.index);

          view.setVisibility(true);
        }
      }
    });

    // not ideal, but this is often called by throttle
    this.visible = visible;

    return visible;
  }

  _check(e) {
    var section;

    if (this.loading || !this.state.sections.length) {
      return;
    }

    var offset = this.scrollProperties.offset;
    var visibleLength = this.scrollProperties.visibleLength;
    var contentLength = this.scrollProperties.contentLength;

    var delta = this.state.layout.delta || DEFAULT_SCROLL_RENDER_AHEAD;

    if (offset + visibleLength + (delta * this.lookAhead) >= contentLength) {
      section = this.state.sections[this.state.sections.length-1].next();
      if(section) {
        this.append(section);
      }
    }

    if (offset - (delta * this.lookBehind) < 0 ) {
      section = this.state.sections[0].prev();
      if(section) {
        this.prepend(section);
      }
    }


	}

  _trim() {

	}

  _isVisible() {

	}

  _afterLoad(section) {

	}

  updateFlow(flow) {
    var horizontal = (flow === "paginated") ? true : false;

    this.setState({ horizontal });
  }

  applyLayout(layout) {

    this.setState({ layout });
  	this.updateLayout();

  	// this.mapping = new Mapping(this.layout);
  }

  updateLayout() {
  	var bounds = this.getBounds();

    if(this.state.horizontal) {
      this.state.layout.calculate(
        bounds.width,
        bounds.height,
        this.state.gap
      );
    } else {
      this.state.layout.calculate(bounds.width, bounds.height);
    }

  }

  setLayout(layout){

  	// this.viewSettings.layout = layout;

  };


  scrollTo(x, y, silent) {
    var moveTo;

    if (silent) {
      this.silentScroll = true;
    }

    if(this.state.horizontal) {
      moveTo = this.scrollProperties.offset + x
  		this.refs.scrollview.scrollTo({x: moveTo, animated: false});
  	} else {
      moveTo = this.scrollProperties.offset + y
  		this.refs.scrollview.scrollTo({y: moveTo, animated: false});
  	}

    this.scrollProperties.offset = moveTo;
    // console.log("scrollTo", moveTo, Date.now());

	}

  _getDistanceFromEnd(scrollProperties) {
    return scrollProperties.contentLength - scrollProperties.visibleLength - scrollProperties.offset;
  }

  _onContentSizeChange(width, height) {
    var contentLength = !this.state.horizontal ? height : width;
    var counter = (contentLength - this.scrollProperties.contentLength);

    if (contentLength !== this.scrollProperties.contentLength) {
      this.scrollProperties.contentLength = contentLength;
      // this._updateVisible();

      InteractionManager.runAfterInteractions(this._check.bind(this));
    }
  }


	_onLayout(event) {
    var {width, height} = event.nativeEvent.layout;
    var visibleLength = !this.state.horizontal ? height : width;

    if (visibleLength !== this.scrollProperties.visibleLength) {
      this.scrollProperties.visibleLength = visibleLength;
      // this._updateVisible();
      InteractionManager.runAfterInteractions(this._check.bind(this));
    }
    console.log(event.nativeEvent.layout);
	}

  _needsCounter(section) {
    var visible = this._getVisible();

    // We might not have scrolled yet, so just use the last displayed section
    if (!visible.length && this.lastDisplayedSection) {
      visible = [this.lastDisplayedSection];
    }

    if (visible.length && section.index < visible[0].index) {
      return true;
    }

    return false;
	}

  _willResize(section, e) {

    if (this._needsCounter(section)) {

      if(this.state.horizontal) {
        this.scrollTo(e.widthDelta, 0, true);
      } else {
        this.scrollTo(0, e.heightDelta, true);
      }

    }
	}

  _onResize(section, e) {
    // console.log("resized", section.index, Date.now());
    // Not ideal, but need to delay check until counter and layout is done
    this.loading = false;
  }

  getScrollResponder() {
    return this.refs[SCROLLVIEW_REF] &&
      this.refs[SCROLLVIEW_REF].getScrollResponder &&
      this.refs[SCROLLVIEW_REF].getScrollResponder();
  }

	render() {
		return (
			<ScrollView
        ref={SCROLLVIEW_REF}
				automaticallyAdjustContentInsets={false}
				horizontal={this.state.horizontal}
				pagingEnabled={this.state.horizontal ? true : false}
				stickyHeaderIndices={[]}
				style={ this.state.horizontal ? styles.horzScrollContainer : styles.vertScrollContainer }
				onContentSizeChange={this._onContentSizeChange.bind(this)}
	      onLayout={this._onLayout.bind(this)}
				onScroll={this._onScroll.bind(this)}
				scrollEventThrottle={DEFAULT_SCROLL_CALLBACK_THROTTLE}
        removeClippedSubviews={true}
        scrollsToTop={false}
				>
				{ this.state.sections.map((section) => {
          return <EpubView
					ref={`section_${section.index}`}
					key={`scrollview_section:${section.index}`}
					section={section}
          horizontal={this.state.horizontal}
          onPress={this.props.onPress}
          format={this.state.layout.format.bind(this.state.layout)}
          layout={this.state.layout.name}
          spreadWidth={this.state.layout.spreadWidth}
          gap={ this.state.horizontal ? this.state.layout.gap : this.minGap}
          afterLoad={this._afterLoad.bind(this)}
					onResize={(e)=> this._onResize(section, e)}
          willResize={(e)=> this._willResize(section, e)}
					/>})}
			</ScrollView>
		);
	}

}

//-- Enable binding events to Manager
RSVP.EventTarget.mixin(EpubViewManager.prototype);

const styles = StyleSheet.create({
	horzScrollContainer: {
    flex: 1,
		marginTop: 0,
		flexDirection: 'row',
		flexWrap: 'nowrap',
		backgroundColor: "#F8F8F8",
		alignSelf: 'stretch',
  },
  vertScrollContainer: {
    flex: 1,
		marginTop: 0,
		flexDirection: 'column',
		flexWrap: 'nowrap',
		backgroundColor: "#F8F8F8",
		alignSelf: 'stretch',
  },
});

module.exports = EpubViewManager;
