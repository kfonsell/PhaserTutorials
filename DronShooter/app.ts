﻿class Game extends Phaser.Game {

	constructor() {
		super(640, 400, Phaser.AUTO, "content", State);
	}
}

class State extends Phaser.State {

	private static CANNON_SPEED = 2;
	private static MISSILE_SPEED = 6;

	private _cannon: Phaser.Sprite;
	private _cannonTip: Phaser.Point = new Phaser.Point();

	private _space: Phaser.Key;

	private _drones: Phaser.Group;
	private _dronesCollisionGroup: Phaser.Physics.P2.CollisionGroup;
	private _missiles: Phaser.Group;
	private _missilesCollisionGroup: Phaser.Physics.P2.CollisionGroup;

	preload() {
		this.game.load.path = "assets/";
		this.game.load.image("BG", "bg.jpg");
		this.game.load.atlas("atlas");
	}

	create() {
		// Use the P2 physics engine.
		this.game.physics.startSystem(Phaser.Physics.P2JS);

		this.add.image(0, 0, "BG");

		// The cannon is placed at the bottom center.
		this._cannon = this.game.add.sprite(this.world.centerX, this.world.height, "atlas", "cannon");
		this._cannon.anchor.setTo(-0.75, 0.5);
		// Rotate so it points straight up.
		this._cannon.rotation = -Math.PI / 2;

		var base = this.game.add.sprite(this.world.centerX, this.world.height, "atlas", "base");
		base.anchor.setTo(0.5, 1);

		// Handle some keys for the cannon actions.
		this.game.input.keyboard.addKey(Phaser.Keyboard.LEFT);
		this.game.input.keyboard.addKey(Phaser.Keyboard.RIGHT);
		this._space = this.game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);
		// Capture the keys so they aren't handled by the browser.
		this.game.input.keyboard.addKeyCapture([Phaser.Keyboard.LEFT, Phaser.Keyboard.RIGHT, Phaser.Keyboard.SPACEBAR]);

		this.game.physics.p2.setImpactEvents(true);

		this._dronesCollisionGroup = this.game.physics.p2.createCollisionGroup();
		this._missilesCollisionGroup = this.game.physics.p2.createCollisionGroup();

		this._drones = this.add.group();
		this._drones.physicsBodyType = Phaser.Physics.P2JS;
		this._drones.enableBody = true;

		// Create 8 drones.
		this._drones.classType = Dron;
		this._drones.createMultiple(8, "atlas", "dron1");
		this._drones.forEach(function (aDron: Dron) {
			aDron.setUp();
			// Setup physics.
			var body: Phaser.Physics.P2.Body = aDron.body;
			body.setCircle(aDron.width / 2);
			// Don't respond to forces.
			body.kinematic = true;
			body.setCollisionGroup(this._dronesCollisionGroup);
			body.collides(this._missilesCollisionGroup, this.hitDron, this);
		}, this);

		this._missiles = this.add.group();
		this._missiles.physicsBodyType = Phaser.Physics.P2JS;
		this._missiles.enableBody = true;

		// Create 10 missiles.
		this._missiles.createMultiple(10, "atlas", "missile");
		this._missiles.forEach(function (aMissile: Phaser.Sprite) {
			aMissile.anchor.setTo(0.5);

			var body: Phaser.Physics.P2.Body = aMissile.body;
			body.setRectangle(aMissile.width, aMissile.height);
			body.setCollisionGroup(this._missilesCollisionGroup);
			body.collides(this._dronesCollisionGroup);
		}, this);
	}

	update() {
		// Create a shortcut to access the keyboard.
		var keyboard: Phaser.Keyboard = this.game.input.keyboard;

		if (keyboard.isDown(Phaser.Keyboard.LEFT)) {
			// Move 45 degrees (PI/4) in 1 second, adjusted by cannon speed, independent of the framerate.
			this._cannon.rotation -= this.time.elapsedMS * State.CANNON_SPEED / 1000 * (Math.PI / 4);
		} else if (keyboard.isDown(Phaser.Keyboard.RIGHT)) {
			this._cannon.rotation += this.time.elapsedMS * State.CANNON_SPEED / 1000 * (Math.PI / 4);
		} else if (this._space.justDown) {
			// Get the first non-existing item.
			var missile: Phaser.Sprite = this._missiles.getFirstExists(false);

			if (missile) {
				// Determine where the cannon tip is.
				this._cannonTip.setTo(this._cannon.width * 2, 0);
				this._cannonTip.rotate(0, 0, this._cannon.rotation);

				missile.reset(this._cannon.x + this._cannonTip.x, this._cannon.y + this._cannonTip.y);
				(<Phaser.Physics.P2.Body>missile.body).rotation = this._cannon.rotation;

				// Will automatically be set to exists=false after 1.5 seconds. Calls kill().
				missile.lifespan = 1500;
				// Set velocity of missile in direction of actual cannon tip.
				(<Phaser.Physics.P2.Body>missile.body).velocity.x = this._cannonTip.x * State.MISSILE_SPEED;
				(<Phaser.Physics.P2.Body>missile.body).velocity.y = this._cannonTip.y * State.MISSILE_SPEED;
			}
		}

		// Limit the cannon rotation to -135 to -45 degrees.
		this._cannon.rotation = Phaser.Math.clamp(this._cannon.rotation, -1.5 * Math.PI / 2, -0.5 * Math.PI / 2);
	}

	private hitDron(aObject1: any, aObject2: any) {
		(<Dron>aObject1.sprite).explode();
		// Only kill the missile, since we want it later.
		(<Phaser.Sprite>aObject2.sprite).kill();
	}
}

class Dron extends Phaser.Sprite {

	public setUp() {
		this.anchor.setTo(0.5);
		// Put it in a random location.
		this.reset(this.game.rnd.between(40, 600), this.game.rnd.between(60, 150));
		// Movement range.
		var range: number = this.game.rnd.between(60, 120);
		// Duration of complete move.
		var duration: number = this.game.rnd.between(30000, 50000);
		// Random wiggle properties.
		var xPeriod1: number = this.game.rnd.between(2, 13);
		var xPeriod2: number = this.game.rnd.between(2, 13);
		var yPeriod1: number = this.game.rnd.between(2, 13);
		var yPeriod2: number = this.game.rnd.between(2, 13);

		// Add tweens. Target the body since physics are enabled.
		var xTween = this.game.add.tween(this.body);
		xTween.to({ x: this.position.x + range }, duration, function (aProgress: number) {
			return wiggle(aProgress, xPeriod1, xPeriod2);
		}, true, 0, -1);

		var yTween = this.game.add.tween(this.body);
		yTween.to({ y: this.position.y + range }, duration, function (aProgress: number) {
			return wiggle(aProgress, yPeriod1, yPeriod2);
		}, true, 0, -1);

		// Define animations.
		this.animations.add("anim", ["dron1", "dron2"], this.game.rnd.between(2, 5), true);
		this.animations.add("explosion", Phaser.Animation.generateFrameNames("Explosion", 1, 6, "", 3));
		// Start the first animation by default.
		this.play("anim");
	}

	public explode() {
		// Remove the movement tween.
		this.game.tweens.removeFrom(this.body);
		// Explode and kill itself.
		this.play("explosion", 8, false, true);
	}
}

/**
 * Tween function to give a target a bit of wiggle, but ending back at the same spot.
 * @param aProgress
 * @param aPeriod1
 * @param aPeriod2
 * @returns
 */
function wiggle(aProgress: number, aPeriod1: number, aPeriod2: number): number {
	var current1: number = aProgress * Math.PI * 2 * aPeriod1;
	var current2: number = aProgress * Math.PI * 2 * aPeriod2;

	return Math.sin(current1) * Math.cos(current2);
}

window.onload = () => {
	new Game();
};