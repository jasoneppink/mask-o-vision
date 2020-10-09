"use strict";

var invisible_video;
var docElm = document.documentElement;
var isMac = navigator.platform.toUpperCase().indexOf('MAC')>=0;
var isChrome = navigator.userAgent.indexOf("Chrome") > -1;
var isFirefox = navigator.userAgent.indexOf("Firefox") > -1;
var plight;
var alight;

function getWindowFocus() {
  if((isMac && isFirefox) || !isMac) { //do this unless it's Chrome on Mac
    fullscreenInstructions.classList.remove('hidden');
    fullscreenInstructions.classList.add('fadeinout');
  }
  if(isMac) { //Mac only
    return browser.runtime.sendMessage('mac-refocus-window');
  } else { //PC and Ubuntu Linux (at least on Gnome)
    return browser.runtime.sendMessage('pc-make-window-fullscreen')
  }
}

function handleError(error) {
  console.log(`Error refocusing window: ${error}`);
}

//Start screen share
var getDisplay = function() {
  getstarted.style.display = "none";
  instructions.style.display = "inline";
  if(navigator.getDisplayMedia || navigator.mediaDevices.getDisplayMedia) {
        if(navigator.mediaDevices.getDisplayMedia) {
            navigator.mediaDevices.getDisplayMedia({video: true})
            .then(stream => {main(stream)})
            .then(getWindowFocus)
            //.then(makeFullScreen, handleError)

        }
        else if(navigator.getDisplayMedia) {
            navigator.getDisplayMedia({video: true})
            .then(stream => {main(stream)})
            .then(getWindowFocus)
            //.then(makeFullScreen, handleError)
        }
    }
}



const SETTINGS = {
  gltfModelURL: chrome.runtime.getURL("conical_white_mask.glb"),
  offsetYZ: [-.2,.5],
  scale: .8
};

let THREECAMERA = null;

// callback: launched if a face is detected or lost
function detect_callback(faceIndex, isDetected){
  if (isDetected){
    console.log('INFO in detect_callback(): face n°', faceIndex, 'DETECTED');

    var averageSceneColor = new FastAverageColor();
    var color = averageSceneColor.getColor(invisible_video);
    var colorHex = "0x" + color.hex.substr(1);
    console.log(colorHex);
    plight.color.setHex( colorHex );
    alight.color.setHex( colorHex );
    //get average color of frame
  } else {
    console.log('INFO in detect_callback(): face n°', faceIndex, 'LOST');
  }
}

// build the 3D. called once when Jeeliz Face Filter is OK
function init_threeScene(spec){
  const threeStuffs = THREE.JeelizHelper.init(spec, detect_callback);

  // IMPORT THE GLTF MODEL:
  // from https://threejs.org/examples/#webgl_loader_gltf
  const gltfLoader = new THREE.GLTFLoader();
  gltfLoader.load( SETTINGS.gltfModelURL, function ( gltf ) {
    gltf.scene.traverse( function ( child ) {
    } );
    gltf.scene.scale.set(.01, .01, .01); //JE
    alight = new THREE.AmbientLight( 0x89827b, .9);
    gltf.scene.add(alight); //JE
    plight = new THREE.PointLight( 0x89827b, .7, 100 );
    plight.position.set( 50, 50, 50 );
    gltf.scene.add( plight );

    gltf.scene.frustumCulled = false;

    // center and scale the object:
    const bbox = new THREE.Box3().expandByObject(gltf.scene);

    // center the model:
    const centerBBox = bbox.getCenter(new THREE.Vector3());
    gltf.scene.position.add(centerBBox.multiplyScalar(-1));
    gltf.scene.position.add(new THREE.Vector3(0,SETTINGS.offsetYZ[0], SETTINGS.offsetYZ[1]));

    // scale the model according to its width:
    const sizeX = bbox.getSize(new THREE.Vector3()).x;
    gltf.scene.scale.multiplyScalar(SETTINGS.scale / sizeX);

    // dispatch the model:
    threeStuffs.faceObject.add(gltf.scene);

  } ); //end gltfLoader.load callback

  //CREATE THE CAMERA
  THREECAMERA = THREE.JeelizHelper.create_camera();
} //end init_threeScene()

//entry point
function main(stream){
  instructions.style.display = "none";
  invisible_video = document.createElement('video');
  invisible_video.srcObject = stream;
  invisible_video.play();

  JeelizResizer.size_canvas({
    canvasId: 'jeeFaceFilterCanvas',
    isFullScreen: false, //necessary to keep the image from staying a weird horizontal streaks of color
    callback: start,
    onResize: function(){
      THREE.JeelizHelper.update_camera(THREECAMERA);
    }
  });
}

function start(){
  document.body.style.backgroundColor = "black";
  JEEFACEFILTERAPI.init({
    videoSettings:{
      videoElement: invisible_video,
    },
    followZRot: true,
    maxFacesDetected: 1,
    canvasId: 'jeeFaceFilterCanvas',
    //NNC: chrome.runtime.getURL('dist/NNC.json'),
    //NNCpath: chrome.runtime.getURL("/dist"),
    //NNC and NNCpath don't work in the browser extension environment.
    //To change which NNC file we're using, change the following in jeelizFaceFilterES6.js:
    //line 31: file name
    //line 143: directory

    callbackReady: function(errCode, spec){
      if (errCode){
        console.log('AN ERROR HAPPENS. SORRY BRO :( . ERR =', errCode);
        return;
      }

      console.log('INFO: JEEFACEFILTERAPI IS READY');
      init_threeScene(spec);
      window.dispatchEvent(new Event('resize')); //kloogy, but keeps us from getting horizontal streaks of color. Might not work in IE.
    }, //end callbackReady()

    // called at each render iteration (drawing loop):
    callbackTrack: function(detectState){
      THREE.JeelizHelper.render(detectState, THREECAMERA);
    }
  }); //end JEEFACEFILTERAPI.init call

  docElm.addEventListener('click', (event) => {
    if((isMac && isFirefox) || !isMac) {
      if (document.fullscreenElement) {
        // exitFullscreen is only available on the Document object.
        document.exitFullscreen();
      } else {
        docElm.requestFullscreen();
      }
    } else {
      //Mac Chrome doesn't support fullscreen
    }
  });

} //end start()



var getstarted;
var instructions;
console.log("Firefox? " + isFirefox);
console.log("Chrome? " + isChrome);
console.log("Mac? " + isMac);

if(isFirefox){
  if(isMac){
    getstarted = document.getElementById('getstarted-firefox-mac');
    instructions = document.getElementById('instructions-firefox-mac');
  } else {
    getstarted = document.getElementById('getstarted-firefox-pc');
    instructions = document.getElementById('instructions-firefox-pc');
  }
}
if(isChrome){
  if(isMac){
    getstarted = document.getElementById('getstarted-chrome-mac');
    instructions = document.getElementById('instructions-chrome-mac');
} else {
    getstarted = document.getElementById('getstarted-chrome-pc');
    instructions = document.getElementById('instructions-chrome-pc');
  }
}

docElm.addEventListener('fullscreenchange', (event) => {
  // document.fullscreenElement will point to the element that
  // is in fullscreen mode if there is one. If not, the value
  // of the property is null.

  if (document.fullscreenElement) {
    console.log(`Element: ${document.fullscreenElement.id} entered fullscreen mode.`);
    if(isMac){
      console.log("Sending request to return focus");
      browser.runtime.sendMessage('mac-return-focus-window');
      console.log("Mac finished");
    } else {
      console.log("PC doesn't require refocus.");
    }
  } else {
    console.log('Leaving full-screen mode.');
  }
});

getstarted.style.display = "inline";
getstarted.addEventListener('click', getDisplay, {once:true});

fullscreenInstructions = document.getElementById('fullscreenInstructions');
