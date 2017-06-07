window.epubContents = undefined;
(function () {
 	var waitForReactNativePostMessageReady;

	function _ready() {
		var contents;
		var targetOrigin = "*";
		var sendMessage = function(obj) {
			window.postMessage(JSON.stringify(obj), targetOrigin);
		};

		var isReactNativePostMessageReady = !!window.originalPostMessage;
		clearTimeout(waitForReactNativePostMessageReady);
		if(!isReactNativePostMessageReady) {
		  waitForReactNativePostMessageReady = setTimeout(_ready, 1);
			return;
		}

		if (typeof EPUBJSContents === "undefined") {
			return sendMessage({
				method: "error",
				value: "EPUB.js is not loaded"
			});
		}

		contents = new EPUBJSContents(document);

		contents.setCfiBase = function(cfiBase) {
			contents.cfiBase = cfiBase;
		};

		var preventTap = false;
		contents.mark = function(cfiRange, data) {
			var m = EPUBJSContents.prototype.mark.call(contents, cfiRange, data);
			m.addEventListener("touchstart", function (e) {
				var bounds = e.target.getBoundingClientRect();
				var padding = parseFloat(window.getComputedStyle(e.target)["paddingRight"]);
				var clientX = e.targetTouches[0].pageX;
				if (clientX >= bounds.right - (padding || 0)) {
					preventTap = true;
					sendMessage({method:"markClicked", data: data, cfiRange: cfiRange });
          e.preventDefault();
          e.stopPropagation();
				}
			});
			return m;
		};

		document.addEventListener("message", function (e) {
			var message = e.data;
			var decoded = (typeof message == "object") ? message : JSON.parse(message);
			var response;
			var result;

			if (decoded.method in contents) {
				result = contents[decoded.method].apply(contents, decoded.args);

				response = {
					method: decoded.method,
					promise: decoded.promise,
					value: result
				};

				sendMessage(response);

			}
		});

		contents.on("resize", function (size) {
			sendMessage({method:"resize", value: size });
		});

		contents.on("expand", function () {
			sendMessage({method:"expand", value: true});
		});

		contents.on("link", function (href) {
			sendMessage({method:"link", value: href});
		});

		contents.on("selected", function (sel) {
			preventTap = true;
			sendMessage({method:"selected", value: sel});
		});

		var startPosition = { x: -1, y: -1 };
		var currentPosition = { x: -1, y: -1 };
		var isLongPress = false;
		var longPressTimer;
		var touchduration = 300;

		document.getElementsByTagName('body')[0].addEventListener("touchstart", function (e) {
			startPosition.x = e.targetTouches[0].pageX;
			startPosition.y = e.targetTouches[0].pageY;
			currentPosition.x = e.targetTouches[0].pageX;
			currentPosition.y = e.targetTouches[0].pageY;
			isLongPress = false;
			longPressTimer = setTimeout(function() {
				isLongPress = true;
			}, touchduration);
		}, false);

		document.getElementsByTagName('body')[0].addEventListener("touchmove", function (e) {
			currentPosition.x = e.targetTouches[0].pageX;
			currentPosition.y = e.targetTouches[0].pageY;
			clearTimeout(longPressTimer);
		}, false);

 		document.getElementsByTagName('body')[0].addEventListener("touchend", function (e) {
			var cfi;
			clearTimeout(longPressTimer);
			if(Math.abs(startPosition.x - currentPosition.x) < 2 &&
				 Math.abs(startPosition.y - currentPosition.y) < 2) {

				cfi = contents.cfiFromNode(e.changedTouches[0].target).toString();

				if(preventTap) {
					preventTap = false;
				} else if(isLongPress) {
					sendMessage({method:"longpress", position: currentPosition, cfi: cfi});
					isLongPress = false;
				} else {
					setTimeout(function() {
						if(preventTap) {
							preventTap = false;
							isLongPress = false;
							return;
						}
						sendMessage({method:"press", position: currentPosition, cfi: cfi});
					}, 10);
				}
			}
		}, false);

		sendMessage({method:"ready", value: true});

		window.epubContents = contents;
	}

	if ( document.readyState === 'complete' ) {
		_ready();
	} else {
		window.addEventListener("load", _ready, false);
	}
}());
