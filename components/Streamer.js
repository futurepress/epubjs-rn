Object.defineProperty(exports,"__esModule",{value:true});var _createClass=function(){function defineProperties(target,props){for(var i=0;i<props.length;i++){var descriptor=props[i];descriptor.enumerable=descriptor.enumerable||false;descriptor.configurable=true;if("value"in descriptor)descriptor.writable=true;Object.defineProperty(target,descriptor.key,descriptor);}}return function(Constructor,protoProps,staticProps){if(protoProps)defineProperties(Constructor.prototype,protoProps);if(staticProps)defineProperties(Constructor,staticProps);return Constructor;};}();var _reactNative=require('react-native');



var _reactNativeStaticServer=require('react-native-static-server');var _reactNativeStaticServer2=_interopRequireDefault(_reactNativeStaticServer);

var _reactNativeFetchBlob=require('react-native-fetch-blob');var _reactNativeFetchBlob2=_interopRequireDefault(_reactNativeFetchBlob);

var _reactNativeZipArchive=require('react-native-zip-archive');



var _pathWebpack=require('path-webpack');function _interopRequireDefault(obj){return obj&&obj.__esModule?obj:{default:obj};}function _classCallCheck(instance,Constructor){if(!(instance instanceof Constructor)){throw new TypeError("Cannot call a class as a function");}}

var Dirs=_reactNativeFetchBlob2.default.fs.dirs;

if(!global.Blob){
global.Blob=_reactNativeFetchBlob2.default.polyfill.Blob;
}

var Uri=require('epubjs/lib/utils/url');var

EpubStreamer=function(){

function EpubStreamer(opts){_classCallCheck(this,EpubStreamer);
opts=opts||{};
this.port=opts.port||0;
this.root=opts.root||"www";
this.server=new _reactNativeStaticServer2.default(this.port,this.root,{localOnly:true});

this.serverOrigin='file://';

this.urls=[];
this.locals=[];
this.paths=[];

this.started=false;
}_createClass(EpubStreamer,[{key:'start',value:function start()

{var _this=this;
this.started=true;
return this.server.start().then(function(url){
_this.serverOrigin=url;
return url;
});
}},{key:'stop',value:function stop()

{
this.started=false;
if(this.server){
this.server.stop();
}
}},{key:'kill',value:function kill()

{
this.started=false;
if(this.server){
this.server.kill();
}
}},{key:'add',value:function add(

bookUrl){var _this2=this;
var uri=new Uri(bookUrl);
var filename=this.filename(bookUrl);

return _reactNativeFetchBlob2.default.
config({
fileCache:true,
path:Dirs.DocumentDir+'/'+filename}).

fetch("GET",bookUrl).
then(function(res){
var sourcePath=res.path();
var targetPath=Dirs.DocumentDir+'/'+_this2.root+'/'+filename;
var url=_this2.serverOrigin+'/'+filename+'/';

return(0,_reactNativeZipArchive.unzip)(sourcePath,targetPath).
then(function(path){

_this2.urls.push(bookUrl);
_this2.locals.push(url);
_this2.paths.push(path);



return url;
});
});
}},{key:'check',value:function check(

bookUrl){
var filename=this.filename(bookUrl);
var targetPath=Dirs.DocumentDir+'/'+filename;

return _reactNativeFetchBlob2.default.fs.exists(targetPath);
}},{key:'get',value:function get(

bookUrl){var _this3=this;
return this.check(bookUrl).
then(function(exists){
if(exists){
var filename=_this3.filename(bookUrl);
var url=_this3.serverOrigin+'/'+filename+'/';
return url;
}

return _this3.add(bookUrl);
});
}},{key:'filename',value:function filename(

bookUrl){
var uri=new Uri(bookUrl);
return uri.filename.replace(".epub","");
}},{key:'remove',value:function remove(

path){var _this4=this;
return _reactNativeFetchBlob2.default.fs.lstat(path).
then(function(stats){
var index=_this4.paths.indexOf(path);
_this4.paths.splice(index,1);
_this4.urls.splice(index,1);
_this4.locals.splice(index,1);
}).
catch(function(err){});
}},{key:'clean',value:function clean()

{var _this5=this;
this.paths.forEach(function(path){
_this5.remove(path);
});
}}]);return EpubStreamer;}();exports.default=


EpubStreamer;