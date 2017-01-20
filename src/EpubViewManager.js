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

const VERT_SCROLLRATE = 200;
const HORZ_SCROLLRATE = 400;

class EpubViewManager extends Component {
  constructor(props) {
    super(props);

    // var horizontal = this.props.horizontal;
    this.state = {
      sections: [],
      layout: undefined,
      margin: this.props.margin || 60,
      horizontal: this.props.flow === "vertical" ? false : true,
      rate : this.props.flow === "vertical" ? VERT_SCROLLRATE : HORZ_SCROLLRATE
    }

    this.scrollProperties = {};

    this.scrollLeft = 0;
    this.scrollTop = 0;

    this.lookAhead = 1;
    this.lookBehind = 1;

    this.minGap = 20;

    this.loading = false;

    this.addingQ = [];

    this.scrolling = false;
    this.check = throttle(this._check.bind(this), this.state.rate, { 'trailing': true });
    this.afterScrolled = debounce(this._afterScrolled.bind(this), 250);
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
      offset: 0,
      offsetX: 0,
      offsetY: 0
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
    this.scrollProperties.offsetX = 0;
    this.scrollProperties.offsetY = 0;

    this.props.onShow && this.props.onShow(false);

    console.log("displaying", section.index);

    this.setState({
        sections: [section],
      },
      (r) => {
        var view = this.getView(section.index);

        this._measureAndUpdateScrollProps();

        let rendered = view.rendered
          .then(displaying.resolve, displaying.reject)
          .then(() => {

            // Move to correct place within the section, if needed
            if(target) {
              return view.locationOf(target).then((offset) => {
                this.loading = false;
                this.moveTo(view, offset);
                section.expanded = true;
                view.setVisibility(true);
                this.props.onShow && this.props.onShow(true);
              });
            } else {
              section.expanded = true;
              view.setVisibility(true);

              this.props.onShow && this.props.onShow(true);
              this.loading = false;
            }

          })
          .then(() => this.afterDisplayed(view))
          .then(() => this._check());


          // this.getScrollResponder().scrollTo({x: 0, y: 0})
      }
    );

    this.currentSection = section;
    this.loading = true;

    return displaying.promise;
  }

  append(section) {
    var displaying = new core.defer();

    if (this.state.sections.includes(section)) {
      return;
    }

    console.log("append", section.index);

    this.setState({
        sections: this.state.sections.concat([section]),
      },
      (r) => {
        var view = this.getView(section.index);
        if (view) {
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
    if (this.state.sections.includes(section)) {
      return;
    }

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

    this.currentSection = visible[0].props.section;

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

    this.scrollProperties.offsetX = e.nativeEvent.contentOffset.x;
    this.scrollProperties.offsetY = e.nativeEvent.contentOffset.y;

    this._updateVisible(e.nativeEvent.updatedChildFrames);

    if (this.silentScroll) {
      this.silentScroll = false;
    } else {
      // this.scrolled(e.nativeEvent);
      this.props.onScroll && this.props.onScroll(e);


      clearTimeout(this.scrollTimeout);
      this.scrollTimeout = setTimeout(this._afterScrolled.bind(this),
        this.state.rate);

      this.scrolling = true;

    }

  }

  _afterScrolled() {
    this.scrolling = false;
    InteractionManager.runAfterInteractions(this._check.bind(this));
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

  _checkChildVisiblility (section, x, y, width, height) {
    var view = this.getView(section.index);
    var isVertical = !this.state.horizontal;
    var visibleMin = this.scrollProperties.offset;
    var visibleMax = visibleMin + this.scrollProperties.visibleLength;

    var min = isVertical ? y : x;
    var max = min + (isVertical ? height : width);

    if (x === undefined || y === undefined ||
        width === undefined || height === undefined) {
      return false;
    }

    if (height === 0 && width === 0) {
      return false;
    }

    if (min > visibleMax || max < visibleMin) {

      if (view.state.visibility === true) {
        // console.log("hiding", section.index);
        view.setVisibility(false);
      }

      return false;

    } else {
      if (view.state.visibility === false && section.expanded) {
        // console.log("showing", section.index);
        view.setVisibility(true);
      }

      return true;
    }
  }

  _updateVisible(updatedFrames) {
    var visible =  [];
    // var childFrames = this._childFrames
    if (updatedFrames && updatedFrames.length) {
      updatedFrames.forEach((newFrame) => {
        this._childFrames[newFrame.index] = merge(newFrame);
      });
    }

    this._childFrames.forEach((frame) => {
      var section = this.state.sections[frame.index];

      this._checkChildVisiblility(section, frame.x, frame.y, frame.width, frame.height);
      // var isVisible = this._checkChildVisiblility(view, frame.x, frame.y, frame.width, frame.height);
      // if (isVisible) {
      //   visible.push(section);
      // }
    });


    // not ideal, but this is often called by throttle
    // this._visible = visible;

    // return visible;
  }

  _onChildLayout(index, layout) {
    //Dont update on iOS
    if (RCTScrollViewManager && RCTScrollViewManager.calculateChildFrames) {
      return;
    }
    let frame = merge(layout);
    frame.index = index;
    this._childFrames[index] = frame;
  }

  _check(_offsetLeft, _offsetTop) {
    var section;
    var current;
    var added = [];
    var ahead = 0;

    if (this.queuedMove || this.loading || !this.state.sections.length) {
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
      current = this.state.sections[this.state.sections.length-1];
      section = current.next();
      if(section && current.expanded) {
        added.push(this.append(section));
      }
    }
    if (offset - (delta * this.lookBehind) < 0 ) {
      current = this.state.sections[0];
      section = current.prev();

      if(section && current.expanded) {
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
    var rate = (this.props.flow === "vertical" ) ? VERT_SCROLLRATE : HORZ_SCROLLRATE;
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
    var fixed = (this.state.layout.name === "pre-paginated");
    var margin = fixed ? 0 : this.state.margin;

    if(this.state.horizontal) {
      this.state.layout.calculate(
        bounds.width-margin,
        bounds.height,
        margin
      );
    } else {
      this.state.layout.calculate(bounds.width, bounds.height);
    }

    // this.lookAhead = fixed ? 2 : 3;
    // this.lookBehind = fixed ? 2 : 2;

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
    if(this.state.horizontal) {
      offset = Math.floor(this.scrollProperties.offset / this.state.layout.columnWidth) * (this.state.layout.delta / this.state.layout.divisor);
    }
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

    this.scrollProperties.offset = moveTo;
    // console.log("scrollTo", moveTo);

  }

  _getDistanceFromEnd(scrollProperties) {
    return scrollProperties.contentLength - scrollProperties.visibleLength - scrollProperties.offset;
  }

  _onContentSizeChange(width, height) {
    var contentLength = !this.state.horizontal ? height : width;

    if (contentLength !== this.scrollProperties.contentLength) {
      this.scrollProperties.contentLength = contentLength;
    }

    requestAnimationFrame(() => {
      InteractionManager.runAfterInteractions(this._check.bind(this));
    });

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
      InteractionManager.runAfterInteractions(this._check.bind(this));
    }

  }

  _needsCounter(section) {

    if (section.index < this.currentSection.index) {
      return true;
    }

    return false;
  }

  _willResize(section, e) {

    // if (this._needsCounter(section)) {
    //   console.log("_needsCounter", section.index, Date.now());
    //
    //   this.queuedMove = e;
    // }

  }

  _onResize(section, e) {
    // Not ideal, but need to delay check until counter and layout is done
    let needsCounter = this._needsCounter(section);

    if (needsCounter === true) {
      if(this.state.horizontal) {
        this.scrollTo(e.widthDelta, 0, true);
      } else {
        this.scrollTo(0, e.heightDelta, true);
      }

      requestAnimationFrame(() => {
        this.loading = false;
        section.expanded = true;
      })
      // this._updateVisible();

   } else {

     requestAnimationFrame(() => {
       this.loading = false;
       section.expanded = true;
     })
   }



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
        { this.state.sections.map((section, index) => {
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
          onLayout={(l) => { this._onChildLayout(index, l) }}
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
