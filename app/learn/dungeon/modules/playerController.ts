import Phaser from "phaser";
import { GAME_CONSTANTS } from "./constants";
import type { EnemyUnit } from "./types";
import type { VirtualInput } from "./mobileControls";

export class PlayerController {
  private scene: Phaser.Scene;
  private player: Phaser.Physics.Arcade.Sprite;
  private playerShadow: Phaser.GameObjects.Ellipse;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };
  private eKey: Phaser.Input.Keyboard.Key;
  private spaceKey: Phaser.Input.Keyboard.Key;
  private qKey: Phaser.Input.Keyboard.Key;

  // State
  private lastDirection: string = "down";
  private isSlashing: boolean = false;
  private isJumping: boolean = false;
  private selectedCharacter: string;
  private speedBoostMultiplier: number = 1;
  private attackSpeedMultiplier: number = 1;
  private attackBoostMultiplier: number = 1;

  // Health
  private health: number;
  private maxHealth: number;

  // Map bounds
  private mapWidth: number;
  private mapHeight: number;

  constructor(
    scene: Phaser.Scene,
    player: Phaser.Physics.Arcade.Sprite,
    playerShadow: Phaser.GameObjects.Ellipse,
    selectedCharacter: string,
    initialHealth: number,
    initialMaxHealth: number,
    mapWidth: number,
    mapHeight: number
  ) {
    this.scene = scene;
    this.player = player;
    this.playerShadow = playerShadow;
    this.selectedCharacter = selectedCharacter;
    this.health = initialHealth;
    this.maxHealth = initialMaxHealth;
    this.mapWidth = mapWidth;
    this.mapHeight = mapHeight;

    // Setup keyboard controls
    this.cursors = scene.input.keyboard!.createCursorKeys();
    this.wasd = {
      W: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    this.eKey = scene.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.E
    );
    this.spaceKey = scene.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE
    );
    this.qKey = scene.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.Q
    );
  }

  getPlayer(): Phaser.Physics.Arcade.Sprite {
    return this.player;
  }

  getHealth(): number {
    return this.health;
  }

  getMaxHealth(): number {
    return this.maxHealth;
  }

  getLastDirection(): string {
    return this.lastDirection;
  }

  isAttacking(): boolean {
    return this.isSlashing || this.isJumping;
  }

  setSpeedBoost(multiplier: number) {
    this.speedBoostMultiplier = multiplier;
  }

  setAttackSpeedBoost(multiplier: number) {
    this.attackSpeedMultiplier = multiplier;
  }

  setAttackBoost(multiplier: number) {
    this.attackBoostMultiplier = multiplier;
  }

  setHealth(health: number, maxHealth?: number) {
    this.health = health;
    if (maxHealth !== undefined) {
      this.maxHealth = maxHealth;
    }
  }

  update(delta: number, enemies: EnemyUnit[], virtualInput?: VirtualInput): void {
    if (this.health <= 0) return;

    // Handle input - check virtual input first, then keyboard
    const attackPressed = virtualInput?.attackJustPressed || Phaser.Input.Keyboard.JustDown(this.eKey);
    const jumpPressed = virtualInput?.jumpJustPressed || Phaser.Input.Keyboard.JustDown(this.spaceKey);
    const ultPressed = virtualInput?.ultJustPressed || (this.selectedCharacter === "goku" && Phaser.Input.Keyboard.JustDown(this.qKey));

    if (attackPressed && !this.isSlashing && !this.isJumping) {
      this.performSlash(enemies);
      if (virtualInput) {
        virtualInput.attackJustPressed = false;
        virtualInput.attack = false;
      }
      return;
    }

    if (jumpPressed && !this.isJumping && !this.isSlashing) {
      this.performJump();
      if (virtualInput) {
        virtualInput.jumpJustPressed = false;
        virtualInput.jump = false;
      }
    }

    if (ultPressed && !this.isJumping && !this.isSlashing) {
      this.performUlt();
      if (virtualInput) {
        virtualInput.ultJustPressed = false;
        virtualInput.ult = false;
      }
      return;
    }

    // If slashing or jumping, stop movement
    if (this.isSlashing || this.isJumping) {
      this.player.setVelocity(0, 0);
      this.player.setAcceleration(0, 0);
      return;
    }

    // Handle movement
    this.handleMovement(virtualInput);

    // Update shadow position
    this.updateShadowPosition();

    // Handle animations
    this.handleAnimations();
  }

  private handleMovement(virtualInput?: VirtualInput) {
    let moveX = 0;
    let moveY = 0;

    // Check virtual input first (mobile), but fall back to keyboard if virtual input is zero
    if (virtualInput && (virtualInput.moveX !== 0 || virtualInput.moveY !== 0)) {
      moveX = virtualInput.moveX;
      moveY = virtualInput.moveY;
    } else {
      // Arrow keys
      if (this.cursors.left.isDown) moveX = -1;
      if (this.cursors.right.isDown) moveX = 1;
      if (this.cursors.up.isDown) moveY = -1;
      if (this.cursors.down.isDown) moveY = 1;

      // WASD keys
      if (this.wasd.W.isDown) moveY = -1;
      if (this.wasd.S.isDown) moveY = 1;
      if (this.wasd.A.isDown) moveX = -1;
      if (this.wasd.D.isDown) moveX = 1;

      // Normalize diagonal movement
      if (moveX !== 0 && moveY !== 0) {
        moveX *= 0.707;
        moveY *= 0.707;
      }
    }

    // Set velocity with speed boost
    const velocityX =
      moveX * GAME_CONSTANTS.PLAYER_SPEED * this.speedBoostMultiplier;
    const velocityY =
      moveY * GAME_CONSTANTS.PLAYER_SPEED * this.speedBoostMultiplier;
    this.player.setVelocity(velocityX, velocityY);

    // Keep player within map boundaries
    const collisionHalfWidth = this.getCollisionWidth() / 2;
    const collisionHalfHeight = this.getCollisionHeight() / 2;

    if (this.player.x < collisionHalfWidth) {
      this.player.x = collisionHalfWidth;
      this.player.setVelocityX(0);
    }
    if (this.player.x > this.mapWidth - collisionHalfWidth) {
      this.player.x = this.mapWidth - collisionHalfWidth;
      this.player.setVelocityX(0);
    }
    if (this.player.y < collisionHalfHeight) {
      this.player.y = collisionHalfHeight;
      this.player.setVelocityY(0);
    }
    if (this.player.y > this.mapHeight - collisionHalfHeight) {
      this.player.y = this.mapHeight - collisionHalfHeight;
      this.player.setVelocityY(0);
    }
  }

  private handleAnimations() {
    if (this.isJumping) return;

    const currentVelX = this.player.body!.velocity.x;
    const currentVelY = this.player.body!.velocity.y;
    const isMoving = Math.abs(currentVelX) > 10 || Math.abs(currentVelY) > 10;

    if (isMoving) {
      if (Math.abs(currentVelY) > Math.abs(currentVelX)) {
        if (currentVelY < 0) {
          this.lastDirection = "up";
          if (
            !this.player.anims.isPlaying ||
            this.player.anims.currentAnim?.key !== "run-up"
          ) {
            try {
              this.player.play("run-up", true);
            } catch (e) {
              console.warn("Error playing animation:", e);
            }
          }
        } else if (currentVelY > 0) {
          this.lastDirection = "down";
          if (
            !this.player.anims.isPlaying ||
            this.player.anims.currentAnim?.key !== "run-down"
          ) {
            try {
              this.player.play("run-down", true);
            } catch (e) {
              console.warn("Error playing animation:", e);
            }
          }
        }
      } else {
        if (currentVelX < 0) {
          this.lastDirection = "left";
          if (
            !this.player.anims.isPlaying ||
            this.player.anims.currentAnim?.key !== "run-left"
          ) {
            try {
              this.player.play("run-left", true);
            } catch (e) {
              console.warn("Error playing animation:", e);
            }
          }
        } else if (currentVelX > 0) {
          this.lastDirection = "right";
          if (
            !this.player.anims.isPlaying ||
            this.player.anims.currentAnim?.key !== "run-right"
          ) {
            try {
              this.player.play("run-right", true);
            } catch (e) {
              console.warn("Error playing animation:", e);
            }
          }
        }
      }
    } else {
      const idleAnim = `idle-${this.lastDirection}`;
      const currentAnim = this.player.anims.currentAnim?.key;

      if (currentAnim !== idleAnim) {
        this.player.anims.stop();
        try {
          this.player.play(idleAnim, true);
        } catch (e) {
          console.warn("Error playing animation:", e);
        }
      }
    }
  }

  private updateShadowPosition() {
    const shadowOffset =
      (GAME_CONSTANTS.FRAME_HEIGHT * GAME_CONSTANTS.SPRITE_SCALE) / 2 - 10;
    this.playerShadow.x = this.player.x;
    this.playerShadow.y = this.player.y + shadowOffset;
  }

  private performSlash(enemies: EnemyUnit[]) {
    this.isSlashing = true;
    const skillAnim = `skill-${this.lastDirection}`;

    this.player.setVelocity(0, 0);
    this.player.setAcceleration(0, 0);
    try {
      this.player.play(skillAnim);
    } catch (e) {
      console.warn("Error playing skill animation:", e);
    }

    if (this.attackSpeedMultiplier > 1) {
      this.player.anims.timeScale = this.attackSpeedMultiplier;
    }

    // Check if attack hits enemy
    const attackDelay = 150 / this.attackSpeedMultiplier;
    this.scene.time.delayedCall(attackDelay, () => {
      this.checkAttackHitsEnemy(enemies);
    });

    this.player.once("animationcomplete", () => {
      this.isSlashing = false;
      this.player.anims.timeScale = 1;
      try {
        this.player.play(`idle-${this.lastDirection}`);
      } catch (e) {
        console.warn("Error playing idle animation:", e);
      }
    });
  }

  private performJump() {
    this.isJumping = true;
    const jumpAnim = `jump-${this.lastDirection}`;

    this.player.setVelocity(0, 0);
    this.player.setAcceleration(0, 0);
    try {
      this.player.play(jumpAnim);
    } catch (e) {
      console.warn("Error playing jump animation:", e);
    }

    this.player.once("animationcomplete", () => {
      this.isJumping = false;
      try {
        this.player.play(`idle-${this.lastDirection}`);
      } catch (e) {
        console.warn("Error playing idle animation:", e);
      }
    });
  }

  private performUlt() {
    this.scene.scene.pause();
    this.scene.scene.launch("UltScene", {
      character: this.selectedCharacter,
      direction: this.lastDirection,
    });
  }

  private checkAttackHitsEnemy(enemies: EnemyUnit[]) {
    if (!this.player || !this.isSlashing) return;

    const attackRange = GAME_CONSTANTS.PLAYER_ATTACK_RANGE;

    enemies.forEach((enemyUnit) => {
      if (enemyUnit.defeated) return;
      if (!enemyUnit.sprite || !enemyUnit.sprite.active) return;

      const dx = enemyUnit.sprite.x - this.player.x;
      const dy = enemyUnit.sprite.y - this.player.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > attackRange) return;

      const angle = Math.atan2(dy, dx);
      const angleDeg = (angle * 180) / Math.PI;

      let hitEnemy = false;
      if (this.lastDirection === "right" && angleDeg > -45 && angleDeg < 45) {
        hitEnemy = true;
      } else if (
        this.lastDirection === "left" &&
        (angleDeg > 135 || angleDeg < -135)
      ) {
        hitEnemy = true;
      } else if (
        this.lastDirection === "down" &&
        angleDeg > 45 &&
        angleDeg < 135
      ) {
        hitEnemy = true;
      } else if (
        this.lastDirection === "up" &&
        angleDeg > -135 &&
        angleDeg < -45
      ) {
        hitEnemy = true;
      }

      if (hitEnemy) {
        // Emit event for enemy damage handling
        this.scene.events.emit("player-attack-hit", enemyUnit);
      }
    });
  }

  private getCollisionWidth(): number {
    return (
      (GAME_CONSTANTS.FRAME_WIDTH -
        GAME_CONSTANTS.FRAME_OFFSET_LEFT -
        GAME_CONSTANTS.FRAME_OFFSET_RIGHT) *
      GAME_CONSTANTS.SPRITE_SCALE
    );
  }

  private getCollisionHeight(): number {
    return (
      (GAME_CONSTANTS.FRAME_HEIGHT -
        GAME_CONSTANTS.FRAME_OFFSET_TOP -
        GAME_CONSTANTS.FRAME_OFFSET_BOTTOM) *
      GAME_CONSTANTS.SPRITE_SCALE
    );
  }
}
