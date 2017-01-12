import React, { Component } from 'react'

import {
  StyleSheet,
  View,
  ScrollView,
  Dimensions,
  InteractionManager,
  NativeMethodsMixin,
  NativeModules
} from 'react-native';

import ReactNative from 'react-native';

import EventEmitter from 'event-emitter'
import {throttle, debounce} from 'lodash';
import merge from 'merge';

const core = require("epubjs/lib/utils/core");

import EpubView from './EpubView';

// const RCTScrollViewManager = require('NativeModules').ScrollViewManager;
const RCTScrollViewManager = NativeModules.ScrollViewManager;

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
      margin: this.props.margin || 60,
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
    this.check = throttle(this._check.bind(this), this.state.rate, { 'trailing': true });
    this.afterScrolled = debounce(this._afterScrolled.bind(this), 200);
    // this.updateVisible = _.throttle(this._updateVisible.bind(this), this.state.rate, { 'trailing': true });
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

  }

  getView(sectionIndex) {
    return this.refs["section_"+sectionIndex];
  }

  display(section, target) {
    var displaying = new core.defer();
    var shownView;

    for (var i = 0; i < this.state.sections.length; i++) {
      if (section.index === this.state.sections[i].index) {
        console.log("displaying already shown section", section.index);
        shownView = this.getView(section.index);
        // View is already shown, just move to correct location
        if(target) {
          return shownView.locationOf(target).then((offset) => {
            this.loading = false;
            this.moveTo(shownView, offset);
            this.props.onShow && this.props.onShow(true);
          });
        } else {
          this.loading = false;
          this.props.onShow && this.props.onShow(true);
          displaying.resolve();
          return displaying.promise;
        }

      }
    }

    this._childFrames = [];
    this._visible = [];
    this.scrollProperties.offset = 0;

    this.props.onShow && this.props.onShow(false);

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

            // Move to correct place within the section, if needed
            if(target) {
              return view.locationOf(target).then((offset) => {
                this.loading = false;
                this.moveTo(view, offset);
                this.props.onShow && this.props.onShow(true);
              });
            } else {
              this.props.onShow && this.props.onShow(true);
              this.loading = false;
            }

          })
          .then(() => this.afterDisplayed(view))
          .then(() => this._check());


          // this.getScrollResponder().scrollTo({x: 0, y: 0})
      }
    );

    this.lastDisplayedSection = section;
    this.loading = true;

    return displaying.promise;
  }

  append(section) {
    var displaying = new core.defer();
    console.log("append", section.index);

    this.setState({
        sections: this.state.sections.concat([section]),
      },
      (r) => {
        var view = this.getView(section.index);
        if (view) {

          this.lastDisplayedSection = section;

          view.rendered
            .then(displaying.resolve, displaying.reject)
            .then(() => this.afterDisplayed(view));
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
    var displaying = new core.defer();

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

        view.rendered
          .then(displaying.resolve, displaying.reject)
          .then(() => this.afterDisplayed(view));

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

  position() {
    var pos = this._position;
    var bounds = this._bounds;

    return {
      'top': pos.y,
      'bottom': pos.y + bounds.height,
      'left': pos.x,
      'right': pos.x + bounds.width
    }
  }

  visible() {
    var visible = [];
    var checked = [];

    this.state.sections.forEach((section) => {
      var view = this.getView(section.index);
      var position = view.position();
      var container = this.position();

      if(this.state.horizontal &&
        position.right - this.scrollProperties.offset > container.left &&
        position.left - this.scrollProperties.offset < container.right) {

        visible.push(view);

      } else if(!this.state.horizontal &&
        position.bottom - this.scrollProperties.offset > container.top &&
        position.top - this.scrollProperties.offset < container.bottom) {

          visible.push(view);

      }

    });

    return visible;
    // return RSVP.all(checked);
  }

  currentLocation() {
    var locate;
    var visible = this.visible();

    if (!visible || visible.length === 0) {
      return 0;
    }

    if (!this.state.horizontal) {
      locate = this.scrolledLocation(visible);
    } else {
      locate = this.paginatedLocation(visible);
    }

    locate.then((result) => {
      this.location = result;
    });

    return locate;
  }

  scrolledLocation(visible) {

    var visible = this.visible();
    var startPage, endPage;

    var container = this.position();

    if(visible.length === 1) {
      return visible[0].mapPage(0, 0);
    }

    if(visible.length > 1) {

      startPage = visible[0].mapPage(0, 0);
      endPage =  visible[visible.length-1].mapPage(0, 0);

      return Promise.all([startPage, endPage]).then((results) => {

        return {
          start: results[0].start,
          end: results[1].end
        };

      });

    }

  }

  paginatedLocation(visible) {
    var startA, startB, endA, endB;
    var pageLeft, pageRight;
    var container = this.position();

    if(visible.length === 1) {
      startA = (container.left + this.scrollProperties.offset) - visible[0].position().left;
      endA = startA + this.state.layout.delta;

      // return this.mapping.page(visible[0].contents, visible[0].section.cfiBase, startA, endA);
      return visible[0].mapPage(startA, endA);
    }

    if(visible.length > 1) {

      // Left Col
      startA = (container.left + this.scrollProperties.offset) - visible[0].position().left;
      endA = startA + this.state.layout.columnWidth;

      // Right Col
      startB = (container.left + this.scrollProperties.offset) + this.state.layout.delta - visible[visible.length-1].position().left;
      endB = startB + this.state.layout.columnWidth;

      pageLeft = visible[0].mapPage(startA, endA);
      pageRight = visible[visible.length-1].mapPage(startB, endB);

      return Promise.all([pageLeft, pageRight]).then((results) => {

        return {
          start: results[0].start,
          end: results[1].end
        };

      });

    }
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
      // this.scrolled(e.nativeEvent);
      this._updateVisible(e.nativeEvent.updatedChildFrames);
      this.props.onScroll && this.props.onScroll(e);

      if (!this.loading) {
        InteractionManager.runAfterInteractions(this._check.bind(this));
      }

      // cancelAnimationFrame(this.scrollTimeout);
      // this.scrollTimeout = requestAnimationFrame(this._afterScrolled.bind(this));
      this.afterScrolled();
      this.scrolling = true;

    }

  }

  _afterScrolled() {
    this.scrolling = false;
    this.emit("scroll");
  }

  _measureAndUpdateScrollProps() {
    var scrollComponent = this.getScrollResponder();
    if (!scrollComponent || !scrollComponent.getInnerViewNode) {
      return;
    }

    // RCTScrollViewManager.calculateChildFrames is not available on
    // every platform
    RCTScrollViewManager && RCTScrollViewManager.calculateChildFrames &&
      RCTScrollViewManager.calculateChildFrames(
        ReactNative.findNodeHandle(scrollComponent),
      this._updateVisible.bind(this),
      );


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
      // var view = this.getView(section.index);

      if (min > visibleMin && max < visibleMax) {

        visible.push(section);

      }
    });

    return visible;
  }

  _updateVisible(updatedFrames) {
    var visible =  [];
    var isVertical = !this.state.horizontal;
    var delta = this.state.layout && this.state.layout.delta || DEFAULT_SCROLL_RENDER_AHEAD;
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
      var view;

      if (!section) {
        return
      }
      if (frame.height === 0 || frame.width === 0) {
        return;
      }

      view = this.getView(section.index);

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

    // for Android:
    // if (!this._childFrames) {
    //   var visible = this._visible || this.visible();
    //   visible.then((sections) => {
    //     this._visible = sections;
    //   });
    // }

    // not ideal, but this is often called by throttle
    this._visible = visible;

    return visible;
  }

  _check(_offsetLeft, _offsetTop) {
    var section;
    var added = [];
    var ahead = 0;

    if (this.loading || !this.state.sections.length) {
      return new Promise((resolve, reject) => {
        resolve();
      });
    }

    var offset = this.scrollProperties.offset;
    var visibleLength = this.scrollProperties.visibleLength;
    var contentLength = this.scrollProperties.contentLength;

    var delta = this.state.layout.delta || DEFAULT_SCROLL_RENDER_AHEAD;

    if (this.state.horizontal && _offsetLeft) {
      ahead = _offsetLeft;
    }

    if (!this.state.horizontal && _offsetTop) {
      ahead = _offsetTop;
    }

    if (offset + visibleLength + (delta * this.lookAhead) + ahead >= contentLength) {
      section = this.state.sections[this.state.sections.length-1].next();
      if(section) {
        added.push(this.append(section));
      }
    }

    if (offset - (delta * this.lookBehind) < 0 ) {
      section = this.state.sections[0].prev();
      if(section) {
        added.push(this.prepend(section));
      }
    }

    if (added.length) {
      return Promise.all(added);
    } else {
      return new Promise((resolve, reject) => {
        resolve();
      });
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
    var rate = (this.props.flow === "vertical" ) ? 200 : 800;
    this.setState({ horizontal, rate });
  }

  applyLayout(layout) {

    this.setState({ layout }, () => {
      this.updateLayout();
    });

    // this.mapping = new Mapping(this.layout);
  }

  updateLayout() {
    var bounds = this.props.bounds || this._bounds;
    var margin = this.state.layout === "pre-paginated" ? 0 : this.state.margin;

    if(this.state.horizontal) {
      this.state.layout.calculate(
        bounds.width-margin,
        bounds.height,
        margin
      );
    } else {
      this.state.layout.calculate(bounds.width, bounds.height);
    }

  }

  setLayout(layout){

    // this.viewSettings.layout = layout;

  };


  moveTo(view, offset) {

      var distX = 0,
          distY = 0;

      var pos = view.position();

      if(!this.state.horizontal) {
        distY = pos.top + offset.top;
      } else {
        distX = pos.left + Math.floor(offset.left / this.state.layout.delta) * this.state.layout.delta;
      }
      // return this._check(offset.left, offset.top).then(() => {
        this.scrollTo(distX, distY, true);
      // });

  }

  scrollTo(x, y, silent) {
    var moveTo;
    var offset = this.scrollProperties.offset;
    if (silent) {
      this.silentScroll = true;
    }

    if(this.state.horizontal) {
      moveTo = offset + x;
      this.refs.scrollview.scrollTo({x: moveTo, animated: false});
    } else {
      moveTo = offset + y;
      this.refs.scrollview.scrollTo({y: moveTo, animated: false});
    }

    // this._tmpOffset = moveTo;
    this.scrollProperties.offset = moveTo;

  }

  // scrollTo(x, y, silent) {
  //   var moveTo;
  //
  //   if (silent) {
  //     this.silentScroll = true;
  //   }
  //
  //   if(this.state.horizontal) {
  // 		this.refs.scrollview.scrollTo({x: moveTo, animated: false});
  // 	} else {
  // 		this.refs.scrollview.scrollTo({y: moveTo, animated: false});
  // 	}
  //
  //   this._tmpOffset = moveTo;
  //
  // }

  _getDistanceFromEnd(scrollProperties) {
    return scrollProperties.contentLength - scrollProperties.visibleLength - scrollProperties.offset;
  }

  _onContentSizeChange(width, height) {
    var contentLength = !this.state.horizontal ? height : width;
    // var counter = (contentLength - this.scrollProperties.contentLength);

    if (contentLength !== this.scrollProperties.contentLength) {
      this.scrollProperties.contentLength = contentLength;
      // this._updateVisible();

      if (this.queuedMove) {
        if(this.state.horizontal) {
          this.scrollTo(this.queuedMove.widthDelta, 0, true);
        } else {
          this.scrollTo(0, this.queuedMove.heightDelta, true);
        }
        this.queuedMove = undefined;
      }


      if (!this.loading) {
        InteractionManager.runAfterInteractions(this._check.bind(this));
      }
    }
  }


  _onLayout(event) {
    var {width, height} = event.nativeEvent.layout;
    var visibleLength = !this.state.horizontal ? height : width;
    var layout = event.nativeEvent.layout;

    this._bounds = {
      width: layout.width,
      height: layout.height
    }

    this._position = {
      x: layout.x,
      y: layout.y
    }

    if (visibleLength !== this.scrollProperties.visibleLength) {
      this.scrollProperties.visibleLength = visibleLength;
      // this._updateVisible();
      if (!this.loading) {
        InteractionManager.runAfterInteractions(this._check.bind(this));
      }
    }

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

      this.queuedMove = e;

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

  clear(cb) {
    return this.setState({ sections : [] }, () => {
      cb && cb();
    });
  }

  getContents(){
    var contents = [];
    this.state.sections.forEach((section) => {
      var view = this.getView(section.index);
      contents.push(view.contents);
    });
    return contents;
  }

  afterDisplayed(view){
    this.emit("added", view);
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
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
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
          delta={this.state.layout.delta}
          columnWidth={this.state.layout.columnWidth}
          gap={ this.state.horizontal ? this.state.layout.gap : this.minGap}
          afterLoad={this._afterLoad.bind(this)}
          onResize={(e)=> this._onResize(section, e)}
          willResize={(e)=> this._willResize(section, e)}
          bounds={this.props.bounds || this._bounds}
          request={this.props.request}
          baseUrl={this.props.baseUrl}
          />})}
      </ScrollView>
    );
  }

}

//-- Enable binding events to Manager
EventEmitter(EpubViewManager.prototype);

const styles = StyleSheet.create({
  horzScrollContainer: {
    flex: 1,
    marginTop: 0,
    marginLeft: 0,
    flexDirection: 'row',
    flexWrap: 'nowrap',
    backgroundColor: "#FFFFFF",
    alignSelf: 'stretch',
  },
  vertScrollContainer: {
    flex: 1,
    marginTop: 0,
    flexDirection: 'column',
    flexWrap: 'nowrap',
    backgroundColor: "#FFFFFF",
    alignSelf: 'stretch',
  },
});

module.exports = EpubViewManager;
