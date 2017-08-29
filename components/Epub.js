var _jsxFileName="D:\\projects\\react-native\\epubj-rn\\src\\Epub.js";var _createClass=function(){function defineProperties(target,props){for(var i=0;i<props.length;i++){var descriptor=props[i];descriptor.enumerable=descriptor.enumerable||false;descriptor.configurable=true;if("value"in descriptor)descriptor.writable=true;Object.defineProperty(target,descriptor.key,descriptor);}}return function(Constructor,protoProps,staticProps){if(protoProps)defineProperties(Constructor.prototype,protoProps);if(staticProps)defineProperties(Constructor,staticProps);return Constructor;};}();var _react=require("react");var _react2=_interopRequireDefault(_react);

var _reactNative=require("react-native");










var _reactNativeOrientation=require("react-native-orientation");var _reactNativeOrientation2=_interopRequireDefault(_reactNativeOrientation);

var _reactNativeFetchBlob=require("react-native-fetch-blob");var _reactNativeFetchBlob2=_interopRequireDefault(_reactNativeFetchBlob);













var _epubjs=require("epubjs");var _epubjs2=_interopRequireDefault(_epubjs);function _interopRequireDefault(obj){return obj&&obj.__esModule?obj:{default:obj};}function _classCallCheck(instance,Constructor){if(!(instance instanceof Constructor)){throw new TypeError("Cannot call a class as a function");}}function _possibleConstructorReturn(self,call){if(!self){throw new ReferenceError("this hasn't been initialised - super() hasn't been called");}return call&&(typeof call==="object"||typeof call==="function")?call:self;}function _inherits(subClass,superClass){if(typeof superClass!=="function"&&superClass!==null){throw new TypeError("Super expression must either be null or a function, not "+typeof superClass);}subClass.prototype=Object.create(superClass&&superClass.prototype,{constructor:{value:subClass,enumerable:false,writable:true,configurable:true}});if(superClass)Object.setPrototypeOf?Object.setPrototypeOf(subClass,superClass):subClass.__proto__=superClass;}if(!global.Blob){global.Blob=_reactNativeFetchBlob2.default.polyfill.Blob;}global.JSZip=global.JSZip||require("jszip");global.URL=require("epubjs/libs/url/url-polyfill.js");if(!global.btoa){global.btoa=require("base-64").encode;}

var core=require("epubjs/lib/utils/core");
var Uri=require("epubjs/lib/utils/url");
var Path=require("epubjs/lib/utils/path");

var Rendition=require("./Rendition");var

Epub=function(_Component){_inherits(Epub,_Component);

function Epub(props){_classCallCheck(this,Epub);var _this=_possibleConstructorReturn(this,(Epub.__proto__||Object.getPrototypeOf(Epub)).call(this,
props));

var bounds=_reactNative.Dimensions.get("window");

_this.state={
toc:[],
show:false,
width:bounds.width,
height:bounds.height,
orientation:"PORTRAIT"};


_this.active=true;return _this;

}_createClass(Epub,[{key:"componentDidMount",value:function componentDidMount()

{
this._isMounted=true;
_reactNative.AppState.addEventListener('change',this._handleAppStateChange.bind(this));

_reactNativeOrientation2.default.addSpecificOrientationListener(this._orientationDidChange.bind(this));
var orientation=_reactNativeOrientation2.default.getInitialOrientation();
if(orientation&&(orientation==="PORTRAITUPSIDEDOWN"||orientation==="UNKNOWN")){
orientation="PORTRAIT";
this.setState({orientation:orientation});
}else if(orientation){
this.setState({orientation:orientation});
}else if(orientation===null){

orientation=this.state.width>this.state.height?"LANDSCAPE":"PORTRAIT";
this.setState({orientation:orientation});
}


if(this.props.src){
this._loadBook(this.props.src);
}
}},{key:"componentWillUnmount",value:function componentWillUnmount()

{
this._isMounted=false;

_reactNative.AppState.removeEventListener('change',this._handleAppStateChange);
_reactNativeOrientation2.default.removeSpecificOrientationListener(this._orientationDidChange);
clearTimeout(this.orientationTimeout);

this.destroy();
}},{key:"shouldComponentUpdate",value:function shouldComponentUpdate(

nextProps,nextState){

if(nextState.show!==this.state.show){
return true;
}

if(nextProps.width!==this.props.width||
nextProps.height!==this.props.height){
return true;
}

if(nextState.width!==this.state.width||
nextState.height!==this.state.height){
return true;
}


if(nextProps.color!=this.props.color){
return true;
}

if(nextProps.backgroundColor!=this.props.backgroundColor){
return true;
}

if(nextProps.size!=this.props.size){
return true;
}

if(nextProps.flow!=this.props.flow){
return true;
}

if(nextProps.origin!=this.props.origin){
return true;
}

if(nextProps.orientation!=this.props.orientation){
return true;
}

if(nextProps.src!=this.props.src){
return true;
}

if(nextProps.onPress!=this.props.onPress){
return true;
}

if(nextProps.onLongPress!=this.props.onLongPress){
return true;
}

if(nextProps.stylesheet!=this.props.stylesheet){
return true;
}

if(nextProps.javascript!=this.props.javascript){
return true;
}

return false;
}},{key:"componentWillUpdate",value:function componentWillUpdate(

nextProps){
if(nextProps.src!==this.props.src){
this.destroy();
}
}},{key:"componentDidUpdate",value:function componentDidUpdate(

prevProps){

if(prevProps.src!==this.props.src){
this._loadBook(this.props.src);
}else if(prevProps.orientation!==this.props.orientation){
_orientationDidChange(this.props.orientation);
}else if(prevProps.width!==this.props.width||prevProps.height!==this.props.height){

}

if(prevProps.location!==this.props.location){

}
}},{key:"_orientationDidChange",value:function _orientationDidChange(


orientation){var _this2=this;
var wait=10;

if(!this.active)return;

if(orientation==="UNKNOWN"||orientation=="PORTRAITUPSIDEDOWN"||this.orientation===orientation){
return;
}

this.orientationTimeout=setTimeout(function(){
if(_this2._isMounted){
_this2._updateOrientation(orientation);
}
},wait);

}},{key:"_updateOrientation",value:function _updateOrientation(

orientation){
var location=this._visibleLocation?this._visibleLocation.start.cfi:this.props.location;
var width,height;
var bounds=_reactNative.Dimensions.get('window');
var _width=bounds.width,_height=bounds.height;
var reversed=false;

__DEV__&&console.log("orientation",orientation,bounds.width,bounds.height);

switch(orientation){
case"PORTRAIT":
if(_width>_height){reversed=true;};
break;
case"LANDSCAPE":
width=this.props.height||_width;
height=this.props.width||_height;
break;
case"LANDSCAPE-RIGHT":
if(_height>_width){reversed=true;};
break;
case"LANDSCAPE-LEFT":
if(_height>_width){reversed=true;};
break;
default:
reversed=false;}



this.setState({orientation:orientation});


if(reversed){
width=this.props.width||_height;
height=this.props.height||_width;
}else{
width=this.props.width||_width;
height=this.props.height||_height;
}

this.setState({width:width,height:height});

this.props.onOrientationChanged&&this.props.onOrientationChanged(orientation);
}},{key:"redisplay",value:function redisplay(

location){
var _location=location;
if(!_location){
_location=this._visibleLocation?this._visibleLocation.start.cfi:this.props.location;
}

if(this.rendition){

}
}},{key:"_loadBook",value:function _loadBook(

bookUrl){
__DEV__&&console.log("loading book: ",bookUrl);

this.book=(0,_epubjs2.default)({
replacements:this.props.base64||"none"});


return this._openBook(bookUrl);



















}},{key:"_openBook",value:function _openBook(

bookUrl,useBase64){var _this3=this;
var type=useBase64?"base64":null;

this.book.open(bookUrl).
then(function(){

}).
catch(function(err){
console.error(err);
});

this.rendition=this.refs["rendition"];


this.book.ready.then(function(){
_this3.props.onReady&&_this3.props.onReady(_this3.book);
});

this.book.loaded.navigation.then(function(nav){
_this3.setState({toc:nav.toc});
_this3.props.onNavigationReady&&_this3.props.onNavigationReady(nav.toc);
});

if(this.props.generateLocations!=false){
this.loadLocations().then(function(locations){
_this3.rendition.setLocations(locations);

_this3.props.onLocationsReady&&_this3.props.onLocationsReady(_this3.book.locations);
});
}

}},{key:"loadLocations",value:function loadLocations()

{var _this4=this;
return this.book.ready.then(function(){

var key=_this4.book.key()+"-locations";

return _reactNative.AsyncStorage.getItem(key).then(function(stored){
if(_this4.props.regenerateLocations!=true&&stored!==null){
return _this4.book.locations.load(stored);
}else{
return _this4.book.locations.generate(_this4.props.locationsCharBreak||600).then(function(locations){

_reactNative.AsyncStorage.setItem(key,_this4.book.locations.save());
return locations;
});
}
});

});
}},{key:"onRelocated",value:function onRelocated(

visibleLocation){
this._visibleLocation=visibleLocation;

if(this.props.onLocationChange){
this.props.onLocationChange(visibleLocation);
}
}},{key:"visibleLocation",value:function visibleLocation()

{
return this._visibleLocation;
}},{key:"getRange",value:function getRange(

cfi){
return this.book.getRange(cfi);
}},{key:"_handleAppStateChange",value:function _handleAppStateChange(

appState){
if(appState==="active"){
this.active=true;
}

if(appState==="background"){
this.active=false;
}

if(appState==="inactive"){
this.active=false;
}
}},{key:"destroy",value:function destroy()

{
if(this.book){
this.book.destroy();
}
}},{key:"render",value:function render()

{
return(
_react2.default.createElement(Rendition,{
ref:"rendition",
url:this.props.src,
flow:this.props.flow,
minSpreadWidth:this.props.minSpreadWidth,
stylesheet:this.props.stylesheet,
script:this.props.script,
onSelected:this.props.onSelected,
onMarkClicked:this.props.onMarkClicked,
onPress:this.props.onPress,
onLongPress:this.props.onLongPress,
onViewAdded:this.props.onViewAdded,
beforeViewRemoved:this.props.beforeViewRemoved,
themes:this.props.themes,
theme:this.props.theme,
fontSize:this.props.fontSize,
font:this.props.font,
display:this.props.location,
onRelocated:this.onRelocated.bind(this),
orientation:this.state.orientation,
backgroundColor:this.props.backgroundColor,__source:{fileName:_jsxFileName,lineNumber:368}}));


}}]);return Epub;}(_react.Component);


var styles=_reactNative.StyleSheet.create({
container:{
flex:1,
flexDirection:"column"},

manager:{
flex:1},

scrollContainer:{
flex:1,
marginTop:0,
flexDirection:"row",
flexWrap:"nowrap",
backgroundColor:"#F8F8F8"},

rowContainer:{
flex:1},

loadScreen:{
position:"absolute",
top:0,
bottom:0,
left:0,
right:0,
backgroundColor:"#fff",
justifyContent:"center",
alignItems:"center"}});



module.exports=Epub;