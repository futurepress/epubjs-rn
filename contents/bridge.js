window.onerror = function (message, file, line, col, error) {
  var msg = JSON.stringify({method:"error", value: message});
  window.postMessage(msg, "*");
};

(function () {
   var waitForReactNativePostMessageReady;

  function _ready() {
    var contents;
    var targetOrigin = "*";
    var sendMessage = function(obj) {
      window.postMessage(JSON.stringify(obj), targetOrigin);
    };

    var preventTap = false;
    var q = [];
    var _isReady = false;

    var book;
    var rendition;

    var minSpreadWidth = 800;

    // debug
    console.log = function() {
      sendMessage({method:"log", value: Array.from(arguments)});
    }

    console.error = function() {
      sendMessage({method:"error", value: Array.from(arguments)});
    }

    var isReactNativePostMessageReady = !!window.originalPostMessage;
    clearTimeout(waitForReactNativePostMessageReady);
    if(!isReactNativePostMessageReady) {
      waitForReactNativePostMessageReady = setTimeout(_ready, 1);
      return;
    }

    function onMessage(e) {
      var message = e.data;
      handleMessage(message);
    }

    function handleMessage(message) {
      var decoded = (typeof message == "object") ? message : JSON.parse(message);
      var response;
      var result;

      switch (decoded.method) {
        case "open": {
          var url = decoded.args[0];
          var options = decoded.args.length > 1 && decoded.args[1];
          openEpub(url, options);
          break;
        }
        case "display": {
          var args = decoded.args && decoded.args.length && decoded.args[0];
          var target;

          if (!args) {
            target = undefined;
          }
          else if (args.target) {
            target = args.target.toString();
          }
          else if (args.spine) {
            target = parseInt(args.spine);
          }

          rendition.display(target);
          break;
        }
        case "flow": {
          var direction = decoded.args.length && decoded.args[0];

          if (direction) {
            rendition.flow(direction);
          }

          break;
        }
        case "setLocations": {
          var locations = decoded.args[0];
          book.locations.load(locations);

          rendition.reportLocation();
          break;
        }
        case "reportLocation": {
          rendition.reportLocation();
          break;
        }
        case "minSpreadWidth": {
          minSpreadWidth = decoded.args;
          break;
        }
        case "mark": {
          rendition.annotations.mark.apply(rendition.annotations, decoded.args);
          break;
        }
        case "underline": {
          rendition.annotations.underline.apply(rendition.annotations, decoded.args);
          break;
        }
        case "highlight": {
          rendition.annotations.highlight.apply(rendition.annotations, decoded.args);
          break;
        }
        case "removeAnnotation": {
          rendition.annotations.remove.apply(rendition.annotations, decoded.args);
          break;
        }
        case "themes": {
          var themes = decoded.args[0];
          rendition.themes.register(themes);
          break;
        }
        case "theme": {
          var theme = decoded.args[0];
          rendition.themes.select(theme);
          break;
        }
        case "fontSize": {
          var fontSize = decoded.args[0];
          rendition.themes.fontSize(fontSize);
          break;
        }
        case "font": {
          var font = decoded.args[0];
          rendition.themes.font(font);
          break;
        }
      }
    }

    function openEpub(url, options) {
      var settings = Object.assign({
        manager: "continuous",
        overflow: "visible"
      }, options);

      window.book = book = ePub(url);

      window.rendition = rendition = book.renderTo(document.body, settings);

      rendition.hooks.content.register(function(contents, rendition) {
        var doc = contents.document;
        var startPosition = { x: -1, y: -1 };
        var currentPosition = { x: -1, y: -1 };
        var isLongPress = false;
        var longPressTimer;
        var touchduration = 300;
        var $body = doc.getElementsByTagName('body')[0];

        $body.addEventListener("touchstart", function (e) {
          var f, target;
          startPosition.x = e.targetTouches[0].pageX;
          startPosition.y = e.targetTouches[0].pageY;
          currentPosition.x = e.targetTouches[0].pageX;
          currentPosition.y = e.targetTouches[0].pageY;
          isLongPress = false;

          for (var i=0; i < e.targetTouches.length; i++) {
            f = e.changedTouches[i].force;
            if (f >= 0.8 && !preventTap) {
              target = e.changedTouches[i].target;

              if (target.getAttribute("ref") === "epubjs-mk") {
                return;
              }

              clearTimeout(longPressTimer);

              cfi = contents.cfiFromNode(target).toString();

              sendMessage({method:"longpress", position: currentPosition, cfi: cfi});
              isLongPress = false;
              preventTap = true;
            }
          }

          longPressTimer = setTimeout(function() {
            target = e.targetTouches[0].target;

            if (target.getAttribute("ref") === "epubjs-mk") {
              return;
            }

            cfi = contents.cfiFromNode(target).toString();

            sendMessage({method:"longpress", position: currentPosition, cfi: cfi});
            preventTap = true;
          }, touchduration);
        }, false);

        $body.addEventListener("touchmove", function (e) {
          currentPosition.x = e.targetTouches[0].pageX;
          currentPosition.y = e.targetTouches[0].pageY;
          clearTimeout(longPressTimer);
        }, false);

        $body.addEventListener("touchend", function (e) {
          var cfi;
          clearTimeout(longPressTimer);

          if(preventTap) {
            preventTap = false;
            return;
          }

          if(Math.abs(startPosition.x - currentPosition.x) < 2 &&
             Math.abs(startPosition.y - currentPosition.y) < 2) {

            var target = e.changedTouches[0].target;

            if (target.getAttribute("ref") === "epubjs-mk") {
              return;
            }

            cfi = contents.cfiFromNode(target).toString();

            if(isLongPress) {
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

        $body.addEventListener('touchforcechange', function (e) {
          var f = e.changedTouches[0].force;
          if (f >= 0.8 && !preventTap) {
            var target = e.changedTouches[0].target;

            if (target.getAttribute("ref") === "epubjs-mk") {
              return;
            }

            clearTimeout(longPressTimer);

            cfi = contents.cfiFromNode(target).toString();

            sendMessage({method:"longpress", position: currentPosition, cfi: cfi});
            isLongPress = false;
            preventTap = true;
          }
        }, false);

      }.bind(this));

      rendition.on("relocated", function(location){
        sendMessage({method:"relocated", location: location});
      });

      rendition.on("selected", function (cfiRange) {
        preventTap = true;
        sendMessage({method:"selected", cfiRange: cfiRange});
      });

      rendition.on("markClicked", function (cfiRange, data) {
        sendMessage({method:"markClicked", cfiRange: cfiRange, data: data});
      });

      rendition.on("rendered", function (section) {
        sendMessage({method:"rendered", sectionIndex: section.index});
      });

      rendition.on("added", function (section) {
        sendMessage({method:"added", sectionIndex: section.index});
      });

      rendition.on("removed", function (section) {
        sendMessage({method:"removed", sectionIndex: section.index});
      });

      book.ready.then(function(){
        _isReady = true;

        sendMessage({method:"ready"});

        // replay messages
        // q.forEach((msg) => {
        //   console.log("replay", msg);
        //   handleMessage(msg);
        // })
      });

      window.addEventListener("unload", function () {
        book && book.destroy();
      });
    }

    window.addEventListener("message", onMessage);
    // React native uses document for postMessages
    document.addEventListener("message", onMessage);

    sendMessage({method:"loaded", value: true});

  }

  if ( document.readyState === 'complete' ) {
    _ready();
  } else {
    window.addEventListener("load", _ready, false);
  }
}());
