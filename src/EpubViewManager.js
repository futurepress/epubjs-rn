import React, { Component } from 'react'

import {
  StyleSheet,
  View,
  ScrollView,
  Dimensions,
  InteractionManager,
  NativeMethodsMixin,
  NativeModules,
  UIManager,
  ActivityIndicator
} from 'react-native';

import ReactNative from 'react-native';

import EventEmitter from 'event-emitter'
import {throttle, debounce} from 'lodash';
import merge from 'merge';
import VisibleScrollView from 'react-native-visible-scrollview';
const core = require("epubjs/lib/utils/core");

import EpubView from './EpubView';

// const RCTScrollViewManager = require('NativeModules').ScrollViewManager;
// const RCTScrollViewManager = NativeModules.ScrollViewManager;
const FPVisibleScrollViewManager = NativeModules.FPVisibleScrollViewManager;

const DEFAULT_SCROLL_RENDER_AHEAD = 1000;
const DEFAULT_END_REACHED_THRESHOLD = 1000;
const DEFAULT_SCROLL_CALLBACK_THROTTLE = 16;
const SCROLLVIEW_REF = "scrollview";

const VERT_SCROLLRATE = 80;
const HORZ_SCROLLRATE = 100;

class EpubViewManager extends Component {
  constructor(props) {
    super(props);

    // var horizontal = this.props.horizontal;
    this.state = {
      sections: [],
      layout: undefined,
      margin: this.props.margin || 60,
      horizontal: this.props.flow === "paginated" ? true : false,
      rate : this.props.flow === "paginated" ? HORZ_SCROLLRATE : VERT_SCROLLRATE,
      displayed: false
    }

    this.scrollProperties = {};

    this.scrollLeft = 0;
    this.scrollTop = 0;

    this.scrollMomentum = 0;
    this.prevOffset = 0;

    if (this.props.singleVisible != true) {
      this.lookAhead = 3;
      this.lookBehind = 2;
    } else {
      this.lookAhead = 0;
      this.lookBehind = 0;
    }

    if (this.props.preload !== false) {
      this.preloadAhead = 3;
      this.preloadBehind = 2;
    } else {
      this.preloadAhead = 0;
      this.preloadBehind = 0;
    }

    this.minGap = 20;

    this.displayed = false;

    this.addingQ = [];

    this.scrolling = false;
    this.afterScrolled = debounce(this._afterScrolled.bind(this), this.state.rate);
    this.preload = throttle(this._preload.bind(this), this.state.rate, { 'trailing': true });
    // this.updateVisible = _.throttle(this._updateVisible.bind(this), this.state.rate, { 'trailing': true });
  }


  componentWillMount() {
    // Reset vars
    this.scrollProperties = {
      visibleLength: null,
      contentLength: null,
      offset: 0,
      offsetX: 0,
      offsetY: 0
    };
    this.scrollMomentum = 0;
    this.prevOffset = 0;
    this._visible = [];
    this._childFrames = [];
  }

  componentDidMount() {

    requestAnimationFrame(() => {
      this._measureAndUpdateScrollProps();
    });

  }

  componentDidUpdate() {
    requestAnimationFrame(() => {
      this._measureAndUpdateScrollProps();
    });
  }

  componentWillUnmount() {
    // destroy
    this.clear();
  }

  start(stage) {

  }

  getView(sectionIndex) {
    let view = this.refs["section_"+sectionIndex];
    if (!view) {
      throw new Error("Ref not found for Section " + sectionIndex);
    }
    return view;
  }

  display(section, target) {
    var displaying = new core.defer();
    var visible = this.visible();
    var shownView;

    if (target === section.index ||
        target === section.href) {
      target = false;
    }

    this.displaying = displaying;

    for (var i = 0; i < this.state.sections.length; i++) {

      if (section.index === this.state.sections[i].index) {
        // console.log("displaying already shown section", section.index);
        shownView = this.getView(section.index);
        shownView.setVisibility(true);
        shownView.once("expanded", () => {
          let position = shownView.position();
          this.scrollTo(position.left, position.top, true);

          // View is already shown, just move to correct location
          if(target) {
            return shownView.locationOf(target).then((offset) => {
              // this.loading = false;
              this.moveTo(shownView, offset);

              // Wait for scroll to complete
              this.displayedTimeout = setTimeout(() => {
                this.displayed = true;
                this._check();
                this.props.onShow && this.props.onShow(true);
                displaying.resolve();
              }, 10);

            });
          } else {
            // this.loading = false;
            this.displayed = true;
            this.props.onShow && this.props.onShow(true);
            displaying.resolve();
            return displaying.promise;
          }

        });
      }
    }

    this._childFrames = [];
    this._visible = [];
    this.scrollProperties.offset = 0;
    this.scrollProperties.offsetX = 0;
    this.scrollProperties.offsetY = 0;
    this.scrollMomentum = 0;
    this.prevOffset = 0;
    // this.props.onShow && this.props.onShow(false);

    let sections = [section];
    if (this.fixed && this.spreads &&
       section.index > 0 && section.index % 2 === 0) {
      // render odd page
      sections.unshift(section.prev());
    } else if (this.fixed && this.spreads && section.index > 0) {
      sections.push(section.next());
    }

    // __DEV__ && console.log("displaying", section.index);

    this.displayed = false;

    this.setState({
        sections
      },
      (r) => {
        let targetView = this.getView(section.index);
        let renderedPromises = [];
        this._measureAndUpdateScrollProps();

        sections.forEach((sect) => {
          let view = this.getView(sect.index);
          view.setVisibility(true);
          view.on("displayed", () => this.afterDisplayed(view));
          renderedPromises.push(view.displayed);
        });

        let rendered = Promise.all(renderedPromises)
          .then(() => {
            // Move to correct place within the section, if needed
            if(target) {
              return targetView.locationOf(target);
            }
          })
          .then((offset) => {
            // Move to correct place within the section, if needed
            if(offset) {
              this.moveTo(targetView, offset);

              return new Promise((resolve, reject) => {
                // Wait for scroll to complete
                this.displayedTimeout = setTimeout(() => {
                  this.displayed = true;
                  this._check();
                  resolve();
                }, 10);
              });

            } else {
              this._check();
            }
          })
          .then(displaying.resolve, displaying.reject);
      }
    );

    this.currentSection = section;
    // this.loading = true;

    return displaying.promise;
  }

  append(section) {
    var displaying = new core.defer();
    let sections = [section];

    if (this.state.sections.includes(section)) {
      return;
    }

    if (this.fixed && this.spreads) {
      let nextSection = section.next();
      nextSection && sections.push(nextSection);
    }

    // __DEV__ && console.log("append", section.index);

    this.setState({
        sections: this.state.sections.concat(sections),
      },
      (r) => {
        var view = this.getView(section.index);
        // console.log("View:", section.index);
        if (view) {
          view.on("displayed", () => this.afterDisplayed(view));

          view.displayed
            .then(displaying.resolve, displaying.reject)
            // .then(() => this.afterDisplayed(view))
            .then(() => this._check());
        } else {
          // console.log("Missing View for", section.index);


          displaying.resolve();
        }
      }
    );

    // this.loading = true;

    return displaying.promise;
  }

  prepend(section) {
    var displaying = new core.defer();
    let sections = [section];

    // if (this.scrolling) {
    //   // queue
    //   console.log("queue");
    //   return;
    // }
    if (this.state.sections.includes(section)) {
      return;
    }

    if (this.fixed && this.spreads) {
      let prevSection = section.prev();
      prevSection && sections.unshift(prevSection);
    }

    // __DEV__ && console.log("prepend", section.index);
    this.setState({
        sections: sections.concat(this.state.sections),
      },
      (r) => {
        var view = this.getView(section.index);
        view.on("displayed", () => this.afterDisplayed(view));

        view.displayed
          .then(displaying.resolve, displaying.reject)
          // .then(() => this.afterDisplayed(view))
          .then(() => this._check());

      }
    );

    // this.loading = true;
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
    var result = {
      'top': 0,
      'bottom': 0,
      'left': 0,
      'right': 0
    };
    var pos = this._position;
    var bounds = this._bounds;

    if (pos && bounds) {
      result = {
        'top': pos.y,
        'bottom': pos.y + bounds.height,
        'left': pos.x,
        'right': pos.x + bounds.width
      }
    }

    return result;
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
    var startA, startB, endA, endB;

    var container = this.position();

    var bounds = this.props.bounds || this._bounds;


    if(visible.length === 1) {

      startA = (container.top + this.scrollProperties.offset) - visible[0].position().top;
      endA = startA + bounds.height;

      return visible[0].mapPage(startA, endA).then((location) => {
        location.index = visible[0].section.index;
        location.href = visible[0].section.href;
        return location;
      });
    }

    if(visible.length > 1) {
      let last = visible.length - 1;

      startA = (container.top + this.scrollProperties.offset) - visible[0].position().top;
      endA = startA + visible[0].position().bottom;

      startB = (container.top + this.scrollProperties.offset) - visible[last].position().top;
      endB = bounds.height - startB;

      startPage = visible[0].mapPage(startA, endA);
      endPage = visible[last].mapPage(startB, endB);

      return Promise.all([startPage, endPage]).then((results) => {

        return {
          index : visible[last].section.index,
          href : visible[last].section.href,
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
      return visible[0].mapPage(startA, endA).then((location) => {
        location.index = visible[0].section.index;
        location.href = visible[0].section.href;
        return location;
      });
    }

    if(visible.length > 1) {

      let last = visible.length - 1;

      // Left Col
      startA = (container.left + this.scrollProperties.offset) - visible[0].position().left;
      endA = startA + this.state.layout.columnWidth;

      // Right Col
      startB = (container.left + this.scrollProperties.offset) + this.state.layout.delta - visible[visible.length-1].position().left;
      endB = startB + this.state.layout.columnWidth;

      pageLeft = visible[0].mapPage(startA, endA);
      pageRight = visible[last].mapPage(startB, endB);

      return Promise.all([pageLeft, pageRight]).then((results) => {

        return {
          index : visible[last].section.index,
          href : visible[last].section.href,
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
      this.prevOffset = false; // needs reset
    } else {

      if (this.prevOffset === false) {
        this.prevOffset = this.scrollProperties.offset;
      }

      if (this.scrollProperties.offset - this.prevOffset > 0) {
        this.scrollMomentum = 1;
      } else if (this.scrollProperties.offset - this.prevOffset < 0) {
        this.scrollMomentum = -1;
      } else {
        this.scrollMomentum = 0;
      }

      this.props.onScroll && this.props.onScroll(e);


      // this.check();
      // this.afterScrolled();
      //this.emit("scroll");

      clearTimeout(this.scrolledTimeout);
      this.scrolledTimeout = setTimeout(()=> {
        this.afterScrolled();
      }, 5);

      this.scrolling = true;
    }


  }

  _afterScrolled() {
    this.scrolling = false;
    this._updateVisibleChildren();
    // this.check();
    InteractionManager.runAfterInteractions(this.preload.bind(this));
    this.emit("scrolled");
    this.prevOffset = this.scrollProperties.offset;
  }

  // _measureAndUpdateScrollProps() {
  //   // var scrollComponent = this.scrollComponent();
  //   // if (!scrollComponent || !scrollComponent.getInnerViewNode) {
  //   //   return;
  //   // }
  //
  //   // RCTScrollViewManager.calculateChildFrames is not available on
  //   // every platform
  //   FPVisibleScrollViewManager && FPVisibleScrollViewManager.calculateChildFrames &&
  //     FPVisibleScrollViewManager.calculateChildFrames(
  //       ReactNative.findNodeHandle(scrollComponent),
  //     this._updateVisible.bind(this),
  //     );
  //
  //
  // }

  _measureAndUpdateScrollProps() {
    var scrollComponent = this.getScrollResponder();
    if (!scrollComponent || !scrollComponent.getInnerViewNode) {
      return;
    }

    // RCTScrollViewManager.calculateChildFrames is not available on
    // every platform
    FPVisibleScrollViewManager && FPVisibleScrollViewManager.calculateChildFrames &&
    FPVisibleScrollViewManager.calculateChildFrames(
      ReactNative.findNodeHandle(scrollComponent),
      this._updateVisible.bind(this)
    );
  }

  /*
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

      if (section && min > visibleMin && max < visibleMax) {

        visible.push(section);

      }
    });

    return visible;
  }
  */

  _checkChildVisiblility (section, x, y, width, height) {
    if (!section) {
      return false;
    }
    let view = this.getView(section.index);
    let isVertical = !this.state.horizontal;
    let delta = this.state.layout.delta || DEFAULT_SCROLL_RENDER_AHEAD;
    let lookAhead = (this.scrollMomentum > 0) ? this.lookAhead * delta : 10;
    let lookBehind = (this.scrollMomentum < 0) ? this.lookBehind * delta : 10;
    let visibleMin = this.scrollProperties.offset;
    let visibleMax = visibleMin + this.scrollProperties.visibleLength;

    let min = isVertical ? y : x;
    let max = min + (isVertical ? height : width);

    if (x === undefined || y === undefined ||
        width === undefined || height === undefined) {
      return false;
    }

    if (height === 0 && width === 0) {
      return false;
    }

    if (min - lookAhead >= visibleMax || max + lookBehind <= visibleMin) {

      if (view.state.visibility === true) {
        // __DEV__ && console.log("hiding", section.index);
        this.emit("hidden", view);
        view.setVisibility(false);
      }

      return false;

    } else {

      if (view.state.visibility === false) {
        // __DEV__ && console.log("showing", section.index);
        view.setVisibility(true, () => {
          // this.afterDisplayed(view);
        });
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

    // this._childFrames.forEach((frame) => {
    //   var section = this.state.sections[frame.index];
    //
    //   this._checkChildVisiblility(section, frame.x, frame.y, frame.width, frame.height);
    //   // var isVisible = this._checkChildVisiblility(view, frame.x, frame.y, frame.width, frame.height);
    //   // if (isVisible) {
    //   //   visible.push(section);
    //   // }
    // });


    // not ideal, but this is often called by throttle
    // this._visible = visible;

    // return visible;
  }

  _updateVisibleChildren() {
    this._childFrames.forEach((frame) => {
      var section = this.state.sections[frame.index];

      this._checkChildVisiblility(section, frame.x, frame.y, frame.width, frame.height);
    });
  }

  _onChildLayout(index, layout) {
    //Dont update on iOS
    if (FPVisibleScrollViewManager && FPVisibleScrollViewManager.calculateChildFrames) {
      return;
    }
    let frame = merge(layout);
    frame.index = index;
    this._childFrames[index] = frame;
  }


  _preload(_offsetLeft, _offsetTop) {
    var section;
    var current;
    var view;
    var added = [];
    var ahead = 0;

    if (!this.state.sections.length) {
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

    if (offset + visibleLength + (delta * this.preloadAhead) + ahead >= contentLength) {
      current = this.state.sections[this.state.sections.length-1];
      view = this.getView(current.index);
      if(view && !view.expanded) {
        added.push(view.load());
      }
    }

    if (offset - (delta * this.preloadBehind) < 0 ) {
      current = this.state.sections[0];
      view = this.getView(current.index);
      if(view && !view.expanded) {
        added.push(view.load());
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

  _check() {
    let added = [];
    let sections = this.state.sections;

    if (!sections.length) {
      return new Promise((resolve, reject) => {
        resolve();
      });
    }

    let lastSection = sections[sections.length-1];
    let lastView = this.getView(lastSection.index);
    let nextSection = lastSection.next();
    if(nextSection && lastView.expanded) {
      added.push(this.append(nextSection));
    }

    let firstSection = sections[0];
    let firstView = this.getView(firstSection.index);
    let prevSection = firstSection.prev();

    if(prevSection && firstView.expanded) {
      added.push(this.prepend(prevSection));
    }

    // console.log("check", added, Date.now());


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
    var rate = (this.props.flow === "paginated" ) ? HORZ_SCROLLRATE : VERT_SCROLLRATE;

    this.setState({ horizontal, rate });
  }

  applyLayout(layout, cb) {
    console.log("applyLayout", layout);
    this.updateLayout(layout);

    this.setState({ layout }, () => {

    });

    // this.mapping = new Mapping(this.layout);
  }

  updateLayout(layout) {
    var bounds = this.props.bounds || this._bounds;
    var fixed = (layout.name === "pre-paginated");
    var margin = fixed ? 0 : this.state.margin;

    if(this.state.horizontal) {
      layout.calculate(
        bounds.width-margin,
        bounds.height,
        margin
      );
    } else {
      layout.calculate(bounds.width, bounds.height);
    }

    this.fixed = fixed;
    this.spreads = (layout.divisor > 1);

    // this.lookAhead = fixed ? 2 : 3;
    // this.lookBehind = fixed ? 2 : 2;

  }

  setLayout(layout){

    // this.viewSettings.layout = layout;

  };


  moveTo(view, offset) {

      var distX = 0,
          distY = 0;

      if(!this.state.horizontal) {
        distY =  offset.top;
      } else {
        distX = Math.floor(offset.left / this.state.layout.delta) * this.state.layout.delta;
      }

      if (distY === 0 && distX === 0) {
        return; // No need to scroll
      }


      this.scrollBy(distX, distY, true);
  }

  scrollTo(x, y, silent) {

    if (x === this.scrollProperties.offsetX &&
        y === this.scrollProperties.offsetY) {
      return; // no change
    }

    if (silent) {
      this.silentScroll = true;
    }

    this.refs.scrollview.scrollTo({x: x, y: y, animated: false});

    // if(this.state.horizontal) {
    //   this.scrollProperties.offset = x;
    // } else {
    //   this.scrollProperties.offset = y;
    // }
  }

  scrollBy(x, y, silent) {
    var moveTo;
    var offset = this.scrollProperties.offset;
    // if(this.state.horizontal) {
    //   offset = Math.floor(this.scrollProperties.offset / this.state.layout.columnWidth) * (this.state.layout.delta / this.state.layout.divisor);
    // }

    if (x === 0 &&
        y === 0) {
      return; // no change
    }

    if (silent) {
      this.silentScroll = true;
    }

    if(this.state.horizontal) {
      moveTo = offset + x;

      this.refs.scrollview.scrollTo({x: moveTo, animated: false});
      // UIManager.dispatchViewManagerCommand(
      //   this.refs.scrollview.getScrollResponder().scrollResponderGetScrollableNode(),
      //   UIManager.RCTScrollView.Commands.scrollTo,
      //   [moveTo, 0, false],
      // );
    } else {
      moveTo = offset + y;
      this.refs.scrollview.scrollTo({y: moveTo, animated: false});
    }

    // this.scrollProperties.offset = moveTo;
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



    this.resizedTimeout = setTimeout(()=> {
      // this._updateVisible();
      // this._updateVisibleChildren();
      this.displayed && this._check();
      // InteractionManager.runAfterInteractions(this._check.bind(this));
    }, 20);


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
      this._updateVisible();
      // InteractionManager.runAfterInteractions(this._check.bind(this));
    }

  }

  _needsCounter(section) {

    if (section.index < this.currentSection.index) {
      return true;
    }

    return false;
  }

  _willResize(section, e) {

    // Not ideal, but need to delay check layout is done
    this.resizeTimeout = setTimeout(() => {
      let needsCounter = this._needsCounter(section);

      if (needsCounter === true) {
        if(this.state.horizontal) {
          this.scrollTo(e.widthDelta, 0, true);
        } else {
          this.scrollTo(0, e.heightDelta, true);
        }
      }
    });
  }

  _onResize(section, e) {
    // var view = this.getView(section.index);
    //view.expanded = true;
    // this._updateVisibleChildren();
  }

  _onExpanded(section, e) {
    this.resizedTimeout = setTimeout(()=> {
      this.displayed && this._check();
      // InteractionManager.runAfterInteractions(this._check.bind(this));
    }, 20);
  }

  _loading() {
    var loading = false;
    for (var i = 0; i < this.state.sections.length; i++) {
      var section = this.state.sections[i];
      var view = this.getView(section.index);

      if (!view.expanded || view.state.width === 0 || view.state.height === 0) {
        loading = true;
        break;
      }
    }

    return loading;
  }

  getScrollResponder() {
    return this.refs[SCROLLVIEW_REF] &&
      this.refs[SCROLLVIEW_REF].getScrollResponder &&
      this.refs[SCROLLVIEW_REF].getScrollResponder();
  }

  clear(cb) {
    clearTimeout(this.scrollTimeout);
    clearTimeout(this.resizeTimeout);
    clearTimeout(this.resizedTimeout);
    clearTimeout(this.displayedTimeout);

    this.scrollProperties = {};

    this.scrollLeft = 0;
    this.scrollTop = 0;

    // this.displaying && this.displaying.resolve();

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
    this.setState({displayed : true});
    this.emit("added", view);
  }

  render() {
    return (
      <VisibleScrollView
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
        removeClippedSubviews={(this.props.removeClippedSubviews === false) ? false : true}
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
          onLongPress={this.props.onLongPress}
          format={this.state.layout.format.bind(this.state.layout)}
          layout={this.state.layout.props}
          delta={this.state.layout.delta}
          columnWidth={this.state.layout.columnWidth}
          spreads={this.state.layout.divisor > 1}
          gap={ this.state.horizontal ? this.state.layout.gap : this.minGap}
          afterLoad={this._afterLoad.bind(this)}
          onResize={(e)=> this._onResize(section, e)}
          onExpanded={(e)=> this._onExpanded(section, e)}
          // willResize={(e)=> this._willResize(section, e)}
          boundsHeight={this.props.bounds.height || this._bounds.height}
          boundsWidth={this.props.bounds.width || this._bounds.width}
          request={this.props.request}
          baseUrl={this.props.baseUrl}
          origin={this.props.origin}
          backgroundColor={this.props.backgroundColor}
          lastSectionIndex={this.props.lastSectionIndex}
          onLayout={(l) => { this._onChildLayout(index, l) }}
          />})}
      </VisibleScrollView>
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
