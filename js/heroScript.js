'use strict';

// =============================================================================
// Create Player (Hero)
// =============================================================================
window.Hero = class Hero extends Phaser.Sprite {
    constructor(game, x, y) {
        super();
        Phaser.Sprite.call(this, game, 10, 523, 'hero');
        // anchor
        this.anchor.set(0.5, 0.5);
        // physics properties
        this.game.physics.enable(this);
        this.body.collideWorldBounds = true;
        // animations
        this.animations.add('stop', [0]);
        this.animations.add('run', [1, 2], 8, true); // 8fps looped
        this.animations.add('jump', [3]);
        this.animations.add('fall', [4]);
        // starting animation
        this.animations.play('stop');
    }

    move(direction) {
        // guard
        if (this.isFrozen) { return; }
        const SPEED = 200;

        this.body.velocity.x = direction * SPEED;

        // update image flipping & animations
        if (this.body.velocity.x < 0) {
            this.scale.x = -1;
        }
        else if (this.body.velocity.x > 0) {
            this.scale.x = 1;
        }
    }

    jump() {
        //Hero jumping code
        const JUMP_SPEED = 600;
        let canJump = this.body.touching.down && this.alive && !this.isFrozen;

        if (canJump || this.isBoosting) {
            this.body.velocity.y = -JUMP_SPEED;
            this.isBoosting = true;
        }

        return canJump;
    }

    update() {
        // update sprite animation, if it needs changing
        let animationName = this._getAnimationName();
        if (this.animations.name !== animationName) {
            this.animations.play(animationName);
        }
    }

    freeze () { //When player goes through door do animation and remove player
        this.body.enable = false;
        this.isFrozen = true;
    }

    // returns the animation name that should be playing depending on
    // current circumstances
    _getAnimationName() {
        let name = 'stop'; // default animation
        // frozen
        if (this.isFrozen) {
            name = 'stop';
        }
        // jumping
        else if (this.body.velocity.y < 0) {
            name = 'jump';
        }
        // falling
        else if (this.body.velocity.y >= 0 && !this.body.touching.down) {
            name = 'fall';
        }
        else if (this.body.velocity.x !== 0 && this.body.touching.down) {
            name = 'run';
        }

        return name;
    }
}