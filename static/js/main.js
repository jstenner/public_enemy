/**
 * Created by jstenner on 5/28/16.
 */

// Toggle between throwing chairs and dumping them with the "1" key.

// Detects webgl
if (!Detector.webgl) {
    Detector.addGetWebGLMessage();
    document.getElementById('webglcontainer').innerHTML = "";
}

// to display loading animation while the files load
// http://benchung.com/loading-animation-three-js/
// http://heartcode.robertpataki.com/canvasloader/
$(document).ready(function () {
    if ($('.loading-container').length) {

        //to show loading animation
        $imgloader = $('.loading-container');
        $loadingimg = $('<div id="canvasloader-container" class="onepix-imgloader"></div>');

        //$loadingimg.attr("src","images/flexslider/loading.gif");
        $imgloader.prepend($loadingimg);

        var cl = new CanvasLoader('canvasloader-container');
        cl.setColor('#707070'); // default is '#000000'
        cl.setDiameter(45); // default is 40
        cl.setDensity(75); // default is 40
        cl.setRange(0.7); // default is 1.3
        cl.setSpeed(3); // default is 2
        cl.setFPS(22); // default is 24
        cl.show(); // Hidden by default
    }
});

// MAKE SURE TO CHANGE THIS DEPENDING ON WHETHER YOU'RE TESTING OR DEPLOYING
// - Global variables -
var remote = "http://thepublicenemy.us";
var local = "http://localhost:6116";
var DOMAIN = remote; // choose local or remote based on whether this is being run in production or not.

// Graphics variables
var loadingManager;
var readyToRender = false;
var container;
//var stats; // disabled for production
var camera, controls, scene, renderer;
var cameraCube, sceneCube;
var textureCube;
var cubeMesh;
var axisHelper, color, gridHelper, dirHelper, camHelper;
var feedbackActivated = false; // state of feedbackPanel
var clock = new THREE.Clock();
var clickRequest = false;
var mouseCoords = new THREE.Vector2();
var INTERSECTED = [];
var raycaster = new THREE.Raycaster();
var objects = [];
var pos = new THREE.Vector3();
var quat = new THREE.Quaternion();
var boxpos = new THREE.Vector3();
var boxquat = new THREE.Quaternion();
var puppetBox = new THREE.Vector3();
var puppetBoxquat = new THREE.Quaternion();
var gDonkeypos = new THREE.Vector3();
var gDonkeyquat = new THREE.Quaternion();
var gElephantpos = new THREE.Vector3();
var gElephantquat = new THREE.Quaternion();
var gRingBlockpos = new THREE.Vector3();
var gRingBlockquat = new THREE.Quaternion();

// Sound
var audioListener;
var masterVolume;
var elephantSound;
var donkeySound;
var hillarySound;
var ambientSound;
var gruntF1Sound, gruntF2Sound, gruntM1Sound, gruntM2Sound, gruntM3Sound;
var chairsSound, chairstooSound, fukthisSound, generalthrow1Sound, generalthrow2Sound, objectsalloverSound, rainingchairsSound, stillcomingSound;
var chairthrowSound;
var gruntSounds = [];
var dumpSounds = [];

var throwMode = true;
var numTweetsToDump = 10; // how many 2D sprites to drop when a chair collides with soft body

// Physics variables
var gravityConstant = -9.8;
var collisionConfiguration;
var dispatcher;
var broadphase;
var solver;
var softBodySolver;
var physicsWorld;
var rigidBodies = [];
var softBodiesToRender = [];
var margin = 0.04;
var transformAux1 = new Ammo.btTransform();
var softBodyHelpers = new Ammo.btSoftBodyHelpers();
var ACTIVE_TAG = 0;
var DISABLE_SIMULATION = 3;
var throwVelocity = 90; // Multiplier for the chair throw action
//var collisionTypes = {COL_NOTHING: 0, COL_SOFT: Ammo._bitshift64Ashr}

var STATE = {
    ACTIVE : 1,
    ISLAND_SLEEPING : 2,
    WANTS_DEACTIVATION : 3,
    DISABLE_DEACTIVATION : 4,
    DISABLE_SIMULATION : 5
}

var FLAGS = {
    STATIC_OBJECT : 1,
    KINEMATIC_OBJECT : 2,
    NO_CONTACT_RESPONSE : 4,
    CUSTOM_MATERIAL_CALLBACK : 8,
    CHARACTER_OBJECT : 16,
    DISABLE_VISUALIZE_OBJECT : 32,
    DISABLE_SPU_COLLISION_PROCESSING : 64
};

var GROUP = {
    COL_NOTHING : 1,
    COL_CHAIR : 2,
    COL_RING : 4,
    COL_TRIGGER : 8,
    COL_BOUNCER : 16,
    COL_SOFTBODY : 32,
    COL_TDROP : 64,
    GROUP0 : 128,
    GROUP1 : 256,
    GROUP2 : 512,
    GROUP3 : 1024,
    GROUP4 : 2048,
    GROUP5 : 4096,
    GROUP6 : 8192,
    ALL : -1
};

// Collision Filtering
// http://www.bulletphysics.org/mediawiki-1.5.8/index.php/Collision_Things
var softBodiesCollideWith = GROUP.COL_CHAIR | GROUP.COL_RING | GROUP.COL_TDROP;
var chairsCollideWith = GROUP.COL_SOFTBODY | GROUP.COL_RING | GROUP.COL_BOUNCER | GROUP.COL_CHAIR;
var ringCollidesWith = GROUP.COL_SOFTBODY | GROUP.COL_CHAIR | GROUP.COL_TDROP;
var triggersCollideWith = GROUP.COL_NOTHING;
var bouncersCollideWith = GROUP.COL_CHAIR;
var constraintsCollideWith = GROUP.COL_NOTHING;
var twitDropsCollideWith = GROUP.COL_SOFTBODY | GROUP.COL_RING;

// Textures
var ringColTexture;
var donkeyTexture;
var elephantTexture;
var hashTexture;

// Meshes
var boxMesh; // Constraint geo
var puppetMesh;
var gDonkeyMesh = null; // Trigger mesh
var gElephantMesh = null;
var gRingBlockMesh; // bounce for skirt edge
var ringColSurface;
var chairPos = new THREE.Vector3();
var chairQuat = new THREE.Quaternion();
var twitPos = new THREE.Vector3();
var twitQuat = new THREE.Quaternion();
var chairClosedGeo;
var chairOpenGeo;
var rncGeo; // BufferGeometry for Soft Bodies
var dncGeo; // BufferGeometry for Soft Bodies
var volumeMass = 1; // The mass of our Soft Bodies
var chairGroup = [];
var twitDropGroup = [];
var twitsCollided = [];
var thrownChairGroup = [];
var mostRecentlyThrownChair;
var maxNumChairsInStack = 50;
var DUMP_MULT = 50; // multiplier for the number of chairs to dump in dump mode
var sunLight;
var twitterBubbles = [];
var twitterDrops = [];
var hashtags;
var hashCount;
var currentHashtag;
var currentHashtagCount;
var twitterDropsDropped = false;
var currentChairCount = 0;
var numChairsToSpawn;
var dumpInterval;
var cullInterval;
var houseKeepInterval;
var chairsCulled = 0; // keep track for curiosity sake
var thrownChairsCulled = 0;
var fadeOutBubbles = false;
var fadeInBubbles = false;
var stopBubbles = false;
var currentDumpIndex = 0;
var dumpIntervalTime = 10000; // time in milliseconds;
var houseKeepingIntervalTime = 10000;
var dumpSessionArray = []; // an array of maxNumChairsInStack totaling currentHashtagCount
var raycastGroup = [];
var rncSoftBody;
var dncSoftBody;
var donkey = new THREE.Object3D();
var elephant = new THREE.Object3D();

// Interaction
var dumpIt = false;
var currentParty = null;


// Water stuff
//var waterPlane;
var parameters = {
    width: 2000,
    height: 2000,
    widthSegments: 250,
    heightSegments: 250,
    depth: 1500, // default: 1500
    param: 4, // default: 4
    filterparam: 1
};

var waterNormals;


// - Main code -

init();
animate();


// - Functions -

function init() {

    initGraphics();

    initPhysics();

    initLoader();

    loadFiles();

    initInput();

}

function initGraphics() {

    container = document.getElementById('webglcontainer');

    // CAMERAS

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 2000);
    camera.position.set(-180, 0, 0); // initial distance from ring
    cameraCube = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 2000);

    controls = new THREE.OrbitControls(camera);
    controls.minDistance = 50;
    controls.maxDistance = 600;  // How far we can back up.
    controls.minPolarAngle = 0; // allow overhead
    controls.maxPolarAngle = 90 * Math.PI / 180; // no lower than the horizon
    controls.minAzimuthAngle = -Math.PI; // radians
    controls.maxAzimuthAngle = Math.PI / 180; // radians
    controls.enablePan = false; // this causes the camera to become offset

    // AUDIO -- I know, not graphic...but needs to be done early
    audioListener = new THREE.AudioListener();
    masterVolume = audioListener.getMasterVolume();
    audioListener.setMasterVolume(0);
    camera.add(audioListener);
    elephantSound = new THREE.Audio(audioListener);
    donkeySound = new THREE.Audio(audioListener);
    hillarySound = new THREE.Audio(audioListener);
    ambientSound = new THREE.Audio(audioListener);
    gruntF1Sound = new THREE.Audio(audioListener);
    gruntF2Sound = new THREE.Audio(audioListener);
    gruntM1Sound = new THREE.Audio(audioListener);
    gruntM2Sound = new THREE.Audio(audioListener);
    gruntM3Sound = new THREE.Audio(audioListener);
    chairsSound = new THREE.Audio(audioListener);
    chairstooSound = new THREE.Audio(audioListener);
    fukthisSound = new THREE.Audio(audioListener);
    generalthrow1Sound = new THREE.Audio(audioListener);
    generalthrow2Sound = new THREE.Audio(audioListener);
    objectsalloverSound = new THREE.Audio(audioListener);
    rainingchairsSound = new THREE.Audio(audioListener);
    stillcomingSound = new THREE.Audio(audioListener);
    chairthrowSound = new THREE.Audio(audioListener);


    // SCENE

    scene = new THREE.Scene();
    sceneCube = new THREE.Scene();

    renderer = new THREE.WebGLRenderer({alpha: true, antialias: true});
    renderer.autoClear = false;
    //renderer.sortObjects = true;
    renderer.setPixelRatio(window.devicePixelRatio);
    // THE height adjustment below corresponds to the .rumble-section padding-top in scrolling-nav.css
    // I tried to grab this dynamically, but there's too much delay in getting it before the canvas is sized!
    //var tag = document.getElementById('rumble');
    //var heightAdj = window.getComputedStyle(tag, null).getPropertyValue('padding-top');
    //console.log("heightAdj: " + heightAdj);
    renderer.setSize(window.innerWidth, window.innerHeight - 50);
    renderer.setFaceCulling(THREE.CullFaceNone);
    renderer.shadowMap.enabled = true;
    //renderer.shadowMapBias = 0.0039;
    renderer.shadowMapSoft = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Add audio to scene
    scene.add(elephantSound);
    scene.add(donkeySound);
    scene.add(hillarySound);
    scene.add(gruntF1Sound);
    scene.add(gruntF2Sound);
    scene.add(gruntM1Sound);
    scene.add(gruntM2Sound);
    scene.add(gruntM3Sound);
    scene.add(chairsSound);
    scene.add(chairstooSound);
    scene.add(fukthisSound);
    scene.add(generalthrow1Sound);
    scene.add(generalthrow2Sound);
    scene.add(objectsalloverSound);
    scene.add(rainingchairsSound);
    scene.add(stillcomingSound);
    scene.add(chairthrowSound);
    //scene.add(ambientSound);
    ambientSound.setVolume(0);
    ambientSound.setLoop(true);
    scene.add(ambientSound);


    // VIZ TOOLS
    axisHelper = new THREE.AxisHelper(20);
    scene.add(axisHelper);

    gridHelper = new THREE.GridHelper(120, 10, 0x0000ff, 0x000000);
    scene.add(gridHelper);

    setupLighting();

    createEnvironment();

    // Textures

    ///////////////////////////////

    container.innerHTML = "";

    container.appendChild(renderer.domElement);

    // Add a DAT GUI
    /*    var params = {
     Equirectangular: function () {
     cubeMesh.material = equirectMaterial;
     cubeMesh.visible = true;
     sphereMaterial.envMap = textureEquirec;
     sphereMaterial.needsUpdate = true;
     }
     };

     var gui = new dat.GUI();
     gui.add( params, 'Equirectangular' );
     gui.open();*/

    // Add a stats gizmo
/*    stats = new Stats();
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.top = '0px';
    container.appendChild(stats.domElement);*/

    //

    window.addEventListener('resize', onWindowResize, false);

}

function initInput() {


    var onKeyDown = function (event) {
        switch (event.keyCode) {
            case 49: // "1" key
                toggleMode();
                console.log("Setting throw mode: " + throwMode);
                break;
        }
    };

    var onDocumentMouseMove = function (event) {
        event.preventDefault();
        mouseCoords.x = ( event.clientX / window.innerWidth ) * 2 - 1;
        mouseCoords.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

    };

    // changed from window to container so menus wouldn't trigger clicks in environment
    container.addEventListener('mousedown', function (event) {

        if (!clickRequest) {

            mouseCoords.set(
                ( event.clientX / window.innerWidth ) * 2 - 1,
                -( event.clientY / window.innerHeight ) * 2 + 1
            );

            clickRequest = true;

        }

    }, false);

    document.addEventListener('keydown', onKeyDown, false);
    document.addEventListener('mousemove', onDocumentMouseMove, false);

}

function setupLighting() {

    // LIGHTS
    sunLight = new THREE.DirectionalLight(0xffffff);
    sunLight.position.set(-100, 80, 20);
    sunLight.castShadow = true;
    sunLight.shadow.camera.near = 50;
    sunLight.shadow.camera.far = 300;
    sunLight.shadow.camera.left = -100;
    sunLight.shadow.camera.right = 100;
    sunLight.shadow.camera.top = 100;
    sunLight.shadow.camera.bottom = -100;
    sunLight.shadow.bias = 0.0001;
    sunLight.shadow.mapSize.width = 2048; // default is 512
    sunLight.shadow.mapSize.height = 2048; // default is 512
    sunLight.intensity = 0.8;
    scene.add(sunLight);
    dirHelper = new THREE.DirectionalLightHelper(sunLight, 2);
    scene.add(dirHelper);
    camHelper = new THREE.CameraHelper(sunLight.shadow.camera);
    scene.add(camHelper);

    // VIZ TOOLS CONTROLS
    // change these to true if you want to see the helpers by default.
    camHelper.visible = false;
    axisHelper.visible = false;
    gridHelper.visible = false;
    dirHelper.visible = false;

    var ambient = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambient);
}

function createEnvironment() {

    // Cube mapped SKYBOX

    var path = "img/skybox/WaldenPanorama.";
    var format = '.jpg';
    // posx, negx, posy, negy, posz, negz
    var urls = [
        path + 'back' + format, path + 'front' + format,
        path + 'top' + format, path + 'bottom' + format,
        path + 'right' + format, path + 'left' + format
    ];

    textureCube = new THREE.CubeTextureLoader().load(urls);
    textureCube.format = THREE.RGBFormat;
    //textureCube.mapping = THREE.CubeRefractionMapping;
    //textureCube.mapping = THREE.CubeRelectionMapping;


    var shader = THREE.ShaderLib["cube"];
    shader.uniforms["tCube"].value = textureCube;

    var material = new THREE.ShaderMaterial({

        fragmentShader: shader.fragmentShader,
        vertexShader: shader.vertexShader,
        uniforms: shader.uniforms,
        depthWrite: false,
        side: THREE.BackSide

    });

    cubeMesh = new THREE.Mesh(new THREE.BoxGeometry(100, 100, 100), material);
    sceneCube.add(cubeMesh);

}

function initPhysics() {

    // Physics configuration

    collisionConfiguration = new Ammo.btSoftBodyRigidBodyCollisionConfiguration();
    dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration);
    broadphase = new Ammo.btDbvtBroadphase();
    solver = new Ammo.btSequentialImpulseConstraintSolver();
    softBodySolver = new Ammo.btDefaultSoftBodySolver();
    physicsWorld = new Ammo.btSoftRigidDynamicsWorld(dispatcher, broadphase, solver, collisionConfiguration, softBodySolver);
    physicsWorld.setGravity(new Ammo.btVector3(0, gravityConstant, 0));
    physicsWorld.getWorldInfo().set_m_gravity(new Ammo.btVector3(0, gravityConstant, 0));

}

function initLoader() {
    console.log("init loader");
    loadingManager = new THREE.LoadingManager();
    loadingManager.onProgress = function (item, loaded, total) {
        console.log(item, loaded, total);
    }

    loadingManager.onLoad = function () {
        console.log("all files loaded");
        allLoaded();
    }

    loadingManager.onError = function () {
        console.log("there's been an error");
    }
}

function loadFiles() {
    // instantiate a loader
    var jsonLoader = new THREE.JSONLoader(loadingManager);
    var textureLoader = new THREE.TextureLoader(loadingManager);
    var audioLoader = new THREE.AudioLoader(loadingManager);

    // Normals for our water
    waterNormals = textureLoader.load("img/waternormals.jpg");
    waterNormals.wrapS = waterNormals.wrapT = THREE.RepeatWrapping;

    // Surface of our wrestling ring
    ringColTexture = textureLoader.load("img/grid.png");
    ringColTexture.wrapS = THREE.RepeatWrapping;
    ringColTexture.wrapT = THREE.RepeatWrapping;
    ringColTexture.repeat.set(40, 40);

    // Textures for our Donkey and Elephant
    donkeyTexture = textureLoader.load("img/DNC.png");
    elephantTexture = textureLoader.load("img/RNC.png");

    // Texture for twitterDrop
    hashTexture = textureLoader.load("img/hash.png");

    // Load our rigid geometries.
    // Load the ring
    jsonLoader.load(
        // resource URL
        'geo/ring.js',
        // Function when resource is loaded
        function (geometry, materials) {
            //var material = new THREE.MultiMaterial( materials );
            var material = new THREE.MeshPhongMaterial();
            var ringGeo = new THREE.Mesh(geometry, material);

            textureLoader.load("img/ring.png", function (texture) {
                ringGeo.material.map = texture;
                ringGeo.material.needsUpdate = true;
            });

            textureLoader.load("img/ring-alpha.png", function (textureAlpha) {
                ringGeo.material.alphaMap = textureAlpha;
                ringGeo.material.transparent = true;
            })

            ringGeo.translateX(100);
            ringGeo.translateY(-25);
            ringGeo.castShadow = true;
            ringGeo.receiveShadow = true;
            ringGeo.scale.set(5, 5, 5);
            ringGeo.name = "wrestling_ring";

            scene.add(ringGeo);

        }
    );

    // Load open chair
    jsonLoader.load(
        // resource URL
        'geo/chairOpen.js',
        // Function when resource is loaded
        function (geometry, materials) {
            var material = new THREE.MultiMaterial(materials);
            chairOpenGeo = new THREE.Mesh(geometry, material);
            //chairOpenGeo.scale.set( .5,.5,.5 );
            //chairOpenGeo.translateX(100);
            //chairOpenGeo.translateY(-25);
            chairOpenGeo.castShadow = true;
            chairOpenGeo.receiveShadow = true;
            chairOpenGeo.visible = false;
            chairOpenGeo.name = "chair_open";

            /*            var bboxHelper = new THREE.BoundingBoxHelper(chairOpenGeo, 0xff0000);
             scene.add(bboxHelper);

             var bbox2Helper = new THREE.BoxHelper(chairOpenGeo, 0xff0000);
             scene.add(bbox2Helper);*/

            /*            var mass = 0;

             chairOpenPos.set(0, 0, 0);
             chairOpenQuat.set( 0, 0, 0, 1 );

             chairOpenRigid = makeRigid( chairOpenGeo, mass, chairOpenPos, chairOpenQuat );*/

            scene.add(chairOpenGeo);

        }
    );


    // Load closed chair
    jsonLoader.load(
        // resource URL
        'geo/chairClosed.js',
        // Function when resource is loaded
        function (geometry, materials) {
            var material = new THREE.MultiMaterial(materials);
            chairClosedGeo = new THREE.Mesh(geometry, material);
            //chairClosedGeo.scale.set( .5,.5,.5 );
            //chairClosedGeo.translateX(100);
            //chairClosedGeo.translateY(-25);
            chairClosedGeo.castShadow = true;
            chairClosedGeo.receiveShadow = true;
            chairClosedGeo.visible = false;
            chairClosedGeo.name = "chair_closed";

            /*            var bboxHelper = new THREE.BoundingBoxHelper(chairClosedGeo, 0x0000ff);
             scene.add(bboxHelper);*/

            /*            var mass = 0;

             chairClosedPos.set(0, 0, 0);
             chairClosedQuat.set( 0, 0, 0, 1 );

             chairClosedRigid = makeRigid( chairClosedGeo, mass, chairClosedPos, chairClosedQuat );*/

            scene.add(chairClosedGeo);

        }
    );


    // Load our geometries that will be soft bodies.
    jsonLoader.load(
        // resource URL
        'geo/RNC.js',
        // Function when resource is loaded
        function (geometry, materials) {
            var material = new THREE.MultiMaterial(materials);
            rncGeo = new THREE.BufferGeometry().fromGeometry(geometry);
            rncGeo.castShadow = true;
            rncGeo.receiveShadow = true;
            rncGeo.rotateY(-3.14159 / 2);
            rncGeo.translate(120, -24.5, 20);
            rncGeo.name = "RNC_Geo";
        }
    );

    jsonLoader.load(
        // resource URL
        'geo/DNC.js',
        // Function when resource is loaded
        function (geometry, materials) {
            var material = new THREE.MultiMaterial(materials);
            dncGeo = new THREE.BufferGeometry().fromGeometry(geometry);
            dncGeo.castShadow = true;
            dncGeo.receiveShadow = true;
            dncGeo.rotateY(3.14159 / 1.7);
            dncGeo.translate(75, -24.5, -20);
            dncGeo.name = "DNC_Geo";
        }
    );

    audioLoader.load('audio/elephant.mp3',
        function ( audioBuffer ) {
            elephantSound.setBuffer(audioBuffer);
        }
    );

    audioLoader.load('audio/donkey.mp3',
        function ( audioBuffer ) {
            donkeySound.setBuffer(audioBuffer);
        }
    );

    audioLoader.load('audio/cutitout.mp3',
        function ( audioBuffer ) {
            hillarySound.setBuffer(audioBuffer);
        }
    );

    audioLoader.load('audio/walden.mp3',
        function ( audioBuffer ) {
            ambientSound.setBuffer(audioBuffer);
        }
    );

    audioLoader.load('audio/grunt_f1.mp3',
        function ( audioBuffer ) {
            gruntF1Sound.setBuffer(audioBuffer);
        }
    );

    audioLoader.load('audio/grunt_f2.mp3',
        function ( audioBuffer ) {
            gruntF2Sound.setBuffer(audioBuffer);
        }
    );

    audioLoader.load('audio/grunt_m1.mp3',
        function ( audioBuffer ) {
            gruntM1Sound.setBuffer(audioBuffer);
        }
    );

    audioLoader.load('audio/grunt_m2.mp3',
        function ( audioBuffer ) {
            gruntM2Sound.setBuffer(audioBuffer);
        }
    );

    audioLoader.load('audio/grunt_m3.mp3',
        function ( audioBuffer ) {
            gruntM3Sound.setBuffer(audioBuffer);
        }
    );
    gruntSounds.push(gruntF1Sound);
    gruntSounds.push(gruntF2Sound);
    gruntSounds.push(gruntM1Sound);
    gruntSounds.push(gruntM2Sound);
    gruntSounds.push(gruntM3Sound);

    audioLoader.load('audio/chairs.mp3',
        function ( audioBuffer ) {
            chairsSound.setBuffer(audioBuffer);
        }
    );
    audioLoader.load('audio/chairstoo.mp3',
        function ( audioBuffer ) {
            chairstooSound.setBuffer(audioBuffer);
        }
    );
    audioLoader.load('audio/chairthrowLoop.mp3',
        function ( audioBuffer ) {
            chairthrowSound.setBuffer(audioBuffer);
        }
    );
    audioLoader.load('audio/fukthis.mp3',
        function ( audioBuffer ) {
            fukthisSound.setBuffer(audioBuffer);
        }
    );
    audioLoader.load('audio/generalthrow1.mp3',
        function ( audioBuffer ) {
            generalthrow1Sound.setBuffer(audioBuffer);
        }
    );
    audioLoader.load('audio/generalthrow2.mp3',
        function ( audioBuffer ) {
            generalthrow2Sound.setBuffer(audioBuffer);
        }
    );
    audioLoader.load('audio/objectsallover.mp3',
        function ( audioBuffer ) {
            objectsalloverSound.setBuffer(audioBuffer);
        }
    );
    audioLoader.load('audio/rainingchairs.mp3',
        function ( audioBuffer ) {
            rainingchairsSound.setBuffer(audioBuffer);
        }
    );
    audioLoader.load('audio/stillcoming.mp3',
        function ( audioBuffer ) {
            stillcomingSound.setBuffer(audioBuffer);
        }
    );

    dumpSounds.push(chairsSound);
    dumpSounds.push(chairstooSound);
    dumpSounds.push(fukthisSound);
    dumpSounds.push(generalthrow1Sound);
    dumpSounds.push(generalthrow2Sound);
    dumpSounds.push(objectsalloverSound);
    dumpSounds.push(rainingchairsSound);
    dumpSounds.push(stillcomingSound);

};

function allLoaded() {
    createObjects();
    readyToRender = true;
    console.log("readyToRender=" + readyToRender);
    fadeLoader();
}

function fadeLoader() {
    $('.onepix-imgloader').fadeOut("slow");
    // fade in content (using opacity instead of fadein() so it retains it's height.
    $('.loading-container > *:not(.onepix-imgloader)').fadeTo("slow", 100, function () {
        $('.nfoPanel').slideToggle("slow", "swing");
        if(bowser.mobile || bowser.tablet) {
            // Per Apple, user has to click to initiate audio :-(
        }else{
            // On desktops, auto-start the audio.
            setTimeout(function () {
                $('#soundBtn').click();
            }, 5000);
        };
    });
};

function createObjects() {

    loadHashtags();

    // WATER
    water = new THREE.Water(renderer, camera, scene, {
        textureWidth: 1024,
        textureHeight: 1024,
        waterNormals: waterNormals,
        alpha: 0.5,
        sunDirection: sunLight.position.clone().normalize(),
        sunColor: 0xffffff,
        waterColor: 0x2C77A4, // picked from Walden image
        distortionScale: 50.0,
        //fog: true, // doesn't seem to work
    });

    var mirrorMesh = new THREE.Mesh(
        new THREE.PlaneBufferGeometry(parameters.width * 500, parameters.height * 500),
        water.material
    );

    water.position.set(0, -35, 0);
    mirrorMesh.position.set(0, -36, 0);
    water.receiveShadow = true; // doesn't seem to work
    mirrorMesh.receiveShadow = true; // doesn't seem to work

    mirrorMesh.add(water);
    mirrorMesh.rotation.x = -Math.PI * 0.5;
    scene.add(mirrorMesh);

    // Ring Collision Surface -- CHANGE TEXTURE
    pos.set(100, -25, 0);
    quat.set(0, 0, 0, 1);
    var objName = "ring_surface";
    ringColSurface = createRigidBox(objName, 75, 1, 75, 0, pos, quat, new THREE.MeshPhongMaterial({color: 0xFFFFFF}), null, GROUP.COL_RING, ringCollidesWith);
    /*ringColTexture.wrapS = THREE.RepeatWrapping;
     ringColTexture.wrapT = THREE.RepeatWrapping;
     ringColTexture.repeat.set(40, 40);*/

    ringColSurface.userData.physicsBody.setRestitution(0.7);
    ringColSurface.material.map = ringColTexture;
    ringColSurface.material.needsUpdate = true;

    // Invisible control/constraint geometry

    boxpos.set(0, -100, 0);
    boxquat.set(0, 0, 0, 1);
    var objName = "constraint_lower";
    boxMesh = createRigidBox(objName, 1, 1, 1, 0, boxpos, boxquat, new THREE.MeshPhongMaterial({color: 0xFF0000}), null, GROUP.COL_NOTHING, constraintsCollideWith);
    boxMesh.visible = false;
    scene.add(boxMesh);

    puppetBox.set(0, 300, 0);
    puppetBoxquat.set(0, 0, 0, 1);
    var objName = "constraint_upper";
    puppetMesh = createRigidBox(objName, 1, 1, 1, 0, puppetBox, puppetBoxquat, new THREE.MeshPhongMaterial({color: 0xFF0000}), null, GROUP.COL_NOTHING, constraintsCollideWith);
    puppetMesh.visible = false;
    scene.add(puppetMesh);

    // Invisible triggers

   var invisibleMaterial = new THREE.MeshLambertMaterial( { color: 0x999999, transparent: true, opacity: 0.0, depthWrite: false, side: THREE.DoubleSide} );

    gRingBlockpos.set(100, -30, 0);
    gRingBlockquat.set(0, 0, 0, 1);
    var objName = "ghost_ringskirt";
    gRingBlockMesh = createRigidBox(objName, 85, 10, 85, 0, gRingBlockpos, gRingBlockquat, invisibleMaterial, null, GROUP.COL_BOUNCER, bouncersCollideWith);
    gRingBlockMesh.rotateY(-3.14159 / 2);
    gRingBlockMesh.visible = true;
    gRingBlockMesh.castShadow = false;
    gRingBlockMesh.receiveShadow = false;
    scene.add(gRingBlockMesh);

    console.log("finished creating objects");
}

function processGeometry(bufGeometry) {

    // Obtain a Geometry
    var geometry = new THREE.Geometry().fromBufferGeometry(bufGeometry);

    // Merge the vertices so the triangle soup is converted to indexed triangles
    var vertsDiff = geometry.mergeVertices();

    // Convert again to BufferGeometry, indexed
    var indexedBufferGeom = createIndexedBufferGeometryFromGeometry(geometry);

    // Create index arrays mapping the indexed vertices to bufGeometry vertices
    mapIndices(bufGeometry, indexedBufferGeom);

}

function createIndexedBufferGeometryFromGeometry(geometry) {

    var numVertices = geometry.vertices.length;
    var numFaces = geometry.faces.length;

    var bufferGeom = new THREE.BufferGeometry();
    var vertices = new Float32Array(numVertices * 3);
    var indices = new ( numFaces * 3 > 65535 ? Uint32Array : Uint16Array )(numFaces * 3);

    for (var i = 0; i < numVertices; i++) {

        var p = geometry.vertices[i];

        var i3 = i * 3;

        vertices[i3] = p.x;
        vertices[i3 + 1] = p.y;
        vertices[i3 + 2] = p.z;

    }

    for (var i = 0; i < numFaces; i++) {

        var f = geometry.faces[i];

        var i3 = i * 3;

        indices[i3] = f.a;
        indices[i3 + 1] = f.b;
        indices[i3 + 2] = f.c;

    }

    bufferGeom.setIndex(new THREE.BufferAttribute(indices, 1));
    bufferGeom.addAttribute('position', new THREE.BufferAttribute(vertices, 3));

    return bufferGeom;
}

function isEqual(x1, y1, z1, x2, y2, z2) {
    var delta = 0.000001;
    return Math.abs(x2 - x1) < delta &&
        Math.abs(y2 - y1) < delta &&
        Math.abs(z2 - z1) < delta;
}

function mapIndices(bufGeometry, indexedBufferGeom) {

    // Creates ammoVertices, ammoIndices and ammoIndexAssociation in bufGeometry

    var vertices = bufGeometry.attributes.position.array;
    var idxVertices = indexedBufferGeom.attributes.position.array;
    var indices = indexedBufferGeom.index.array;

    var numIdxVertices = idxVertices.length / 3;
    var numVertices = vertices.length / 3;

    bufGeometry.ammoVertices = idxVertices;
    bufGeometry.ammoIndices = indices;
    bufGeometry.ammoIndexAssociation = [];

    for (var i = 0; i < numIdxVertices; i++) {

        var association = [];
        bufGeometry.ammoIndexAssociation.push(association);

        var i3 = i * 3;

        for (var j = 0; j < numVertices; j++) {
            var j3 = j * 3;
            if (isEqual(idxVertices[i3], idxVertices[i3 + 1], idxVertices[i3 + 2],
                    vertices[j3], vertices[j3 + 1], vertices[j3 + 2])) {
                association.push(j3);
            }
        }

    }

}

function createParty(party){
    var invisibleMaterial = new THREE.MeshLambertMaterial( { color: 0x999999, transparent: true, opacity: 0.0, depthWrite: false, side: THREE.DoubleSide} );

    if(party === "DNC"){
        donkey = new THREE.Object3D();
        dncSoftBody = createSoftVolume(dncGeo, volumeMass, 20, "DNC");
        softBodiesToRender.push(dncSoftBody);
        gDonkeypos.set(75, -13, -21);
        gDonkeyquat.set(0, 0, 0, 1);
        var objName = "donkey_trigger";
        gDonkeyMesh = createRigidBox(objName, 25, 20, 16, 0, gDonkeypos, gDonkeyquat, invisibleMaterial, FLAGS.NO_CONTACT_RESPONSE, GROUP.COL_TRIGGER, triggersCollideWith);
        gDonkeyMesh.rotateY(3.14159 / 1.7);
        gDonkeyMesh.visible = true;
        gDonkeyMesh.castShadow = false;
        gDonkeyMesh.receiveShadow = false;
        donkey.add(dncSoftBody);
        donkey.add(gDonkeyMesh);
        donkey.name = "DONKEY";
        scene.add(donkey);
    } else if (party === "RNC"){
        elephant = new THREE.Object3D();
        rncSoftBody = createSoftVolume(rncGeo, volumeMass, 20, "RNC");
        softBodiesToRender.push(rncSoftBody);
        gElephantpos.set(120.5, -12, 18.3);
        gElephantquat.set(0, 0, 0, 1);
        var objName = "elephant_trigger";
        gElephantMesh = createRigidBox(objName, 25, 25, 14, 0, gElephantpos, gElephantquat, invisibleMaterial, FLAGS.NO_CONTACT_RESPONSE, GROUP.COL_TRIGGER, triggersCollideWith);
        gElephantMesh.rotateY(-3.14159 / 2);
        gElephantMesh.visible = true;
        gElephantMesh.castShadow = false;
        gElephantMesh.receiveShadow = false;
        elephant.add(rncSoftBody);
        elephant.add(gElephantMesh);
        elephant.name = "ELEPHANT";
        scene.add(elephant);
    } else if (party === "BOTH"){
        //DNC
        donkey = new THREE.Object3D();
        dncSoftBody = createSoftVolume(dncGeo, volumeMass, 20, "DNC");
        softBodiesToRender.push(dncSoftBody);
        gDonkeypos.set(75, -13, -21);
        gDonkeyquat.set(0, 0, 0, 1);
        var objName = "donkey_trigger";
        gDonkeyMesh = createRigidBox(objName, 25, 20, 16, 0, gDonkeypos, gDonkeyquat, invisibleMaterial, FLAGS.NO_CONTACT_RESPONSE, GROUP.COL_TRIGGER, triggersCollideWith);
        gDonkeyMesh.rotateY(3.14159 / 1.7);
        gDonkeyMesh.visible = true;
        gDonkeyMesh.castShadow = false;
        gDonkeyMesh.receiveShadow = false;
        donkey.add(dncSoftBody);
        donkey.add(gDonkeyMesh);
        donkey.name = "DONKEY";
        scene.add(donkey);
        //RNC
        elephant = new THREE.Object3D();
        rncSoftBody = createSoftVolume(rncGeo, volumeMass, 20, "RNC");
        softBodiesToRender.push(rncSoftBody);
        gElephantpos.set(120.5, -12, 18.3);
        gElephantquat.set(0, 0, 0, 1);
        var objName = "elephant_trigger";
        gElephantMesh = createRigidBox(objName, 25, 25, 14, 0, gElephantpos, gElephantquat, invisibleMaterial, FLAGS.NO_CONTACT_RESPONSE, GROUP.COL_TRIGGER, triggersCollideWith);
        gElephantMesh.rotateY(-3.14159 / 2);
        gElephantMesh.visible = true;
        gElephantMesh.castShadow = false;
        gElephantMesh.receiveShadow = false;
        elephant.add(rncSoftBody);
        elephant.add(gElephantMesh);
        elephant.name = "ELEPHANT";
        scene.add(elephant);
    }

}

function removeParty(party) {

    if (party === "RNC"){
        //console.log("REMOVE: elephant.");
        physicsWorld.removeCollisionObject(gElephantMesh);
        physicsWorld.removeCollisionObject(rncSoftBody);
        physicsWorld.removeRigidBody(gElephantMesh);
        physicsWorld.removeSoftBody(rncSoftBody.userData.physicsBody);
        scene.remove(elephant);
        elephant = null;
        gElephantMesh = null;
        rncSoftBody = null;
        softBodiesToRender = [];
        delete(elephant);
    } else if (party === "DNC"){
        //console.log("REMOVE: donkey.");
        physicsWorld.removeCollisionObject(gDonkeyMesh);
        physicsWorld.removeCollisionObject(dncSoftBody);
        physicsWorld.removeRigidBody(gDonkeyMesh);
        physicsWorld.removeSoftBody(dncSoftBody.userData.physicsBody);
        scene.remove(donkey);
        donkey = null;
        gDonkeyMesh = null;
        dncSoftBody = null;
        softBodiesToRender = [];
        delete(donkey);
    }

};

function chooseParty(party){
    currentParty = party;
    // If we're currently in DUMP mode, change it back!
    if(!throwMode){
        toggleMode();
    };

    if (party == "RNC"){
        if(scene.getObjectByName('DONKEY') != undefined) {
            //console.log("Must have been a DONKEY in the scene.");
            removeParty("DNC");
        };
        if(scene.getObjectByName('ELEPHANT') == undefined){
            //console.log("No elephant, so let's add one.");
            createParty("RNC");
            //console.dir(elephant);
        };
        if(scene.getObjectByName('ELEPHANT') != undefined){
            softBodiesToRender = [];
            softBodiesToRender.push(rncSoftBody);
        };
    } else if (party == "DNC"){
        if(scene.getObjectByName('ELEPHANT') != undefined) {
            //console.log("Must have been a ELEPHANT in the scene.");
            removeParty("RNC");
        };
        if(scene.getObjectByName('DONKEY') == undefined){
            //console.log("No donkey, so let's add one.");
            createParty("DNC");
        };
        if(scene.getObjectByName('DONKEY') != undefined){
            softBodiesToRender = [];
            softBodiesToRender.push(dncSoftBody);
        };
    } else if (party == "BOTH"){
        if(scene.getObjectByName('ELEPHANT') == undefined && scene.getObjectByName('DONKEY') == undefined){
            createParty("BOTH");
        }else if (scene.getObjectByName('ELEPHANT') == undefined && scene.getObjectByName('DONKEY') != undefined){
            createParty("RNC");
        }else if (scene.getObjectByName('ELEPHANT') != undefined && scene.getObjectByName('DONKEY') == undefined){
            createParty("DNC");
        };
    };
    //console.log("softBodies to render: " + softBodiesToRender.length);
};

function createSoftVolume(bufferGeom, mass, pressure, party) {

    processGeometry(bufferGeom);

    var volume = new THREE.Mesh(bufferGeom, new THREE.MeshPhongMaterial({
        color: 0xFFFFFF,
        specular: 111111,
        shininess: 60,
        shading: THREE.SmoothShading
    }));
    volume.castShadow = true;
    volume.receiveShadow = true;
    volume.frustumCulled = false;

    if (party == "DNC") {
        volume.material.map = donkeyTexture;
        volume.material.needsUpdate = true;
        volume.name = "donkey_soft";
    } else if (party == "RNC") {
        volume.material.map = elephantTexture;
        volume.material.needsUpdate = true;
        volume.name = "elephant_soft";
        elephant.add(volume);
        elephant.name = "ELEPHANT";
    }

    // Volume physic object

    var volumeSoftBody = softBodyHelpers.CreateFromTriMesh(
        physicsWorld.getWorldInfo(),
        bufferGeom.ammoVertices,
        bufferGeom.ammoIndices,
        bufferGeom.ammoIndices.length / 3,
        true);

    var sbConfig = volumeSoftBody.get_m_cfg();
    sbConfig.set_viterations(40);
    sbConfig.set_piterations(40);

    // Soft-soft and soft-rigid collisions
    sbConfig.set_collisions(0x11);

    // Friction
    sbConfig.set_kDF(0.1);
    // Damping
    sbConfig.set_kDP(0.01);
    // Pressure
    sbConfig.set_kPR(pressure);
    // Stiffness
    volumeSoftBody.get_m_materials().at(0).set_m_kLST(0.9);
    volumeSoftBody.get_m_materials().at(0).set_m_kAST(0.9);

    volumeSoftBody.setTotalMass(mass, false)
    Ammo.castObject(volumeSoftBody, Ammo.btCollisionObject).getCollisionShape().setMargin(margin);

    physicsWorld.addSoftBody(volumeSoftBody, GROUP.COL_SOFTBODY, softBodiesCollideWith);
    volume.userData.physicsBody = volumeSoftBody;
    // Disable deactivation
    volumeSoftBody.setActivationState(4);

    if (party == "DNC") {

        // Glue to the ground
        var influence = 1.0;
        volumeSoftBody.appendAnchor(1695, boxMesh.userData.physicsBody, false, influence);
        volumeSoftBody.appendAnchor(1694, boxMesh.userData.physicsBody, false, influence);
        volumeSoftBody.appendAnchor(978, boxMesh.userData.physicsBody, false, influence);
        volumeSoftBody.appendAnchor(977, boxMesh.userData.physicsBody, false, influence);

        // Puppet Master
        var puppetInfluence = 0.1;
        volumeSoftBody.appendAnchor(403, puppetMesh.userData.physicsBody, false, puppetInfluence);
        volumeSoftBody.appendAnchor(404, puppetMesh.userData.physicsBody, false, puppetInfluence);
        volumeSoftBody.appendAnchor(514, puppetMesh.userData.physicsBody, false, puppetInfluence);
        volumeSoftBody.appendAnchor(521, puppetMesh.userData.physicsBody, false, puppetInfluence);
        volumeSoftBody.appendAnchor(187, puppetMesh.userData.physicsBody, false, puppetInfluence);
        volumeSoftBody.appendAnchor(196, puppetMesh.userData.physicsBody, false, puppetInfluence);
        volumeSoftBody.appendAnchor(147, puppetMesh.userData.physicsBody, false, puppetInfluence);
        volumeSoftBody.appendAnchor(162, puppetMesh.userData.physicsBody, false, puppetInfluence);
        //volumeSoftBody.appendAnchor( 1233, puppetMesh.userData.physicsBody, false, puppetInfluence );

    } else if (party == "RNC") {

        // Glue to the ground
        var influence = 1.0;

        // Left leg
        volumeSoftBody.appendAnchor(0, boxMesh.userData.physicsBody, false, influence);
        volumeSoftBody.appendAnchor(1097, boxMesh.userData.physicsBody, false, influence);
        volumeSoftBody.appendAnchor(1103, boxMesh.userData.physicsBody, false, influence);
        volumeSoftBody.appendAnchor(6, boxMesh.userData.physicsBody, false, influence);

        // Right leg
        volumeSoftBody.appendAnchor(13, boxMesh.userData.physicsBody, false, influence);
        volumeSoftBody.appendAnchor(7, boxMesh.userData.physicsBody, false, influence);
        volumeSoftBody.appendAnchor(1075, boxMesh.userData.physicsBody, false, influence);
        volumeSoftBody.appendAnchor(1081, boxMesh.userData.physicsBody, false, influence);

        // Trunk
        volumeSoftBody.appendAnchor(1732, boxMesh.userData.physicsBody, false, influence);
        volumeSoftBody.appendAnchor(1741, boxMesh.userData.physicsBody, false, influence);

        // Puppet Master
        var puppetInfluence = 0.1;
        volumeSoftBody.appendAnchor(658, puppetMesh.userData.physicsBody, false, puppetInfluence);
        volumeSoftBody.appendAnchor(649, puppetMesh.userData.physicsBody, false, puppetInfluence);
        volumeSoftBody.appendAnchor(653, puppetMesh.userData.physicsBody, false, puppetInfluence);
        volumeSoftBody.appendAnchor(453, puppetMesh.userData.physicsBody, false, puppetInfluence);
        volumeSoftBody.appendAnchor(458, puppetMesh.userData.physicsBody, false, puppetInfluence);
        volumeSoftBody.appendAnchor(449, puppetMesh.userData.physicsBody, false, puppetInfluence);

        // A couple of trunk helpers
        volumeSoftBody.appendAnchor(1908, puppetMesh.userData.physicsBody, false, puppetInfluence);
        volumeSoftBody.appendAnchor(1924, puppetMesh.userData.physicsBody, false, puppetInfluence);

    }

    return volume;
}

function createRigidBox(objectName, sx, sy, sz, mass, pos, quat, material, colFlag, colGroup, colMask) {

    var threeObject = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz, 1, 1, 1), material);
    threeObject.name = objectName;
    var shape = new Ammo.btBoxShape(new Ammo.btVector3(sx * 0.5, sy * 0.5, sz * 0.5));
    shape.setMargin(margin);

    createRigidBody(threeObject, shape, mass, pos, quat, colFlag, colGroup, colMask);

    return threeObject;

}

function makeRigid(threeObject, mass, pos, quat, colFlag, colGroup, colMask) {

    threeObject.geometry.computeBoundingBox();

    var bbox = new THREE.Box3().setFromObject(threeObject);
    var bboxSize = new THREE.Vector3;
    bbox.size(bboxSize);
    var sx = bboxSize.x;
    var sy = bboxSize.y;
    var sz = bboxSize.z;
    var shape = new Ammo.btBoxShape(new Ammo.btVector3(sx * 0.5, sy * 0.5, sz * 0.5));
    //var shape = new Ammo.btBoxShape(new Ammo.btVector3(4, 4, 4));
    shape.setMargin(margin);

    //console.log("shape width: " + shape.width );

    /*    var boundingBox = threeObject.geometry.boundingBox.clone();
     console.log('bounding box coordinates: ' +
     '(' + boundingBox.min.x + ', ' + boundingBox.min.y + ', ' + boundingBox.min.z + '), ' +
     '(' + boundingBox.max.x + ', ' + boundingBox.max.y + ', ' + boundingBox.max.z + ')');*/

    createRigidBody(threeObject, shape, mass, pos, quat, colFlag, colGroup, colMask);

    return threeObject;

}

function createRigidBody(threeObject, physicsShape, mass, pos, quat, colFlag, colGroup, colMask) {

    threeObject.position.copy(pos);
    threeObject.quaternion.copy(quat);

    var transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
    transform.setRotation(new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w));
    var motionState = new Ammo.btDefaultMotionState(transform);

    var localInertia = new Ammo.btVector3(0, 0, 0);
    physicsShape.calculateLocalInertia(mass, localInertia);

    var rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, physicsShape, localInertia);
    var body = new Ammo.btRigidBody(rbInfo);

    threeObject.userData.physicsBody = body;

    threeObject.castShadow = true;
    threeObject.receiveShadow = true;

    // Really, the only flag I care about is 4. It makes the triggers not respond to physics.
    if (colFlag == 4) {
        threeObject.userData.physicsBody.setCollisionFlags(colFlag);
    }

    scene.add(threeObject);

    if (mass > 0) {

        rigidBodies.push(threeObject);

        // Disable deactivation
        body.setActivationState(4);
    }
    //console.dir(threeObject);
    //console.log("name:" + threeObject.name + " colGroup: " + colGroup + " colMask: " + colMask);
    physicsWorld.addRigidBody(body, colGroup, colMask);

    return body;
}

function createTwitterAssets() {

    for (var key in hashtags) {
        var twitBubble = new THREE.TwitterBubble(key, hashtags[key], textureCube);
        //console.log( "twitBubble.tag:" + twitBubble.tag );
        //console.log( "Via getter function: " + twitBubble.getTag());
        //console.log("name: " + twitBubble.name );
        var twitDrop = new THREE.TwitterDrop(key, hashtags[key]);
        twitterBubbles.push(twitBubble);
        twitterDrops.push(twitDrop);
        raycastGroup.push(twitBubble.tSphere);
    }
}

// These activities are combined because the JSON loading is asynchronous
// We need to load the JSON file and wait before proceeding to bubble creation.
// Three.js JSONLoader only loads model files, btw.
function loadHashtags() {

    loadJSON(function (response) {

        // Parse JSON string into object
        hashtags = JSON.parse(response);

        hashCount = Object.keys(hashtags).length;

        //console.log("count: " + Object.keys(hashtags).length);
        // check contents
        /*        console.log(hashtags);
         for (var key in hashtags ) {
         console.log("key " + key + " has value " + hashtags[key]);
         }*/

        createTwitterAssets();
    });
}

function loadJSON(callback) {

    var xobj = new XMLHttpRequest();
    xobj.overrideMimeType("application/json");
    xobj.open('GET', 'json/currenthashtags.json', true);
    xobj.onreadystatechange = function () {
        if (xobj.readyState == 4 && xobj.status == "200") {
            // Required use of an anonymous callback as .open will NOT return a value but simply returns undefined in asynchronous mode
            callback(xobj.responseText);
        }
    };
    xobj.send(null);
}

function getTweets(hashtag, full) {
    var oReq = new XMLHttpRequest();
    oReq.addEventListener("load", reqListener);
    oReq.open("GET", DOMAIN + "/tweets?hashtag=" + hashtag + "&full=" + full);
    oReq.send();
}

function getHashtags() {
    var oReq = new XMLHttpRequest();
    oReq.addEventListener("load", reqHTListener);
    oReq.open("GET", DOMAIN + "/hashtags");
    oReq.send();
}

function postHashtag(hashtag) {
    var tagString = "";
    if(hashtag.charAt(0) == "#"){
        tagString = hashtag.slice(1);
    }else{
        tagString = hashtag;
    }
    var oReq = new XMLHttpRequest();
    oReq.addEventListener("load", reqRitaListener);
    oReq.open("GET", DOMAIN + "/gen?hashtag=" + tagString);
    oReq.send();
}

function reqListener(data) {
    //var parsed = JSON.parse(data.responseText);
    var parsed = data;
    //console.log( JSON.parse( parsed.responseText ));
    console.log(parsed);
    // do something with data!
}

function reqHTListener(data) {
    //var parsed = JSON.parse(data);
    var parsed = data;
    console.log("Hashtag total from server: " + parsed);
}

function reqRitaListener(data) {
    var parsed = JSON.parse(data.currentTarget.responseText);
    //console.dir(parsed);
    //console.log("Rita sentence from server: " + parsed.sentence1);

    //displayGenerativeSentence(parsed);
    displayFeedback(parsed);
}

function displayHashtag(tag){
    document.getElementById('feedback').innerHTML = "<h1>" + tag + "</h1>";
    $("#feedback h1").delay(1000).animate({"opacity": "1"}, 700);
};

// This will display in the nav bar at the top. Decided I prefer a popup panel.
function displayGenerativeSentence(jsonData){
    document.getElementById('feedback').innerHTML = "<h1>" + "<i class='fa fa-hashtag'></i>" + jsonData.tag + "</h1>";

    $("#feedback h1").animate({"opacity": "1"}, 1000).delay(4000).animate({"opacity": "0"}, 1000, function() {
        document.getElementById('feedback').innerHTML =
            "<p>" + jsonData.sentence1 + " " + jsonData.sentence2 + "</p>";

        $("#feedback p").delay(2000).animate({"opacity": "1"}, 1000).delay(20000).animate({"opacity": "0"}, 1000);
    });
}

function displayFeedback(jsonData) {
    // Only show when not currently being shown
    if (!feedbackActivated) {
        // Set the text heading and body
        document.getElementById('feedbackTag').innerHTML = "<i class='fa fa-hashtag'></i>" + jsonData.tag;
        document.getElementById('feedbackSentence').innerHTML = "<p>" + jsonData.sentence1 + "</p><p>" + jsonData.sentence2 + "</p>"; // make regular paragraphs

        $('.feedbackPanel').slideToggle("slow", "swing", function () {
            feedbackActivated = true;
            $("#feedbackTag").animate({"opacity": "1"}, 1000);
            $("#feedbackSentence").delay(2000).animate({"opacity": "1"}, 1000).delay(15000).animate({"opacity": "0"}, 1000, function () {
                $('.feedbackPanel').slideUp("slow", "swing"); // auto close panel if user doesn't dismiss manually
                feedbackActivated = false;
            });
        });
    }
};

// A stack is a single batch of chairs. One session could be multiple stacks.
function createChairStack(numChairs) {
    var upper_bound = 50;
    var lower_bound = -50;

    var instance;

    //numChairsInStack = 1; // local testing
    //console.log("numChairs:" + numChairs);

    //console.log("chair " + currentChairCount);

    for (var i = 0; i < numChairs; i++) {
        // Grab our open chair geometry that was previously loaded and make a clone.
        // This will randomly select open and closed chairs.
        if (Math.floor(Math.random() * 2 + 1) == 1) {
            instance = chairOpenGeo.clone();
        } else {
            instance = chairClosedGeo.clone();
        }
        instance.visible = false;

        var mass = 1;
        var randomX = Math.round(Math.random() * (upper_bound - lower_bound) + lower_bound) - 100;
        var randomY = Math.floor(Math.random() * (upper_bound * 3) + 150); // num between 150 and 300
        var randomZ = Math.round(Math.random() * (upper_bound - lower_bound) + lower_bound);
        //console.dir(instance);
        chairPos.set(Math.abs(randomX), Math.abs(randomY), randomZ);
        //chairPos.set(100, 100, 0);
        chairQuat.set(Math.random(), Math.random(), Math.random(), 1);

        makeRigid(instance, mass, chairPos, chairQuat, null, GROUP.COL_CHAIR, chairsCollideWith);
        instance.userData.physicsBody.forceActivationState(ACTIVE_TAG); // disable
        chairGroup.push(instance);
    }
    //console.log("Finished creating stack.");
}

// A Twitter Drop Stack is a single batch of hashtags. One session could be multiple stacks.
function createTwitterDropStack(numTwitterDrops) {
    var upper_bound = 50;
    var lower_bound = -50;

    //numChairsInStack = 1; // local testing
    //console.log("numChairs:" + numChairs);

    //console.log("chair " + currentChairCount);

    for (var i = 0; i < numTwitterDrops; i++) {
        var num = randomWithRange(0,twitterDrops.length - 1);
        var twitDrop = twitterDrops[num].tPlane;
        //console.log("twitDrop number: " + num);
        //console.dir(twitDrop);
        twitDrop.visible = false;

        var mass = 2;
        var randomX = Math.round(Math.random() * (upper_bound - lower_bound) + lower_bound) - 100;
        var randomY = Math.floor(Math.random() * (upper_bound * 3) + 150); // num between 150 and 300
        var randomZ = Math.round(Math.random() * (upper_bound - lower_bound) + lower_bound);
        //console.dir(instance);
        twitPos.set(Math.abs(randomX), Math.abs(randomY), randomZ);
        //chairPos.set(100, 100, 0);
        twitQuat.set(Math.random(), Math.random(), Math.random(), 1);

        makeRigid(twitDrop, mass, twitPos, twitQuat, null, GROUP.COL_TDROP, twitDropsCollideWith);
        twitDrop.userData.physicsBody.setRestitution(0.6);
        twitDrop.userData.physicsBody.forceActivationState(ACTIVE_TAG); // disable
        //console.log("name:" + twitDrop.name + " colGroup: " + GROUP.COL_TDROP + " colMask: " + twitDropsCollideWith);
        twitDropGroup.push(twitDrop);
    }
    //console.log("Finished creating stack.");
}

/**
 * randomWithRange returns a random integer between min(inclusive) and max(inclusive)
 * @param LowerRange
 * @param UpperRange
 * @returns {*}
 */
function randomWithRange(LowerRange, UpperRange) {
    return Math.floor(Math.random() * (UpperRange - LowerRange + 1)) + LowerRange;
};

/**
 *
 * @param hashTag
 * @param tweetCount
 */
function setupDumpsterSession(hashTag, tweetCount) {
    dumpSessionArray = [];
    // Figure out how many stacks we're going to need to approach the tweet count.
    var numStacks = tweetCount / maxNumChairsInStack;
    if (numStacks < 1){
        numStacks = 1;
    }
    //console.log("numStacks: " + numStacks);
    var sessionCount = tweetCount;
    var consumer, remainder;
    for (var i = 0; i < Math.ceil(numStacks); i++) {
        if (sessionCount > maxNumChairsInStack) {
            consumer = sessionCount - maxNumChairsInStack;
            remainder = sessionCount - consumer;
        } else {
            remainder = sessionCount;
        }
        dumpSessionArray.push(remainder);
        sessionCount -= remainder;
    }

    // Okay, now we know how many stacks we need to create and how many chairs
    // should be in each stack.

    currentDumpIndex = dumpSessionArray.length - 1; // convert to 0 index!
    dumpSessionArray.reverse(); // let's reverse it so our smallest remainder is index 0 and dumped last.
    console.log("We will be dumping this load in " + dumpSessionArray.length + " stacks.");

    // This technique uses an anonymous function to call dumpChairs so you can pass parameters if needed.
    //dumpInterval = setInterval( function() { dumpChairs(dumpSessionArray); }, dumpIntervalTime);
    dumpChairs(); // call this directly the first time so we don't have to wait on the interval.
    if(numStacks > 1) {
        dumpInterval = setInterval(dumpChairs, dumpIntervalTime);
    }

}

function dumpChairs() {

    createChairStack(dumpSessionArray[currentDumpIndex]);

    //console.log("Dumping stack " + (dumpSessionArray.length - currentDumpIndex) + " of " + dumpSessionArray.length);

    // This could be a problem because it might activate chairs I've previously deactivated
    // need to keep sessions separate
    for (var chair in chairGroup) {
        var theChair = chairGroup[chair];
        //console.dir(theChair);

        // The Bullet Physics docs recommend activate() to reactivate an object
        // http://bulletphysics.org/mediawiki-1.5.8/index.php/Activation_States
        theChair.visible = true;
        theChair.userData.physicsBody.activate(); //enable
        //console.log("activation state: " + theChair.userData.physicsBody.isActive());
        theChair.userData.physicsBody.applyTorqueImpulse(new Ammo.btVector3(0, 10, 1));
    }

    currentDumpIndex--;
    //console.log("currentDumpIndex: " + currentDumpIndex);
    if (currentDumpIndex == -1) {
        clearInterval(dumpInterval);
        //console.log("Done with dump session");

        // THINK ABOUT THIS...HERE? And do we want the same interval time?
        setTimeout(function () {
            if(audioOn){
                fadeOutAndStopAudioClip(chairthrowSound);
            }
            resetInterface();
        }, dumpIntervalTime);

    }

    houseKeepInterval = setInterval(houseKeepDumped, houseKeepingIntervalTime);
}
/**
 * Initiate the dump of num twitterDrops (i.e. hashtag 2D sprites)
 * @param num
 */
function dumpTweets(num) {

    createTwitterDropStack(num);

    console.log("Dumping hashtags ");

    setTimeout(function () {
        dumpSounds[randomWithRange(0,dumpSounds.length - 1)].play();
    }, 4000);


    for (var hashtag in twitDropGroup) {
        var hash = twitDropGroup[hashtag];

        // The Bullet Physics docs recommend activate() to reactivate an object
        // http://bulletphysics.org/mediawiki-1.5.8/index.php/Activation_States
        hash.visible = true;
        hash.userData.physicsBody.activate(); //enable
        //console.log("activation state: " + theChair.userData.physicsBody.isActive());

        //var localInertia = new Ammo.btVector3(0, 10, 1);
        //theChair.userData.physicsBody.applyTorque(localInertia);
    }

//TODO handle cleanup of tweets

//*************************LOOK AT THIS!
/*    currentDumpIndex--;
    if (currentDumpIndex == -1) {
        clearInterval(dumpInterval);
        console.log("Done with dump session");
        // THINK ABOUT THIS...HERE? And do we want the same interval time?
        setTimeout(function () {
            resetInterface()
        }, dumpIntervalTime);

    }


    houseKeepInterval = setInterval(houseKeepDumped, houseKeepingIntervalTime);*/
    twitterDropsDropped = true;
}

function resetInterface() {

    // Let's march through chairGroup and mark chairs static.
    for (var chair in chairGroup) {
        var theChair = chairGroup[chair];
        //console.dir(theChair);

        // The Bullet Physics docs recommend activate() to reactivate an object
        // http://bulletphysics.org/mediawiki-1.5.8/index.php/Activation_States
        theChair.userData.physicsBody.forceActivationState(DISABLE_SIMULATION); //disable
        //console.log("activation state: " + theChair.userData.physicsBody.isActive());

    }

    stopBubbles = false;
}

function houseKeepDumped() {
    var yPosToCull = -60; // point below the surface where we start culling.

    for (var i = 0; i < chairGroup.length; i++) {

        var currChair = chairGroup[i];
        //console.dir(chairGroup);
        //console.log("currChair.position.y: " + currChair.position.y);
        if (currChair.position.y < yPosToCull) {

            chairsCulled++;
            removeEntity(currChair, chairGroup);
        }
    }
}

function houseKeepThrown() {
    var yPosToCull = -60; // point below the surface where we start culling.

    for (var i = 0; i < thrownChairGroup.length; i++) {

        var currChair = thrownChairGroup[i];
        //console.dir(chairGroup);
        //console.log("currChair.position.y: " + currChair.position.y);
        if (currChair.position.y < yPosToCull) {

            thrownChairsCulled++;
            removeEntity(currChair, thrownChairGroup);
        }
    }
}

function removeEntity(object, group) {

    //console.log("selectedObject: " + selectedObject.id);

    var index = group.indexOf(object);
    //console.log( "chair " + object.id + " is number " + index + " in group.");
    group.splice(index, 1);
    //console.log("Number of chairs on the ring: " + group.length);

    //physicsWorld.removeCollisionObject(object);
    physicsWorld.removeCollisionObject(object.userData.rigidBody);

    object.geometry.dispose();

    scene.remove(object);
    delete(object);

}

function toggleMode() {

    if (throwMode) {
        // This only occurs on startup if user goes straight for DUMP mode.
        if (currentParty === null){
            chooseParty("DNC");
        };
        throwMode = false;
        for(var i = 0; i < twitterBubbles.length; i++){
            twitterBubbles[i].tSphere.visible = true;
        }
    } else {
        throwMode = true;
        for(var i = 0; i < twitterBubbles.length; i++){
            twitterBubbles[i].tSphere.visible = false;
        }
    }
}

function startAudio(){
    fadeInAndPlayAudio(ambientSound);
    audioOn = true;
};

function stopAudio(){
    fadeOutAndStopAudio(ambientSound);
    audioOn = false;
}

function fadeInAndPlayAudio(audio){
    //console.log("fadeInAndPlayAudio() called.");
    audioListener.setMasterVolume(masterVolume);
    var curVol = audio.getVolume();
    var volume = {x : curVol};

    new TWEEN.Tween(volume).to({
        x: 1
    }, 4000).onUpdate(function() {
        audio.setVolume(this.x);
        //console.log("current volume: " + this.x);
    }).start();

    audio.play();

};

function fadeOutAndStopAudio(audio){
    //console.log("fadeOutAndStopAudio() called.");
    var curVol = audio.getVolume();
    var volume = {x : curVol};
// using Tween.js
    new TWEEN.Tween(volume).to({
        x: 0
    }, 4000).onUpdate(function() {
        audio.setVolume(this.x);
    }).onComplete(function() {
        audio.stop();
        audioListener.setMasterVolume(0);
    }).start();

};

function fadeOutAndStopAudioClip(audio){
    //console.log("fadeOutAndStopAudio() called.");
    var curVol = audio.getVolume();
    var volume = {x : curVol};
// using Tween.js
    new TWEEN.Tween(volume).to({
        x: 0
    }, 4000).onUpdate(function() {
        audio.setVolume(this.x);
    }).onComplete(function() {
        audio.stop();
    }).start();

};

// Well, sorta. Basically, move it out of the way and kill it.
function popBubble(selectedBubble, currentTag, numTagsToDump) {
    // How big we want our popped bubbles to be in the scene.
    var scaleFactor = 2;

    selectedBubble.object.userData.parent.popBubble();
    
    var curX = selectedBubble.object.position.x;
    var curScaleX = selectedBubble.object.scale.x;
    var endScaleX = selectedBubble.object.initialScale * scaleFactor;

    var posX = {x : curX};
    //console.log("start p: " + curX);
    var tweenPosX = new TWEEN.Tween(posX).to({
        x: 600
    }, 4000).onUpdate(function() {
        selectedBubble.object.position.x = this.x;
        //console.log("current volume: " + this.x);
    }).onComplete(function() {
        //console.log("DONE, ending p: " + selectedBubble.object.position.x);
    });
    //console.log("curScaleX: " + curScaleX);
    //console.log("endScaleX: " + endScaleX);
    var scaleStart = {x : curScaleX};
    var scaleEnd = {x : endScaleX};

    var tweenScale = new TWEEN.Tween(scaleStart).to(scaleEnd, 4000).onUpdate(function() {
        selectedBubble.object.scale.set(this.x, this.x, this.x);
    }).onComplete(function() {
        //console.log("DONE, ending scale: " + selectedBubble.object.scale.x);
        setupDumpsterSession(currentTag, numTagsToDump);
/*        setTimeout(function () {
            dumpSounds[randomWithRange(0,dumpSounds.length - 1)].play();
        }, 4000);
        var soundToPlay = gruntSounds[randomWithRange(0,gruntSounds.length - 1)];*/
        if (!chairthrowSound.isPlaying && audioOn) {
            setTimeout(function () {
                chairthrowSound.setVolume(0);
                chairthrowSound.setLoop(true);
                fadeInAndPlayAudio(chairthrowSound);
            }, 4000);
        };
    });
    tweenPosX.start();
    tweenScale.start();
};

function scaleUp(selectedBubble) {
    var scaleFactor = 1.5;
    selectedBubble.showCount = true;
    var curScaleX = selectedBubble.scale.x;
    var endScaleX = curScaleX * scaleFactor;
    var scaleStart = {x: curScaleX};
    var scaleEnd = {x: endScaleX};

    var tweenUpScale = new TWEEN.Tween(scaleStart).to(scaleEnd, 1000).onUpdate(function () {
        selectedBubble.scale.set(this.x, this.x, this.x);
    }).onComplete(function () {
        //console.log("SCALE UP: " + selectedBubble.scale.x);
    });
    if (!clickRequest) {
        //console.log("ease on up");
        tweenUpScale.easing(TWEEN.Easing.Elastic.InOut);
    }
    tweenUpScale.start();
};

function scaleDown(selectedBubble){
    var curScaleX = selectedBubble.scale.x;
    var endScaleX = selectedBubble.initialScale;
    var scaleStart = {x : curScaleX};
    var scaleEnd = {x : endScaleX};

    // save our current position
    selectedBubble.freezePos = selectedBubble.position;

    var tweenDownScale = new TWEEN.Tween(scaleStart).to(scaleEnd, 1000).onUpdate(function() {
        selectedBubble.scale.set(this.x, this.x, this.x);
    }).onComplete(function() {
        //console.log("SCALE DOWN: " + selectedBubble.scale.x);
        selectedBubble.showCount = false;
        returnToPosition(selectedBubble);
    });
    if (!clickRequest) {
        //console.log("ease on down");
        tweenDownScale.easing(TWEEN.Easing.Elastic.InOut);
    }
    tweenDownScale.start();
};

function returnToPosition(selectedBubble){

    var tween = new TWEEN.Tween(selectedBubble.freezePos).to(selectedBubble.position, 4000).onUpdate(function() {
        selectedBubble.position.set(this.x, this.y, this.z);
    }).onComplete(function() {
        //console.log("Returned Position");
    });
    tween.easing(TWEEN.Easing.Cubic.InOut);
    tween.start();
}

this.ammoContactResult = false;
this.ammoContactPairTestCallback = new Ammo.ConcreteContactResultCallback();
var scope = this;
this.ammoContactPairTestCallback.addSingleResult = function( cp, colObj0, partid0, index0, colObj1, partid1, index1 ) {
    //console.log( "Distance: " + cp.getDistance() ); // cp.getDistance is undefined
    var str1 = "";
    for ( var i = 0; i < arguments.length; i++ ) {
        str1 += arguments[ i ] + ", ";
    }
    //console.log( "Debug addSingleResult: " + str1 );
    scope.ammoContactResult = true;
};

this.contactPairTest = function( rigidSolid1, rigidSolid2 ) {
    scope.ammoContactResult = false;
    scope.physicsWorld.contactPairTest( rigidSolid1, rigidSolid2, scope.ammoContactPairTestCallback );
    return scope.ammoContactResult;
};

function processMouse() {
    raycaster.setFromCamera(mouseCoords, camera);
    var intersects = raycaster.intersectObjects(scene.children, false);

    // HANDLE CLICKS
    // If we get a click, the bubbles are moving and we are not in throw mode:
    if (clickRequest && !stopBubbles && !throwMode) {
        wasClick = true;
        clickRequest = false;

        if (intersects.length > 0) {

            //console.log(JSON.stringify(intersects));
            // get the closest object
            var selectClickObj = intersects[0];

            // If you clicked on a twitterbubble, and it's not one that has been previously popped
            // and therefore marked as "ignoreMouseEvents"...then pop it!
            if (selectClickObj.object.name.indexOf("twitterbubble") > -1 && !selectClickObj.ignoreMouseEvents) {
                currentHashtag = selectClickObj.object.tag;
                currentHashtagCount = selectClickObj.object.count;
                //console.dir(selectClickObj);
                popBubble(selectClickObj, currentHashtag, (currentHashtagCount * DUMP_MULT).toFixed());
                stopBubbles = true;
                console.log("current hashtag and count: " + currentHashtag + ", " + currentHashtagCount + " TOTAL TO DROP: " +  (currentHashtagCount * DUMP_MULT).toFixed());
            };
        }

        pos.copy(raycaster.ray.direction);

        //clickRequest = false;

        // If we get a click, and we are in throw mode:
    } else if (clickRequest && !stopBubbles && throwMode) {
        clickRequest = false;

        var chairInstance;
        if (Math.floor(Math.random() * 2 + 1) == 1) {
            chairInstance = chairOpenGeo.clone();
        } else {
            chairInstance = chairClosedGeo.clone();
        }
        chairInstance.visible = true;
        var mass = 1;
        pos.copy(raycaster.ray.direction);
        pos.add(raycaster.ray.origin);
        quat.set(0, 0, 0, 1);
        var chairRb = makeRigid(chairInstance, mass, pos, quat, null, GROUP.COL_CHAIR, chairsCollideWith);
        //console.dir(chairInstance);
        //console.dir(chairRb);
        chairRb.userData.physicsBody.setFriction(0.5);
        thrownChairGroup.push(chairInstance);

        mostRecentlyThrownChair = chairInstance;

        if (thrownChairGroup.length > 50) {
            houseKeepThrown();
        }

        pos.copy(raycaster.ray.direction);
        pos.multiplyScalar(throwVelocity);
        chairRb.userData.physicsBody.setLinearVelocity(new Ammo.btVector3(pos.x, pos.y, pos.z));
        chairRb.userData.physicsBody.applyTorqueImpulse(new Ammo.btVector3(pos.x, pos.y, pos.z));

        var soundToPlay = gruntSounds[randomWithRange(0,gruntSounds.length - 1)];
        if(!soundToPlay.isPlaying){
            soundToPlay.play();
        };

        //clickRequest = false;
    }

    // HANDLE MOTION
    // Only test for intersects if we are not in throwMode and we're not in the process of clicking (above).
    if(!clickRequest && !throwMode) {
        //var motionIntersects = raycaster.intersectObjects(raycastGroup, false);
        var selectObj = null;

        // Primary mouse over. Something in our intersects array. Grab the closest object.
        if (intersects.length > 0) {
            selectObj = intersects[0].object;

            // If it's a twitterbubble and not one that's already been popped.
            if (selectObj.name.indexOf("twitterbubble") > -1 && !selectObj.ignoreMouseEvents) {
                    //console.log("Mouse over TwitterBubble: " + selectObj.name);
                    //console.dir(selectObj);
                    // Show count, scale up, and add to INTERSECTED if it's not already there.
                    if(INTERSECTED.indexOf(selectObj) == -1){
                        //selectObj.showCount = true;
                        scaleUp(selectObj);
                        INTERSECTED.push(selectObj);
                    };
            };
        // Primary MouseOut: intersects is empty
        } else {
            // We aren't over anything but something is still in INTERSECTED, reset it.
            if (INTERSECTED.length > 0) {
                for (var i = 0; i < INTERSECTED.length; i++){
                    //console.dir(INTERSECTED[i]);
                    //INTERSECTED[i].showCount = false;
                    //INTERSECTED[i].scale.set(INTERSECTED[i].initialScale, INTERSECTED[i].initialScale, INTERSECTED[i].initialScale);
                    scaleDown(INTERSECTED[i]);
                }
                INTERSECTED = [];
            }
        }
    }

    // Collision testing and response for thrown chair
    if (mostRecentlyThrownChair) {
        if(gDonkeyMesh != null){
            var donkeyHit = this.contactPairTest(mostRecentlyThrownChair.userData.physicsBody, gDonkeyMesh.userData.physicsBody);
        }
        if(gElephantMesh != null){
            var elephantHit = this.contactPairTest(mostRecentlyThrownChair.userData.physicsBody, gElephantMesh.userData.physicsBody);
        }

        if (donkeyHit) {
            //console.log("You hit the donkey!");
            if (randomWithRange(0,5) == 5){
                if(!hillarySound.isPlaying) {
                    hillarySound.play();
                };
            } else {
                if(!donkeySound.isPlaying) {
                    donkeySound.play();
                };
            };
            dumpIt = true;
            mostRecentlyThrownChair = null; // let's reset now
        } else if (elephantHit) {
            //console.log("You hit the elephant!");
            if(!elephantSound.isPlaying){
                elephantSound.play();
            }
            dumpIt = true;
            mostRecentlyThrownChair = null; // let's reset now
        };
    };

    // Collision testing and response for dropped hashtags
    if (twitterDropsDropped) {
        // Identify the first twitterDrop to hit either the donkey or elephant
        for (var drop in twitDropGroup) {
            var tDrop = twitDropGroup[drop];
            if(gDonkeyMesh != null){
                var donkeyHit = this.contactPairTest(tDrop.userData.physicsBody, gDonkeyMesh.userData.physicsBody);
            };
            if(gElephantMesh != null){
                var elephantHit = this.contactPairTest(tDrop.userData.physicsBody, gElephantMesh.userData.physicsBody);
            };

            // Only proceed if the current tDrop hasn't collided before.
            if (twitsCollided.indexOf(tDrop) == -1) {
                if (donkeyHit) {
                    console.log(tDrop.tag + " hit the donkey!");
                    postHashtag(tDrop.tag); // For now I make no distinction between donkey or elephant
                    twitsCollided.push(tDrop); // add to list of successfully collided drops
                    twitterDropsDropped = false;
                    break;
                } else if (elephantHit) {
                    console.log(tDrop.tag + " hit the elephant!");
                    postHashtag(tDrop.tag);
                    twitsCollided.push(tDrop); // add to list of successfully collided drops
                    twitterDropsDropped = false;
                    break;
                }
            }
        }

    }


}

function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    cameraCube.aspect = window.innerWidth / window.innerHeight;
    cameraCube.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);

}

function animate() {

    requestAnimationFrame(animate);

    if (readyToRender) {

        render();
        //controls.update();
        //stats.update();
    }

}

function render() {

    var deltaTime = clock.getDelta();
    var timer = 0.0001 * Date.now();

    updatePhysics(deltaTime);

    processMouse();

    if (readyToRender) {
        water.material.uniforms.time.value += 1.0 / 60.0;
        water.render();
    }

    controls.update(deltaTime);

    if (!throwMode) {
        for (var i = 0; i < hashCount; i++) {
            var tSphere = twitterBubbles[i];
            //console.log( "tSphere.tag:" + tSphere.tag );
            tSphere.animate(timer, i);
        }
    } else if (throwMode && dumpIt){
        dumpTweets(numTweetsToDump);
        dumpIt = false;
    }

    TWEEN.update();
    camera.lookAt(scene.position);
    cameraCube.rotation.copy(camera.rotation);
    renderer.render(sceneCube, cameraCube);
    renderer.render(scene, camera);
};

function updatePhysics(deltaTime) {

    // Step world
    physicsWorld.stepSimulation(deltaTime, 10);

    // Update soft volumes
    for (var i = 0, il = softBodiesToRender.length; i < il; i++) {
        var volume = softBodiesToRender[i];
        var geometry = volume.geometry;
        var softBody = volume.userData.physicsBody;
        var volumePositions = geometry.attributes.position.array;
        var volumeNormals = geometry.attributes.normal.array;
        var association = geometry.ammoIndexAssociation;
        var numVerts = association.length;
        var nodes = softBody.get_m_nodes();
        for (var j = 0; j < numVerts; j++) {

            var node = nodes.at(j);
            var nodePos = node.get_m_x();
            var x = nodePos.x();
            var y = nodePos.y();
            var z = nodePos.z();
            var nodeNormal = node.get_m_n();
            var nx = nodeNormal.x();
            var ny = nodeNormal.y();
            var nz = nodeNormal.z();

            var assocVertex = association[j];

            for (var k = 0, kl = assocVertex.length; k < kl; k++) {
                var indexVertex = assocVertex[k];
                volumePositions[indexVertex] = x;
                volumeNormals[indexVertex] = nx;
                indexVertex++;
                volumePositions[indexVertex] = y;
                volumeNormals[indexVertex] = ny;
                indexVertex++;
                volumePositions[indexVertex] = z;
                volumeNormals[indexVertex] = nz;
            }
        }

        geometry.attributes.position.needsUpdate = true;
        geometry.attributes.normal.needsUpdate = true;

    }

    // Update rigid bodies
    for (var i = 0, il = rigidBodies.length; i < il; i++) {
        var objThree = rigidBodies[i];
        var objPhys = objThree.userData.physicsBody;
        var ms = objPhys.getMotionState();
        if (ms) {

            ms.getWorldTransform(transformAux1);
            var p = transformAux1.getOrigin();
            var q = transformAux1.getRotation();
            objThree.position.set(p.x(), p.y(), p.z());
            objThree.quaternion.set(q.x(), q.y(), q.z(), q.w());

        }
    }
    //var numManifolds = physicsWorld.getDispatcher().getNumManifolds();
    //console.log("numManifolds: " + numManifolds);

}


