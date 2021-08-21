/**
 * Created by jstenner on 6/4/16.
 */



THREE.TwitterDrop = function (hashTag, hashTagCount) {
    THREE.Object3D.call(this);

    this.name = 'twitterdrop_' + this.id;

    this.tag = hashTag;
    this.count = hashTagCount;
    this.tPlane;
    this.type = "drop"
    this.selected = false;
    this.showCount = false;
    this.initialScale;

    var tagSprite;
    var countSprite;
    var freezeAnimation = false;

    // move the bubbles deeper into the scene or nearer the camera
    var dropsForeAft = 500;
    // control the width of the bubble cloud
    var dropsWidth = 500;
    // control the depth of the bubble cloud
    var dropsDepth = 100;
    // control the height the bubbles fly
    var dropsHeight = 150;

    // Random centered about zero (+ -).
    var makeRandom = function (max) {
        var num = Math.floor(Math.random() * max) + 1; // this will get a number between 1 and max;
        num *= Math.floor(Math.random() * 2) == 1 ? 1 : -1; // this will add minus sign in 50% of cases

        return num;
    };

    // Make the parent geometry invisible
    var material = new THREE.MeshLambertMaterial( { map: hashTexture, color: 0x999999, transparent: true, opacity: 1.0, depthWrite: false, side: THREE.DoubleSide} );
    this.tPlane = new THREE.Mesh( new THREE.PlaneGeometry( 4, 4, 1, 1 ), material );
    //this.tPlane = new THREE.Mesh( new THREE.Sprite( material );
    //this.tPlane = new THREE.Mesh( new THREE.SphereGeometry( 8, 3, 3 ), material );

    //this.tPlane.rotation.set(0, 0, 0);
    //this.tPlane.rotateY(-90 * Math.PI / 180);
    //this.tPlane.position.z = makeRandom(dropsWidth);

    // Text2D does not work well for rigid bodies...max memory even quicker than chairs!
//    var Text2D = THREE_Text.Text2D;
    var SpriteText2D = THREE_Text.SpriteText2D;
    var textAlign = THREE_Text.textAlign;
    //hashTag
//    tagSprite = new Text2D(hashTag, {align: textAlign.center, font: '30px Arial', fillStyle: '#000000', antialias: true});
    // Get rid of "#" if it appears in the string, for this purpose, anyway
    var tagString;
    if(hashTag.charAt(0) == "#"){
        tagString = hashTag.slice(1);
    }else{
        tagString = hashTag;
    }
    tagSprite = new SpriteText2D( tagString, { align: textAlign.center, font: '30px Arial', fillStyle: '#000000', antialias: true });
    tagSprite.name = "tagSprite_" + this.id;

    tagSprite.scale.set(.1, .1, .1);
    //tagSprite.rotateY(-90 * Math.PI / 180);
    tagSprite.position.set(0, 0, 0);
    //console.log("sprite.x: " + sprite.position.x );

    tagSprite.material.alphaTest = 0.1;

/*    var tagCount = "[" + hashTagCount + "]";

    countSprite = new Text2D(tagCount, {align: textAlign.center, font: '30px Arial', fillStyle: '#000000', antialias: true});
    countSprite.name = "countSprite_" + this.id;
    //sprite = new SpriteText2D( hashTag, { align: textAlign.center, font: '30px Arial', fillStyle: '#000000', antialias: true });
    countSprite.scale.set(.07, .07, .07);
    //countSprite.rotateY(-90 * Math.PI / 180);
    countSprite.position.set(-10, 0, 0);
    //console.log("sprite.x: " + sprite.position.x );
    countSprite.material.alphaTest = 0.1;
    countSprite.visible = false;*/

    // TO DO: Could scale these to be relative to number of tweets!
    this.tPlane.scale.x = this.tPlane.scale.y = this.tPlane.scale.z = Math.random() * 3 + 0.5;
    //this.tSphere.geometry.computeBoundingSphere();
    //console.log("bounding sphere radius: " + this.tSphere.boundingSphere);
    //this.tSphere.scale.x = this.tSphere.scale.y = this.tSphere.scale.z = 2;
 //   this.initialScale = this.tPlane.scale.x;
    //console.log("curScale: " + this.initialScale );

    this.tPlane.userData = {
        name: this.name
    };

    this.tPlane.name = this.name;
    this.tPlane.count = this.count;
    this.tPlane.tag = this.tag;
    this.tPlane.selected = this.selected;
    this.tPlane.showCount = this.showCount;
    this.tPlane.initialScale = this.initialScale;

    // By adding the sprite to the tSphere, it inherits position/rotation
    this.tPlane.add(tagSprite);
    //this.tPlane.add(countSprite);
    // By default we want to set these to visible
    this.tPlane.visible = false;
    scene.add(this.tPlane);



    this.animate = function (timer, i) {

        if (!freezeAnimation) { // we want to freeze animation periodically and if bubble was EVER selected, freeze it permanently, too.
            if (!stopBubbles && !this.tPlane.selected) {
                this.tPlane.position.x = dropsDepth * Math.cos(timer + i) + dropsForeAft;
                this.tPlane.position.y = dropsHeight * Math.sin(timer + i * 1.1);
            }
            if (this.tPlane.selected) {
                this.tPlane.material.wireframe = true;
                this.tPlane.scale.set(10, 10, 10);
            }
        }

        if (this.tPlane.showCount){
            countSprite.visible = true;
            freezeAnimation = true;
            //console.log("set countSprite to visible");
        }else{
            countSprite.visible = false;
            freezeAnimation = false;
        }

        if (fadeOutBubbles) {

        }
    };

    //this.setVisibility()


    return this;

};

THREE.TwitterDrop.prototype.getTag = function () {
    return this.tag;
};

THREE.TwitterDrop.prototype.fadeOut = function () {
    this.tPlane.material.transparent = true;
    //this.tSphere.material.opacity = 0.5 + 0.5*Math.sin(new Date().getTime() * .0025);
    //this.tSphere.material.opacity = 0;

}

