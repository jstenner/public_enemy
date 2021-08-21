/**
 * Created by jstenner on 6/4/16.
 */



THREE.TwitterBubble = function (hashTag, hashTagCount, envTexture) {
    THREE.Object3D.call(this);

    this.name = 'twitterbubble_' + this.id;

    this.tag = hashTag;
    this.count;
    this.tSphere;
    this.type = "bubble"
    this.selected = false;
    this.showCount = false;
    this.initialScale;
    this.ignoreMouseEvents = false;
    this.freezePos = {x: null, y: null, z: null};

    var tagSprite;
    var countSprite;
    var freezeAnimation = false;
    

    // move the bubbles deeper into the scene or nearer the camera
    var bubblesForeAft = 500;
    // control the width of the bubble cloud
    var bubblesWidth = 500;
    // control the depth of the bubble cloud
    var bubblesDepth = 100;
    // control the height the bubbles fly
    var bubblesHeight = 150;

    // Random centered about zero (+ -).
    var makeRandom = function (max) {
        var num = Math.floor(Math.random() * max) + 1; // this will get a number between 1 and max;
        num *= Math.floor(Math.random() * 2) == 1 ? 1 : -1; // this will add minus sign in 50% of cases

        return num;
    };

    function mapRange(valueToBeMapped, currentLow, currentHigh, desiredLow, desiredHigh) {
        return desiredLow + (desiredHigh - desiredLow) * (valueToBeMapped - currentLow) / (currentHigh - currentLow);
    };

    // Our tag counts come in normalized from 0-1. Let's remap them into a useable range.
    this.count = mapRange(hashTagCount, 0, 1, 1, 10);

    var twitterSphereGeo = new THREE.SphereBufferGeometry(10, 32, 16);
    //twitterSphereGeo.computeBoundingSphere();
    var shader = THREE.FresnelShader;
    var uniforms = THREE.UniformsUtils.clone(shader.uniforms);

    uniforms["tCube"].value = envTexture;

    var parameters = {fragmentShader: shader.fragmentShader, vertexShader: shader.vertexShader, uniforms: uniforms};
    var twitterSphereMat = new THREE.ShaderMaterial(parameters);

    this.tSphere = new THREE.Mesh(twitterSphereGeo, twitterSphereMat);
    this.tSphere.rotation.set(0, 0, 0);

    //this.tSphere.position.x = makeRandom( 500 ); // these are controlled by animate()
    //this.tSphere.position.y = makeRandom( 500 );
    this.tSphere.position.z = makeRandom(bubblesWidth);

    /*    this.tSphere.position.x = 100;
     this.tSphere.position.y = 0;
     this.tSphere.position.z = 50;*/

    //var SpriteText2D = THREE_Text.SpriteText2D;
    var Text2D = THREE_Text.Text2D;
    var textAlign = THREE_Text.textAlign;
 
    tagSprite = new Text2D(hashTag, {align: textAlign.center, font: '30px Arial', fillStyle: '#000000', antialias: true});
    tagSprite.name = "tagSprite_" + this.id;
    //sprite = new SpriteText2D( hashTag, { align: textAlign.center, font: '30px Arial', fillStyle: '#000000', antialias: true });
    tagSprite.scale.set(.15, .15, .15);
    tagSprite.rotateY(-90 * Math.PI / 180);
    tagSprite.position.set(-12.1, 2, 0);
    //console.log("sprite.x: " + sprite.position.x );

    tagSprite.material.alphaTest = 0.1;

    var tagCountPCT = (hashTagCount * 100).toFixed(2);
    var tagCount = "[" + tagCountPCT + "]";

    countSprite = new Text2D(tagCount, {align: textAlign.center, font: '30px Arial', fillStyle: '#000000', antialias: true});
    countSprite.name = "countSprite_" + this.id;
    //sprite = new SpriteText2D( hashTag, { align: textAlign.center, font: '30px Arial', fillStyle: '#000000', antialias: true });
    countSprite.scale.set(.1, .1, .1);
    countSprite.rotateY(-90 * Math.PI / 180);
    countSprite.position.set(-10.1, -3, 0);
    //console.log("sprite.x: " + sprite.position.x );
    countSprite.material.alphaTest = 0.1;
    countSprite.visible = false;

    this.tSphere.scale.x = this.tSphere.scale.y = this.tSphere.scale.z = this.count;
    this.initialScale = this.tSphere.scale.x;
    //console.log("initial scale: " + this.name + "." + this.initialScale);

    this.tSphere.userData = {
        name: this.name,
        parent: this
    };

    this.tSphere.name = this.name;
    this.tSphere.count = this.count;
    this.tSphere.tag = this.tag;
    this.tSphere.selected = this.selected;
    this.tSphere.ignoreMouseEvents = this.ignoreMouseEvents;
    this.tSphere.showCount = this.showCount;
    this.tSphere.initialScale = this.initialScale;
    this.tSphere.freezePos = this.freezePos;



    // By adding the sprite to the tSphere, it inherits position/rotation
    this.tSphere.add(tagSprite);
    this.tSphere.add(countSprite);

    // By default we want to set these to invisible
    this.tSphere.visible = false;
    scene.add(this.tSphere);

    //this.tSphere.updateMatrixWorld( true );
    this.tSphere.geometry.computeBoundingSphere();

    // Well, sorta. Basically, move it out of the way and kill it.
    this.popBubble = function () {
        freezeAnimation = true; // take it out of the animate loop.
        this.tSphere.ignoreMouseEvents = true; // no more mouseovers
        this.tSphere.material.wireframe = true;
        this.tSphere.selected = true;
    };

    this.animate = function (timer, i) {

        //TWEEN.update(); // may not need this

        if (!freezeAnimation) { // we want to freeze animation periodically and if bubble was EVER selected, freeze it permanently, too.
            if (!stopBubbles && !this.tSphere.selected) {
                this.tSphere.position.x = bubblesDepth * Math.cos(timer + i) + bubblesForeAft;
                this.tSphere.position.y = bubblesHeight * Math.sin(timer + i * 1.1);
            }
        };

        if(!this.tSphere.ignoreMouseEvents){
            if (this.tSphere.showCount) {
                countSprite.visible = true;
                freezeAnimation = true;
                //console.log("set countSprite to visible");
            } else if (!this.tSphere.showCount) {
                countSprite.visible = false;
                freezeAnimation = false;
            }
        };
    };

    //this.setVisibility()


    return this;

};

THREE.TwitterBubble.prototype.getTag = function () {
    return this.tag;
};

THREE.TwitterBubble.prototype.fadeOut = function () {
    this.tSphere.material.transparent = true;
    //this.tSphere.material.opacity = 0.5 + 0.5*Math.sin(new Date().getTime() * .0025);
    //this.tSphere.material.opacity = 0;

}

