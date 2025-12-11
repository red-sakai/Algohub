"use client";

import { useEffect, useRef } from "react";
import Phaser from "phaser";

class DungeonScene extends Phaser.Scene {
  // Adjustable frame dimensions - modify these to fit your sprite
  private readonly FRAME_WIDTH: number = 64;
  private readonly FRAME_HEIGHT: number = 64;
  private readonly SPRITE_SCALE: number = 2;

  // Slash sprite dimensions (oversize frames)
  private readonly SLASH_FRAME_WIDTH: number = 192;
  private readonly SLASH_FRAME_HEIGHT: number = 192;

  // Map scale - increase to make map larger than viewport (simulates exploration)
  private readonly MAP_SCALE: number = 4;

  // Adjustable frame offsets (inset from edges)
  private readonly FRAME_OFFSET_TOP: number = 0;
  private readonly FRAME_OFFSET_BOTTOM: number = 30;
  private readonly FRAME_OFFSET_LEFT: number = 15;
  private readonly FRAME_OFFSET_RIGHT: number = 15;

  private player!: Phaser.GameObjects.Sprite;
  private map!: Phaser.GameObjects.Image;
  private debugBg!: Phaser.GameObjects.Rectangle;
  private debugInnerBg!: Phaser.GameObjects.Rectangle;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };
  private eKey!: Phaser.Input.Keyboard.Key;
  private playerSpeed: number = 200;
  private lastDirection: string = "down";
  private isSlashing: boolean = false;

  constructor() {
    super({ key: "DungeonScene" });
  }

  preload() {
    this.load.image("map", "/sprite/map.png");

    this.load.spritesheet("player-idle", "/sprite/idle.png", {
      frameWidth: this.FRAME_WIDTH,
      frameHeight: this.FRAME_HEIGHT,
    });

    this.load.spritesheet("player-run", "/sprite/run.png", {
      frameWidth: this.FRAME_WIDTH,
      frameHeight: this.FRAME_HEIGHT,
    });

    this.load.spritesheet("player-slash", "/sprite/slash_oversize.png", {
      frameWidth: this.SLASH_FRAME_WIDTH,
      frameHeight: this.SLASH_FRAME_HEIGHT,
    });
  }

  create() {
    const { width, height } = this.cameras.main;

    console.log("Create called - Viewport:", width, "x", height);

    // Add the map as background and scale it up to be larger than viewport
    this.map = this.add
      .image(0, 0, "map")
      .setOrigin(0, 0)
      .setScale(this.MAP_SCALE)
      .setDepth(0); // Map at bottom layer
    const mapWidth = this.map.displayWidth;
    const mapHeight = this.map.displayHeight;

    console.log("Map loaded:", this.map.texture.key);

    // Create player near the bottom center of the map (spawn point at entrance)
    const playerX = mapWidth / 2;
    const playerY = mapHeight * 0.85;

    this.player = this.add.sprite(playerX, playerY, "player-idle");
    this.player.setScale(this.SPRITE_SCALE);
    this.player.setOrigin(0.5, 0.5);
    this.player.setDepth(100); // High depth to ensure it's visible on top of map
    this.player.setVisible(true); // Explicitly ensure visibility

    console.log("Map size:", mapWidth, "x", mapHeight);
    console.log("Player created at:", playerX, playerY);
    console.log("Player visible:", this.player.visible);
    console.log("Player depth:", this.player.depth);

    // Set up camera to follow player smoothly across the map
    this.cameras.main.setBounds(0, 0, mapWidth, mapHeight);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setZoom(1);

    // Debug: Add red background to show original frame boundaries
    this.debugBg = this.add.rectangle(
      this.player.x,
      this.player.y,
      this.FRAME_WIDTH * this.SPRITE_SCALE,
      this.FRAME_HEIGHT * this.SPRITE_SCALE,
      0xff0000,
      0.3 // semi-transparent
    );
    this.debugBg.setStrokeStyle(2, 0xff0000); // Red border for original frame
    this.debugBg.setDepth(90); // Behind the player

    // Debug: Add green rectangle to show adjusted frame with offsets
    const adjustedWidth =
      (this.FRAME_WIDTH - this.FRAME_OFFSET_LEFT - this.FRAME_OFFSET_RIGHT) *
      this.SPRITE_SCALE;
    const adjustedHeight =
      (this.FRAME_HEIGHT - this.FRAME_OFFSET_TOP - this.FRAME_OFFSET_BOTTOM) *
      this.SPRITE_SCALE;
    const offsetX =
      ((this.FRAME_OFFSET_RIGHT - this.FRAME_OFFSET_LEFT) / 2) *
      this.SPRITE_SCALE;
    const offsetY =
      ((this.FRAME_OFFSET_BOTTOM - this.FRAME_OFFSET_TOP) / 2) *
      this.SPRITE_SCALE;

    this.debugInnerBg = this.add.rectangle(
      this.player.x + offsetX,
      this.player.y + offsetY,
      adjustedWidth,
      adjustedHeight,
      0x00ff00,
      0.3 // semi-transparent
    );
    this.debugInnerBg.setStrokeStyle(3, 0x00ff00); // Green border for adjusted frame
    this.debugInnerBg.setDepth(95); // Behind the player but above debug bg

    this.createAnimations();

    // Add instruction text (fixed to camera)

    // Debug: Display frame size info (fixed to camera)
    const collisionWidth =
      this.FRAME_WIDTH - this.FRAME_OFFSET_LEFT - this.FRAME_OFFSET_RIGHT;
    const collisionHeight =
      this.FRAME_HEIGHT - this.FRAME_OFFSET_TOP - this.FRAME_OFFSET_BOTTOM;

    this.add
      .text(
        16,
        520,
        `Map: ${Math.round(mapWidth)}x${Math.round(mapHeight)} (Scale: ${
          this.MAP_SCALE
        }x) | Viewport: ${width}x${height}\nSprite - Visual: ${
          this.FRAME_WIDTH
        }x${
          this.FRAME_HEIGHT
        } | Collision: ${collisionWidth}x${collisionHeight} | Scale: ${
          this.SPRITE_SCALE
        }x\nOffsets - T:${this.FRAME_OFFSET_TOP} B:${
          this.FRAME_OFFSET_BOTTOM
        } L:${this.FRAME_OFFSET_LEFT} R:${this.FRAME_OFFSET_RIGHT}`,
        {
          fontSize: "12px",
          color: "#ffffff",
          fontStyle: "bold",
          backgroundColor: "#000000",
          padding: { x: 8, y: 4 },
        }
      )
      .setScrollFactor(0)
      .setDepth(1000);

    // Debug: Legend (fixed to camera)
    this.add
      .text(16, 16, "🔴 Red = Visual Frame\n🟢 Green = Collision/Hitbox", {
        fontSize: "14px",
        color: "#ffffff",
        fontStyle: "bold",
        backgroundColor: "#000000",
        padding: { x: 8, y: 4 },
      })
      .setScrollFactor(0)
      .setDepth(1000);

    // Setup keyboard controls
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    this.eKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);
  }

  getCollisionWidth(): number {
    return (
      (this.FRAME_WIDTH - this.FRAME_OFFSET_LEFT - this.FRAME_OFFSET_RIGHT) *
      this.SPRITE_SCALE
    );
  }

  getCollisionHeight(): number {
    return (
      (this.FRAME_HEIGHT - this.FRAME_OFFSET_TOP - this.FRAME_OFFSET_BOTTOM) *
      this.SPRITE_SCALE
    );
  }

  createAnimations() {
    // Idle animations
    this.anims.create({
      key: "idle-up",
      frames: this.anims.generateFrameNumbers("player-idle", {
        start: 0,
        end: 1,
      }),
      frameRate: 4,
      repeat: -1,
    });

    this.anims.create({
      key: "idle-left",
      frames: this.anims.generateFrameNumbers("player-idle", {
        start: 2,
        end: 3,
      }),
      frameRate: 4,
      repeat: -1,
    });

    this.anims.create({
      key: "idle-down",
      frames: this.anims.generateFrameNumbers("player-idle", {
        start: 4,
        end: 5,
      }),
      frameRate: 4,
      repeat: -1,
    });

    this.anims.create({
      key: "idle-right",
      frames: this.anims.generateFrameNumbers("player-idle", {
        start: 6,
        end: 7,
      }),
      frameRate: 4,
      repeat: -1,
    });

    // Run animations
    this.anims.create({
      key: "run-up",
      frames: this.anims.generateFrameNumbers("player-run", {
        start: 0,
        end: 7,
      }),
      frameRate: 12,
      repeat: -1,
    });

    this.anims.create({
      key: "run-left",
      frames: this.anims.generateFrameNumbers("player-run", {
        start: 8,
        end: 15,
      }),
      frameRate: 12,
      repeat: -1,
    });

    this.anims.create({
      key: "run-down",
      frames: this.anims.generateFrameNumbers("player-run", {
        start: 16,
        end: 23,
      }),
      frameRate: 12,
      repeat: -1,
    });

    this.anims.create({
      key: "run-right",
      frames: this.anims.generateFrameNumbers("player-run", {
        start: 24,
        end: 31,
      }),
      frameRate: 12,
      repeat: -1,
    });

    // Slash animations
    this.anims.create({
      key: "slash-up",
      frames: this.anims.generateFrameNumbers("player-slash", {
        start: 0,
        end: 5,
      }),
      frameRate: 15,
      repeat: 0,
    });

    this.anims.create({
      key: "slash-left",
      frames: this.anims.generateFrameNumbers("player-slash", {
        start: 6,
        end: 11,
      }),
      frameRate: 15,
      repeat: 0,
    });

    this.anims.create({
      key: "slash-down",
      frames: this.anims.generateFrameNumbers("player-slash", {
        start: 12,
        end: 17,
      }),
      frameRate: 15,
      repeat: 0,
    });

    this.anims.create({
      key: "slash-right",
      frames: this.anims.generateFrameNumbers("player-slash", {
        start: 18,
        end: 23,
      }),
      frameRate: 15,
      repeat: 0,
    });

    this.player.play("idle-down");
  }

  update() {
    if (!this.player || !this.map) return;

    // Check for E key press to trigger slash
    if (Phaser.Input.Keyboard.JustDown(this.eKey) && !this.isSlashing) {
      this.performSlash();
      return;
    }

    // If slashing, don't process movement
    if (this.isSlashing) {
      return;
    }

    const mapWidth = this.map.displayWidth;
    const mapHeight = this.map.displayHeight;
    let velocityX = 0;
    let velocityY = 0;

    // Arrow keys
    if (this.cursors.left.isDown) {
      velocityX = -this.playerSpeed;
    }
    if (this.cursors.right.isDown) {
      velocityX = this.playerSpeed;
    }
    if (this.cursors.up.isDown) {
      velocityY = -this.playerSpeed;
    }
    if (this.cursors.down.isDown) {
      velocityY = this.playerSpeed;
    }

    // WASD keys
    if (this.wasd.W.isDown) {
      velocityY = -this.playerSpeed;
    }
    if (this.wasd.S.isDown) {
      velocityY = this.playerSpeed;
    }
    if (this.wasd.A.isDown) {
      velocityX = -this.playerSpeed;
    }
    if (this.wasd.D.isDown) {
      velocityX = this.playerSpeed;
    }

    // Normalize diagonal movement
    if (velocityX !== 0 && velocityY !== 0) {
      velocityX *= 0.707;
      velocityY *= 0.707;
    }

    const deltaTime = this.game.loop.delta / 1000;
    let newX = this.player.x + velocityX * deltaTime;
    let newY = this.player.y + velocityY * deltaTime;

    // Keep player within map boundaries using adjusted collision box
    const collisionHalfWidth = this.getCollisionWidth() / 2;
    const collisionHalfHeight = this.getCollisionHeight() / 2;

    newX = Phaser.Math.Clamp(
      newX,
      collisionHalfWidth,
      mapWidth - collisionHalfWidth
    );
    newY = Phaser.Math.Clamp(
      newY,
      collisionHalfHeight,
      mapHeight - collisionHalfHeight
    );

    // Update player position
    this.player.x = newX;
    this.player.y = newY;

    // Update debug background position to follow player
    this.debugBg.x = newX;
    this.debugBg.y = newY;

    // Update inner debug frame position
    const offsetX =
      ((this.FRAME_OFFSET_RIGHT - this.FRAME_OFFSET_LEFT) / 2) *
      this.SPRITE_SCALE;
    const offsetY =
      ((this.FRAME_OFFSET_BOTTOM - this.FRAME_OFFSET_TOP) / 2) *
      this.SPRITE_SCALE;
    this.debugInnerBg.x = newX + offsetX;
    this.debugInnerBg.y = newY + offsetY;

    // Handle animations
    if (velocityX !== 0 || velocityY !== 0) {
      if (Math.abs(velocityY) > Math.abs(velocityX)) {
        if (velocityY < 0) {
          this.lastDirection = "up";
          if (
            !this.player.anims.isPlaying ||
            this.player.anims.currentAnim?.key !== "run-up"
          ) {
            this.player.play("run-up", true);
          }
        } else if (velocityY > 0) {
          this.lastDirection = "down";
          if (
            !this.player.anims.isPlaying ||
            this.player.anims.currentAnim?.key !== "run-down"
          ) {
            this.player.play("run-down", true);
          }
        }
      } else {
        if (velocityX < 0) {
          this.lastDirection = "left";
          if (
            !this.player.anims.isPlaying ||
            this.player.anims.currentAnim?.key !== "run-left"
          ) {
            this.player.play("run-left", true);
          }
        } else if (velocityX > 0) {
          this.lastDirection = "right";
          if (
            !this.player.anims.isPlaying ||
            this.player.anims.currentAnim?.key !== "run-right"
          ) {
            this.player.play("run-right", true);
          }
        }
      }
    } else {
      const idleAnim = `idle-${this.lastDirection}`;
      const currentAnim = this.player.anims.currentAnim?.key;

      if (currentAnim !== idleAnim) {
        this.player.anims.stop();
        this.player.play(idleAnim, true);
      }
    }
  }

  performSlash() {
    this.isSlashing = true;
    const slashAnim = `slash-${this.lastDirection}`;

    this.player.play(slashAnim);

    // Listen for animation complete event
    this.player.once("animationcomplete", () => {
      this.isSlashing = false;
      // Return to idle animation after slash
      this.player.play(`idle-${this.lastDirection}`);
    });
  }
}

export default function DungeonGame() {
  const gameRef = useRef<Phaser.Game | null>(null);
  const parentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!parentRef.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 800,
      height: 600,
      parent: parentRef.current,
      backgroundColor: "#1a1a2e",
      scene: [DungeonScene],
      scale: {
        mode: Phaser.Scale.NONE,
        autoCenter: Phaser.Scale.NO_CENTER,
      },
      render: {
        antialias: false,
        pixelArt: true,
      },
    };

    gameRef.current = new Phaser.Game(config);

    return () => {
      gameRef.current?.destroy(true);
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-green-900 via-green-800 to-emerald-900 p-4">
      <div className="mb-4">
        <h1 className="text-4xl font-bold text-white text-center mb-2">
          Sprite Character Demo
        </h1>
        <p className="text-white/80 text-center">
          Move with WASD/Arrow Keys | Press E to Slash
        </p>
      </div>
      <div
        ref={parentRef}
        className="rounded-lg shadow-2xl overflow-hidden border-4 border-green-500"
      />
    </div>
  );
}
