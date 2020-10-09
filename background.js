var newWindowID;
var currentWindowID;

function logTabs(windowInfo) {
  for (tabInfo of windowInfo.tabs) {
    currentWindowID = tabInfo.windowId;
    console.log("currentWindowID: "+ tabInfo.windowId);
  }
}

function onError(error) {
  console.log(`Error: ${error}`);
}

browser.browserAction.onClicked.addListener((tab) => {
  var getting = browser.windows.get(tab.windowId, {populate: true});
  getting.then(logTabs, onError);
});



// Get the user-agent string
var isChrome = navigator.userAgent.indexOf("Chrome") > -1;
var isFirefox = navigator.userAgent.indexOf("Firefox") > -1;
var isMac = navigator.platform.toUpperCase().indexOf('MAC')>=0;



chrome.browserAction.onClicked.addListener(function() {
  //resolution of display/monitor
  const screenHeight = window.screen.height;
  const screenWidth = window.screen.width;

  function getCurrentWindow() {
    return browser.windows.getCurrent();
  }

  const getMenuBarHeight = browser.tabs.executeScript({
    code: 'window.outerHeight - window.innerHeight' //height of browser chrome
  });

  getMenuBarHeight.then((menuBarHeight) => {
    console.log("menuBarHeight: " + menuBarHeight[0]);

    const getBrowserChromeWidth = browser.tabs.executeScript({
      code: 'window.outerWidth - window.innerWidth' //width of browser chrome
    });

    getBrowserChromeWidth.then((browserChromeWidth) => {
      console.log("browserChromeWidth: " + browserChromeWidth[0]);

      browser.tabs.executeScript({
        code: 'console.log("Calculated new dimensions: " + Math.round(window.screen.width / 3) + " x " + Math.round(window.screen.height / 3));'
      });

      //Firefox (at least in Windows) has to be at least 452 pixels wide
      var screenDivisor;
      if(window.screen.width / 4 < 452) {
        screenDivisor = 3;
      } else {
        screenDivisor = 4;
      }

      getCurrentWindow().then((currentWindow) => {
        var updateInfo = {
          top: 0,
          left: 0,
          width: Math.round(screenWidth / screenDivisor) + browserChromeWidth[0],
          height: Math.round(screenHeight / screenDivisor) + menuBarHeight[0]
        };

        browser.windows.update(currentWindow.id, updateInfo);

        browser.tabs.executeScript({
          code: 'console.log("Display resolution: " + window.screen.width + " x " + window.screen.height); console.log("Actual new dimensions (outer): " + window.outerWidth + " x " + window.outerHeight); console.log("Actual new dimensions (inner): " + window.innerWidth + " x " + window.innerHeight);'
        });
      });

      var newWindowWidth;
      var newWindowHeight;

      if(isFirefox){
        newWindowWidth = (354) * Math.round(screenWidth / screenHeight);
        newWindowHeight = 354 + (menuBarHeight[0] * Math.round(screenWidth / screenHeight));
      }
      if(isChrome){
        newWindowWidth = 1140;
        newWindowHeight = Math.round( 1140 / (screenWidth / screenHeight) + (menuBarHeight[0] * (screenWidth / screenHeight)));
      }

      //open new window
      let createData = {
          type: "normal",
          top: 0,
          left: screenWidth - 1140,
          width: newWindowWidth,
          height: newWindowHeight,
          url: "index.html?" + (menuBarHeight[0] * screenDivisor), //make this value available to non-background scripts. Check in other OSes / browsers
        };
        let creating = browser.windows.create(createData);
        creating.then((winInfo) => {
          newWindowID = winInfo.id;
          console.log("Maskify window opened: " + newWindowID);
        });

      });
    });
});


function newOrderListener(message, sender, sendResponse) {
  console.log('Received refocus-window request. Sender: window %s, tab %s', sender.tab.windowId, sender.tab.id);
    if (message === 'mac-refocus-window') {
        browser.windows.update(sender.tab.windowId, {
            focused: true,
          }
        );
        sendResponse({response: "mac-finished"});
    } else if (message === 'pc-make-window-fullscreen') {
      browser.windows.update(sender.tab.windowId, {
          //state: "fullscreen",
          focused: true,
        }
      );
      sendResponse({response: "pc-finished"});
    } else if (message === 'mac-return-focus-window') {
      console.log("Returning focus to source window.");
      browser.windows.update(currentWindowID, {
          focused: true,
        }
      );
    }
}
chrome.runtime.onMessage.addListener(newOrderListener);
