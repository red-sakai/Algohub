"use client";

import { useEffect, useRef, useState } from "react";
import Phaser from "phaser";
import { Pixelify_Sans } from "next/font/google";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/app/components/ui/Carousel";

const pixelFont = Pixelify_Sans({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

class UltScene extends Phaser.Scene {
  private ultSprite!: Phaser.GameObjects.Sprite;
  private strikethroughLines!: Phaser.GameObjects.Graphics;
  private selectedCharacter: string = "goku";
  private lastDirection: string = "down";

  constructor() {
    super({ key: "UltScene" });
  }

  init(data: { character: string; direction: string }) {
    this.selectedCharacter = data.character || "goku";
    this.lastDirection = data.direction || "down";
  }

  preload() {
    // Load ult sprite if not already loaded
    if (!this.textures.exists("player-ult")) {
      this.load.spritesheet(
        "player-ult",
        `/sprite/characters/${this.selectedCharacter}/ult.png`,
        {
          frameWidth: 210,
          frameHeight: 103,
        }
      );
    }
  }

  create() {
    const { width, height } = this.cameras.main;

    // White background
    this.add.rectangle(0, 0, width, height, 0xffffff).setOrigin(0, 0);

    // Create strikethrough lines for dramatic effect
    this.strikethroughLines = this.add.graphics();
    this.strikethroughLines.lineStyle(4, 0x000000, 1);

    // Draw horizontal strikethrough lines
    const lineCount = 5;
    const spacing = height / (lineCount + 1);
    for (let i = 1; i <= lineCount; i++) {
      const y = spacing * i;
      this.strikethroughLines.lineBetween(0, y, width, y);
    }

    // Create ult animations if they don't exist
    if (!this.anims.exists("ult-up")) {
      this.anims.create({
        key: "ult-up",
        frames: this.anims.generateFrameNumbers("player-ult", {
          start: 0,
          end: 7,
        }),
        frameRate: 12,
        repeat: 0,
      });

      this.anims.create({
        key: "ult-left",
        frames: this.anims.generateFrameNumbers("player-ult", {
          start: 8,
          end: 15,
        }),
        frameRate: 12,
        repeat: 0,
      });

      this.anims.create({
        key: "ult-down",
        frames: this.anims.generateFrameNumbers("player-ult", {
          start: 16,
          end: 23,
        }),
        frameRate: 12,
        repeat: 0,
      });

      this.anims.create({
        key: "ult-right",
        frames: this.anims.generateFrameNumbers("player-ult", {
          start: 24,
          end: 31,
        }),
        frameRate: 12,
        repeat: 0,
      });
    }

    // Create and center the ult sprite
    this.ultSprite = this.add.sprite(width / 2, height / 2, "player-ult");
    this.ultSprite.setScale(2.5); // Larger scale for dramatic effect

    // Play the ult animation based on direction
    const ultAnim = `ult-${this.lastDirection}`;
    this.ultSprite.play(ultAnim);

    // Animate strikethrough lines appearing
    this.strikethroughLines.setAlpha(0);
    this.tweens.add({
      targets: this.strikethroughLines,
      alpha: 1,
      duration: 300,
      ease: "Power2",
    });

    // Listen for animation complete to return to game
    this.ultSprite.once("animationcomplete", () => {
      // Fade out effect before returning
      this.cameras.main.fadeOut(200, 255, 255, 255);
      this.cameras.main.once("camerafadeoutcomplete", () => {
        this.scene.stop("UltScene");
        this.scene.resume("DungeonScene");
      });
    });
  }
}

type EnemyUnit = {
  sprite: Phaser.Physics.Arcade.Sprite;
  shadow: Phaser.GameObjects.Ellipse;
  health: number;
  maxHealth: number;
  level: number;
  levelText: Phaser.GameObjects.Text;
  lastDirection: string;
  defeated: boolean;
  healthBarBg: Phaser.GameObjects.Graphics;
  healthBar: Phaser.GameObjects.Graphics;
  homeX: number;
  homeY: number;
  attackCooldownMs: number;
  attackCooldownRemaining: number;
  attacking: boolean;
};

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
  private readonly FRAME_OFFSET_LEFT: number = 20;
  private readonly FRAME_OFFSET_RIGHT: number = 20;

  // Lighting and torch system
  private readonly BASE_VISION_RADIUS: number = 120;
  private readonly TORCH_VISION_BONUS: number = 80;
  private readonly TORCH_DURATION: number = 15000; // 15 seconds per torch
  private readonly MAX_TORCHES: number = 5;

  // Leveling
  private playerLevel: number = 1;

  // Player health system
  private playerHealth: number = 100;
  private playerMaxHealth: number = 100;
  private playerHealthBar!: Phaser.GameObjects.Graphics;
  private playerHealthBarBg!: Phaser.GameObjects.Graphics;
  private playerHealthText!: Phaser.GameObjects.Text;

  private player!: Phaser.Physics.Arcade.Sprite;
  private playerShadow!: Phaser.GameObjects.Ellipse;
  private mapContainer!: Phaser.GameObjects.Container;
  private mapWidth!: number;
  private mapHeight!: number;
  private debugBg!: Phaser.GameObjects.Rectangle;
  private debugInnerBg!: Phaser.GameObjects.Rectangle;
  private wallColliders!: Phaser.Physics.Arcade.StaticGroup;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };
  private eKey!: Phaser.Input.Keyboard.Key;
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private qKey!: Phaser.Input.Keyboard.Key;
  private debugKey!: Phaser.Input.Keyboard.Key;
  private playerSpeed: number = 200;
  private lastDirection: string = "down";
  private isSlashing: boolean = false;
  private isJumping: boolean = false;
  private selectedCharacter: string = "gojo";
  private debugMode: boolean = false;
  private enemyLevels: number[] = [];
  private mapName: string = "map.json";
  private initData: {
    character: string;
    enemyLevels?: number[];
    mapName?: string;
  } = { character: "gojo" };

  // Lighting system
  private darknessOverlay!: Phaser.GameObjects.Graphics;
  private lightMask!: Phaser.GameObjects.Graphics;
  private renderTexture!: Phaser.GameObjects.RenderTexture;
  private currentVisionRadius: number = 120;
  private torchCount: number = 0;
  private torchTimeRemaining: number = 0;
  private torchText!: Phaser.GameObjects.Text;
  private torchTimerText!: Phaser.GameObjects.Text;
  private playerLevelText!: Phaser.GameObjects.Text;
  private torches!: Phaser.Physics.Arcade.Group;
  private torchGlowSprites: Phaser.GameObjects.Sprite[] = [];

  // Enemy system
  private nodes: Array<{ x: number; y: number }> = [];
  private enemies: EnemyUnit[] = [];
  private enemySpeed: number = 80;
  private enemyVsEnemyColliders: Phaser.Physics.Arcade.Collider[] = [];
  private enemyVsPlayerColliders: Phaser.Physics.Arcade.Collider[] = [];

  // Collectibles system
  private collectibles!: Phaser.Physics.Arcade.Group;
  private attackSpeedMultiplier: number = 1;
  private attackSpeedBuffTimer: number = 0;
  private speedBoostMultiplier: number = 1;
  private speedBoostTimer: number = 0;

  constructor() {
    super({ key: "DungeonScene" });
  }

  init(data: { character: string; enemyLevels?: number[]; mapName?: string }) {
    // Store init data for restart
    this.initData = data;

    if (data.character) {
      this.selectedCharacter = data.character;
    }
    if (data.enemyLevels) {
      this.enemyLevels = data.enemyLevels;
      // Set player level to minimum of entered levels
      this.playerLevel = Math.min(...data.enemyLevels);
      // Set player health based on starting level
      this.playerMaxHealth = 100 + (this.playerLevel - 1) * 10;
      this.playerHealth = this.playerMaxHealth;
    }
    this.mapName = data.mapName || "map.json";
  }

  preload() {
    // Load the custom tilemap JSON and tileset spritesheet
    this.load.json("tilemap", `/sprite/map/${this.mapName}`);
    this.load.spritesheet("tiles", "/sprite/map/spritesheet.png", {
      frameWidth: 16,
      frameHeight: 16,
    });

    this.load.spritesheet(
      "player-idle",
      `/sprite/characters/${this.selectedCharacter}/idle.png`,
      {
        frameWidth: this.FRAME_WIDTH,
        frameHeight: this.FRAME_HEIGHT,
      }
    );

    this.load.spritesheet(
      "player-run",
      `/sprite/characters/${this.selectedCharacter}/run.png`,
      {
        frameWidth: this.FRAME_WIDTH,
        frameHeight: this.FRAME_HEIGHT,
      }
    );

    // Load character-specific skill sprite
    if (this.selectedCharacter === "goku") {
      this.load.spritesheet(
        "player-skill",
        `/sprite/characters/${this.selectedCharacter}/spellcast.png`,
        {
          frameWidth: this.FRAME_WIDTH,
          frameHeight: this.FRAME_HEIGHT,
        }
      );
    } else if (this.selectedCharacter === "ferd") {
      this.load.spritesheet(
        "player-skill",
        `/sprite/characters/${this.selectedCharacter}/thrust_oversize.png`,
        {
          frameWidth: this.SLASH_FRAME_WIDTH,
          frameHeight: this.SLASH_FRAME_HEIGHT,
        }
      );
    } else {
      this.load.spritesheet(
        "player-skill",
        `/sprite/characters/${this.selectedCharacter}/slash_oversize.png`,
        {
          frameWidth: this.SLASH_FRAME_WIDTH,
          frameHeight: this.SLASH_FRAME_HEIGHT,
        }
      );
    }

    this.load.spritesheet(
      "player-jump",
      `/sprite/characters/${this.selectedCharacter}/jump.png`,
      {
        frameWidth: this.FRAME_WIDTH,
        frameHeight: this.FRAME_HEIGHT,
      }
    );

    // Load Ferdinand as enemy
    this.load.spritesheet("enemy-idle", "/sprite/characters/ferd/idle.png", {
      frameWidth: this.FRAME_WIDTH,
      frameHeight: this.FRAME_HEIGHT,
    });

    this.load.spritesheet("enemy-run", "/sprite/characters/ferd/run.png", {
      frameWidth: this.FRAME_WIDTH,
      frameHeight: this.FRAME_HEIGHT,
    });

    this.load.spritesheet(
      "enemy-attack",
      "/sprite/characters/ferd/thrust_oversize.png",
      {
        frameWidth: this.SLASH_FRAME_WIDTH,
        frameHeight: this.SLASH_FRAME_HEIGHT,
      }
    );

    this.load.spritesheet("enemy-hurt", "/sprite/characters/ferd/hurt.png", {
      frameWidth: this.FRAME_WIDTH,
      frameHeight: this.FRAME_HEIGHT,
    });

    // Create a simple torch texture if it doesn't exist
    if (!this.textures.exists("torch")) {
      const graphics = this.add.graphics();
      graphics.fillStyle(0xffaa00, 1);
      graphics.fillCircle(8, 8, 6);
      graphics.fillStyle(0xffff00, 1);
      graphics.fillCircle(8, 8, 3);
      graphics.generateTexture("torch", 16, 16);
      graphics.destroy();
    }
  }

  create() {
    const { width, height } = this.cameras.main;

    console.log("Create called - Viewport:", width, "x", height);

    // Add a background color to see the canvas
    this.add
      .rectangle(0, 0, 10000, 10000, 0x000000)
      .setOrigin(0, 0)
      .setDepth(-1);

    // Load the custom tilemap JSON
    const mapData = this.cache.json.get("tilemap");

    if (!mapData) {
      console.error("Failed to load tilemap JSON!");
      return;
    }

    console.log("Map data loaded:", mapData);

    const tileSize = mapData.tileSize;
    const mapWidthInTiles = mapData.mapWidth;
    const mapHeightInTiles = mapData.mapHeight;

    // Calculate map dimensions (in pixels after scaling)
    this.mapWidth = mapWidthInTiles * tileSize * this.MAP_SCALE;
    this.mapHeight = mapHeightInTiles * tileSize * this.MAP_SCALE;

    console.log(
      "Tilemap loaded - Size:",
      this.mapWidth,
      "x",
      this.mapHeight,
      "Tiles:",
      mapWidthInTiles,
      "x",
      mapHeightInTiles
    );

    // Create a container to hold all map tiles
    this.mapContainer = this.add.container(0, 0);
    this.mapContainer.setDepth(0);

    // Check if tileset is loaded
    if (!this.textures.exists("tiles")) {
      console.error("Tileset 'tiles' not loaded!");
      return;
    }

    console.log(
      "Tileset loaded, frames:",
      this.textures.get("tiles").frameTotal
    );

    // Create physics group for wall colliders
    this.wallColliders = this.physics.add.staticGroup();

    // Define proper rendering order (bottom to top)
    // This ensures decorative elements appear above base layers
    const layerRenderOrder = [
      "Floor", // 0 - Base floor
      "floors", // 1 - Floor decorations
      "Walls", // 2 - Base walls
      "Walls sides", // 3 - Wall side decorations
      "Walls (Copy)", // 4 - Wall copy layer
      "Walls pillars", // 5 - Wall pillars
      "Traps", // 6 - Trap tiles
      "Gargoyles", // 7 - Gargoyle decorations
      "Pickups", // 8 - Pickup items
      "Miscs", // 9 - Miscellaneous decorations (chests, etc)
      "nodes", // 10 - Path nodes
      "Layer_9", // 11 - Empty layer
    ];

    // Create a map of layers by name for easy lookup
    const layerMap = new Map<
      string,
      {
        name: string;
        tiles: Array<{ x: number; y: number; id: string }>;
        collider?: boolean;
      }
    >();
    mapData.layers.forEach(
      (layer: {
        name: string;
        tiles: Array<{ x: number; y: number; id: string }>;
        collider?: boolean;
      }) => {
        layerMap.set(layer.name, layer);
      }
    );

    // Render each layer in the correct order
    let totalTiles = 0;
    let totalColliders = 0;
    const DEPTH_PER_LAYER = 10; // Reserve 10 depth levels per layer

    // First, render layers in the predefined order
    const renderedLayers = new Set<string>();

    layerRenderOrder.forEach((layerName: string, renderIndex: number) => {
      const layer = layerMap.get(layerName);
      if (!layer) {
        console.warn(`Layer "${layerName}" not found in map data`);
        return;
      }

      renderedLayers.add(layerName);
      console.log(
        `Rendering layer ${renderIndex}: ${layer.name}, tiles: ${layer.tiles.length}, collider: ${layer.collider}`
      );

      layer.tiles.forEach((tile: { x: number; y: number; id: string }) => {
        const x = tile.x * tileSize * this.MAP_SCALE;
        const y = tile.y * tileSize * this.MAP_SCALE;
        const tileId = parseInt(tile.id, 10);

        // Skip if tile ID is invalid
        if (isNaN(tileId)) {
          console.warn(`Invalid tile ID: ${tile.id} at (${tile.x}, ${tile.y})`);
          return;
        }

        const tileSprite = this.add.sprite(x, y, "tiles", tileId);
        tileSprite.setOrigin(0, 0);
        tileSprite.setScale(this.MAP_SCALE);
        // Give each layer a depth based on render order
        tileSprite.setDepth(renderIndex * DEPTH_PER_LAYER);
        totalTiles++;

        // Add collision based on the layer's collider flag from JSON
        // Exclude "nodes" layer even if it has collider flag
        if (layer.collider === true && layer.name !== "nodes") {
          // Create a static physics body for collision
          const collider = this.add.rectangle(
            x + (tileSize * this.MAP_SCALE) / 2,
            y + (tileSize * this.MAP_SCALE) / 2,
            tileSize * this.MAP_SCALE,
            tileSize * this.MAP_SCALE,
            0xff0000,
            0
          );

          // Add physics to the rectangle and make it static
          this.physics.add.existing(collider, true);
          const body = collider.body as Phaser.Physics.Arcade.StaticBody;
          body.updateFromGameObject();

          collider.setVisible(false);
          this.wallColliders.add(collider);
          totalColliders++;
        }
      });
    });

    // Render any remaining layers that weren't in the predefined order
    mapData.layers.forEach(
      (layer: {
        name: string;
        tiles: Array<{ x: number; y: number; id: string }>;
        collider?: boolean;
      }) => {
        // Skip if already rendered
        if (renderedLayers.has(layer.name)) {
          return;
        }

        // Skip empty layers
        if (!layer.tiles || layer.tiles.length === 0) {
          return;
        }

        console.log(
          `Rendering additional layer: ${layer.name}, tiles: ${layer.tiles.length}, collider: ${layer.collider}`
        );

        // Use a default depth for unknown layers (after all predefined layers)
        const defaultDepth = layerRenderOrder.length * DEPTH_PER_LAYER;

        layer.tiles.forEach((tile: { x: number; y: number; id: string }) => {
          const x = tile.x * tileSize * this.MAP_SCALE;
          const y = tile.y * tileSize * this.MAP_SCALE;
          const tileId = parseInt(tile.id, 10);

          // Skip if tile ID is invalid
          if (isNaN(tileId)) {
            console.warn(
              `Invalid tile ID: ${tile.id} at (${tile.x}, ${tile.y})`
            );
            return;
          }

          const tileSprite = this.add.sprite(x, y, "tiles", tileId);
          tileSprite.setOrigin(0, 0);
          tileSprite.setScale(this.MAP_SCALE);
          tileSprite.setDepth(defaultDepth);
          totalTiles++;

          // Add collision based on the layer's collider flag from JSON
          // Exclude "nodes" layer even if it has collider flag
          if (layer.collider === true && layer.name !== "nodes") {
            // Create a static physics body for collision
            const collider = this.add.rectangle(
              x + (tileSize * this.MAP_SCALE) / 2,
              y + (tileSize * this.MAP_SCALE) / 2,
              tileSize * this.MAP_SCALE,
              tileSize * this.MAP_SCALE,
              0xff0000,
              0
            );

            // Add physics to the rectangle and make it static
            this.physics.add.existing(collider, true);
            const body = collider.body as Phaser.Physics.Arcade.StaticBody;
            body.updateFromGameObject();

            collider.setVisible(false);
            this.wallColliders.add(collider);
            totalColliders++;
          }
        });
      }
    );

    console.log(`Total tiles rendered: ${totalTiles}`);
    console.log(`Total wall colliders created: ${totalColliders}`);
    console.log(`Wall colliders in group: ${this.wallColliders.getLength()}`);

    // Find the nodes layer to spawn the player at the first node
    const nodesLayer = mapData.layers.find(
      (layer: {
        name: string;
        tiles: Array<{ x: number; y: number; id: string }>;
      }) => layer.name === "nodes"
    );
    let playerX = this.mapWidth * 0.5; // Default to center
    let playerY = this.mapHeight * 0.5;

    if (nodesLayer && nodesLayer.tiles.length > 0) {
      // Sort nodes from top-most to bottom-most (then left to right) so the first entry is the top node
      const sortedNodes = [...nodesLayer.tiles].sort((a, b) => {
        if (a.y !== b.y) return a.y - b.y;
        return a.x - b.x;
      });

      // Store all nodes for enemy pathfinding using the sorted order
      this.nodes = sortedNodes.map((node: { x: number; y: number }) => ({
        x: (node.x + 0.5) * tileSize * this.MAP_SCALE,
        y: (node.y + 0.5) * tileSize * this.MAP_SCALE,
      }));

      // Spawn at the top-most node
      const firstNode = sortedNodes[0];
      // Convert tile coordinates to world coordinates
      // Add half a tile size to center on the tile, then scale
      playerX = (firstNode.x + 0.5) * tileSize * this.MAP_SCALE;
      playerY = (firstNode.y + 0.5) * tileSize * this.MAP_SCALE;
      console.log(
        `Player spawning at first node: tile (${firstNode.x}, ${firstNode.y}) -> world (${playerX}, ${playerY})`
      );
    }

    // Create shadow underneath the player
    // Player sprite is 64px tall * 2 scale = 128px, origin at center means feet are ~55px below center
    const shadowOffset = (this.FRAME_HEIGHT * this.SPRITE_SCALE) / 2 - 10; // At the feet
    this.playerShadow = this.add.ellipse(
      playerX,
      playerY + shadowOffset,
      50, // Width
      20, // Height (smaller for perspective)
      0x000000,
      0.3 // More visible
    );
    this.playerShadow.setDepth(1000); // Just below player
    this.playerShadow.setVisible(true); // Explicitly set visible

    // Create player as a physics sprite
    this.player = this.physics.add.sprite(playerX, playerY, "player-idle");
    this.player.setScale(this.SPRITE_SCALE);
    this.player.setOrigin(0.5, 0.5);
    this.player.setDepth(1001); // High depth to ensure it's visible on top of map
    this.player.setVisible(true); // Explicitly ensure visibility

    // Set up player physics body with adjusted collision box
    const bodyWidth = this.getCollisionWidth();
    const bodyHeight = this.getCollisionHeight();
    const physicsBody = this.player.body as Phaser.Physics.Arcade.Body;

    physicsBody.setSize(
      bodyWidth / this.SPRITE_SCALE,
      bodyHeight / this.SPRITE_SCALE
    );

    // Offset the collision body to match the character's feet
    const bodyOffsetY = (this.FRAME_OFFSET_BOTTOM - this.FRAME_OFFSET_TOP) / 2;
    physicsBody.setOffset(
      (this.FRAME_WIDTH - bodyWidth / this.SPRITE_SCALE) / 2,
      (this.FRAME_HEIGHT - bodyHeight / this.SPRITE_SCALE) / 2 + bodyOffsetY
    );

    // Configure physics properties for smooth collision
    this.player.setCollideWorldBounds(false);
    physicsBody.setMaxVelocity(this.playerSpeed, this.playerSpeed);
    physicsBody.setDrag(600, 600); // Reduced drag for better responsiveness
    physicsBody.setAllowGravity(false);
    physicsBody.setImmovable(false); // Player should be pushable by collision

    // Add collision between player and walls
    const collisionHandler = this.physics.add.collider(
      this.player,
      this.wallColliders
    );

    console.log("=== COLLISION SETUP ===");
    console.log("Collision handler created:", !!collisionHandler);
    console.log("Wall colliders in group:", this.wallColliders.getLength());
    console.log("Player body exists:", !!this.player.body);
    console.log(
      "Player body size:",
      physicsBody.width,
      "x",
      physicsBody.height
    );
    console.log("=====================");

    console.log("Map size:", this.mapWidth, "x", this.mapHeight);
    console.log("Player created at:", playerX, playerY);
    console.log("Player visible:", this.player.visible);
    console.log("Player depth:", this.player.depth);

    // Set up camera to follow player smoothly across the map
    this.cameras.main.setBounds(0, 0, this.mapWidth, this.mapHeight);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setZoom(1);

    // Create enemies at every node (skip the spawn node)
    this.createEnemiesAtNodes();

    // Create torches scattered around the map
    this.torches = this.physics.add.group();
    this.createTorches();

    // Add collision between player and torches
    this.physics.add.overlap(
      this.player,
      this.torches,
      this.collectTorch,
      undefined,
      this
    );

    // Create collectibles scattered around the map
    this.collectibles = this.physics.add.group();
    this.createCollectibles();

    // Add collision between player and collectibles
    this.physics.add.overlap(
      this.player,
      this.collectibles,
      this.collectItem,
      undefined,
      this
    );

    // Create lighting system
    this.setupLighting();

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
    this.debugBg.setDepth(900); // Behind the player

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
    this.debugInnerBg.setDepth(950); // Behind the player but above debug bg

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
        `Map: ${Math.round(this.mapWidth)}x${Math.round(
          this.mapHeight
        )} (Scale: ${
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
          fontFamily: "'Pixelify Sans', monospace",
          fontSize: "10px",
          color: "#ffffff",
          backgroundColor: "#000000",
          padding: { x: 8, y: 4 },
        }
      )
      .setScrollFactor(0)
      .setDepth(1000);

    // Debug: Legend (fixed to camera)
    this.add
      .text(16, 16, "Red = Visual Frame\nGreen = Collision/Hitbox", {
        fontFamily: "'Pixelify Sans', monospace",
        fontSize: "12px",
        color: "#ffffff",
        backgroundColor: "#000000",
        padding: { x: 8, y: 4 },
      })
      .setScrollFactor(0)
      .setDepth(1000);

    this.debugBg.setVisible(false);
    this.debugInnerBg.setVisible(false);

    // Torch UI - positioned at top center
    this.torchText = this.add
      .text(width / 2, 20, "Torches: 0", {
        fontFamily: "'Pixelify Sans', monospace",
        fontSize: "18px",
        color: "#ffaa00",
        backgroundColor: "#000000",
        padding: { x: 12, y: 6 },
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(10000);

    this.torchTimerText = this.add
      .text(width / 2, 55, "", {
        fontFamily: "'Pixelify Sans', monospace",
        fontSize: "14px",
        color: "#ffff00",
        backgroundColor: "#000000",
        padding: { x: 10, y: 4 },
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(10000);

    // Player level UI - top-left
    this.playerLevelText = this.add
      .text(16, 90, `Level: ${this.playerLevel}`, {
        fontFamily: "'Pixelify Sans', monospace",
        fontSize: "16px",
        color: "#00ffcc",
        backgroundColor: "#000000",
        padding: { x: 10, y: 6 },
      })
      .setScrollFactor(0)
      .setDepth(10000);

    // Player health bar - top-left below level
    this.playerHealthBarBg = this.add
      .graphics()
      .setDepth(10000)
      .setScrollFactor(0);
    this.playerHealthBar = this.add
      .graphics()
      .setDepth(10001)
      .setScrollFactor(0);

    this.playerHealthText = this.add
      .text(16, 130, `HP: ${this.playerHealth}/${this.playerMaxHealth}`, {
        fontFamily: "'Pixelify Sans', monospace",
        fontSize: "14px",
        color: "#ff5555",
        backgroundColor: "#000000",
        padding: { x: 8, y: 4 },
      })
      .setScrollFactor(0)
      .setDepth(10000);

    this.updatePlayerHealthBar();

    // Initialize torch count and vision
    this.currentVisionRadius = this.BASE_VISION_RADIUS;
    this.torchCount = 0;
    this.torchTimeRemaining = 0;

    // Setup keyboard controls
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    this.eKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.spaceKey = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE
    );
    this.qKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
    this.debugKey = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.F
    );
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

    // Skill animations (slash for Gojo, spellcast for Goku)
    if (this.selectedCharacter === "goku") {
      // Spellcast animations for Goku
      this.anims.create({
        key: "skill-up",
        frames: this.anims.generateFrameNumbers("player-skill", {
          start: 0,
          end: 6,
        }),
        frameRate: 12,
        repeat: 0,
      });

      this.anims.create({
        key: "skill-left",
        frames: this.anims.generateFrameNumbers("player-skill", {
          start: 7,
          end: 13,
        }),
        frameRate: 12,
        repeat: 0,
      });

      this.anims.create({
        key: "skill-down",
        frames: this.anims.generateFrameNumbers("player-skill", {
          start: 14,
          end: 20,
        }),
        frameRate: 12,
        repeat: 0,
      });

      this.anims.create({
        key: "skill-right",
        frames: this.anims.generateFrameNumbers("player-skill", {
          start: 21,
          end: 27,
        }),
        frameRate: 12,
        repeat: 0,
      });
    } else {
      // Slash animations for Gojo
      this.anims.create({
        key: "skill-up",
        frames: this.anims.generateFrameNumbers("player-skill", {
          start: 0,
          end: 5,
        }),
        frameRate: 15,
        repeat: 0,
      });

      this.anims.create({
        key: "skill-left",
        frames: this.anims.generateFrameNumbers("player-skill", {
          start: 6,
          end: 11,
        }),
        frameRate: 15,
        repeat: 0,
      });

      this.anims.create({
        key: "skill-down",
        frames: this.anims.generateFrameNumbers("player-skill", {
          start: 12,
          end: 17,
        }),
        frameRate: 15,
        repeat: 0,
      });

      this.anims.create({
        key: "skill-right",
        frames: this.anims.generateFrameNumbers("player-skill", {
          start: 18,
          end: 23,
        }),
        frameRate: 15,
        repeat: 0,
      });
    }

    // Jump animations
    this.anims.create({
      key: "jump-up",
      frames: this.anims.generateFrameNumbers("player-jump", {
        start: 0,
        end: 4,
      }),
      frameRate: 12,
      repeat: 0,
    });

    this.anims.create({
      key: "jump-left",
      frames: this.anims.generateFrameNumbers("player-jump", {
        start: 5,
        end: 9,
      }),
      frameRate: 12,
      repeat: 0,
    });

    this.anims.create({
      key: "jump-down",
      frames: this.anims.generateFrameNumbers("player-jump", {
        start: 10,
        end: 14,
      }),
      frameRate: 12,
      repeat: 0,
    });

    this.anims.create({
      key: "jump-right",
      frames: this.anims.generateFrameNumbers("player-jump", {
        start: 15,
        end: 19,
      }),
      frameRate: 12,
      repeat: 0,
    });

    // Enemy (Ferdinand) animations
    this.anims.create({
      key: "enemy-idle-up",
      frames: this.anims.generateFrameNumbers("enemy-idle", {
        start: 0,
        end: 1,
      }),
      frameRate: 4,
      repeat: -1,
    });

    this.anims.create({
      key: "enemy-idle-left",
      frames: this.anims.generateFrameNumbers("enemy-idle", {
        start: 2,
        end: 3,
      }),
      frameRate: 4,
      repeat: -1,
    });

    this.anims.create({
      key: "enemy-idle-down",
      frames: this.anims.generateFrameNumbers("enemy-idle", {
        start: 4,
        end: 5,
      }),
      frameRate: 4,
      repeat: -1,
    });

    this.anims.create({
      key: "enemy-idle-right",
      frames: this.anims.generateFrameNumbers("enemy-idle", {
        start: 6,
        end: 7,
      }),
      frameRate: 4,
      repeat: -1,
    });

    this.anims.create({
      key: "enemy-run-up",
      frames: this.anims.generateFrameNumbers("enemy-run", {
        start: 0,
        end: 7,
      }),
      frameRate: 12,
      repeat: -1,
    });

    this.anims.create({
      key: "enemy-run-left",
      frames: this.anims.generateFrameNumbers("enemy-run", {
        start: 8,
        end: 15,
      }),
      frameRate: 12,
      repeat: -1,
    });

    this.anims.create({
      key: "enemy-run-down",
      frames: this.anims.generateFrameNumbers("enemy-run", {
        start: 16,
        end: 23,
      }),
      frameRate: 12,
      repeat: -1,
    });

    this.anims.create({
      key: "enemy-run-right",
      frames: this.anims.generateFrameNumbers("enemy-run", {
        start: 24,
        end: 31,
      }),
      frameRate: 12,
      repeat: -1,
    });

    this.anims.create({
      key: "enemy-attack-up",
      frames: this.anims.generateFrameNumbers("enemy-attack", {
        start: 0,
        end: 5,
      }),
      frameRate: 15,
      repeat: 0,
    });

    this.anims.create({
      key: "enemy-attack-left",
      frames: this.anims.generateFrameNumbers("enemy-attack", {
        start: 6,
        end: 11,
      }),
      frameRate: 15,
      repeat: 0,
    });

    this.anims.create({
      key: "enemy-attack-down",
      frames: this.anims.generateFrameNumbers("enemy-attack", {
        start: 12,
        end: 17,
      }),
      frameRate: 15,
      repeat: 0,
    });

    this.anims.create({
      key: "enemy-attack-right",
      frames: this.anims.generateFrameNumbers("enemy-attack", {
        start: 18,
        end: 23,
      }),
      frameRate: 15,
      repeat: 0,
    });

    // Enemy hurt animation
    this.anims.create({
      key: "enemy-hurt",
      frames: this.anims.generateFrameNumbers("enemy-hurt", {
        start: 0,
        end: 5,
      }),
      frameRate: 12,
      repeat: 0,
    });

    this.player.play("idle-down");
  }

  update(time: number, delta: number) {
    if (!this.player || !this.mapContainer) return;

    // If player is dead, don't update gameplay
    if (this.playerHealth <= 0) return;

    // Update enemies AI/health bars
    this.updateEnemies(delta);

    // Update torch timer
    if (this.torchTimeRemaining > 0) {
      this.torchTimeRemaining -= delta;
      if (this.torchTimeRemaining < 0) {
        this.torchTimeRemaining = 0;
      }

      // Update torch timer UI
      const secondsRemaining = Math.ceil(this.torchTimeRemaining / 1000);
      this.torchTimerText.setText(`Light Time: ${secondsRemaining}s`);

      // Change color based on remaining time
      if (secondsRemaining <= 3) {
        this.torchTimerText.setColor("#ff0000"); // Red when low
      } else if (secondsRemaining <= 7) {
        this.torchTimerText.setColor("#ff8800"); // Orange when medium
      } else {
        this.torchTimerText.setColor("#ffff00"); // Yellow when high
      }
    } else {
      this.torchTimerText.setText("");
    }

    // Update buff timers
    if (this.attackSpeedBuffTimer > 0) {
      this.attackSpeedBuffTimer -= delta;
      if (this.attackSpeedBuffTimer <= 0) {
        this.attackSpeedBuffTimer = 0;
        this.attackSpeedMultiplier = 1;

        // Show buff ended notification
        const buffEndText = this.add
          .text(
            this.cameras.main.scrollX + this.cameras.main.width / 2,
            this.cameras.main.scrollY + 100,
            "Attack Speed Buff Ended",
            {
              fontFamily: "'Pixelify Sans', monospace",
              fontSize: "14px",
              color: "#ff0000",
              backgroundColor: "#000000",
              padding: { x: 8, y: 4 },
            }
          )
          .setOrigin(0.5)
          .setDepth(10002);

        this.tweens.add({
          targets: buffEndText,
          alpha: 0,
          duration: 1000,
          onComplete: () => buffEndText.destroy(),
        });
      }
    }

    if (this.speedBoostTimer > 0) {
      this.speedBoostTimer -= delta;
      if (this.speedBoostTimer <= 0) {
        this.speedBoostTimer = 0;
        this.speedBoostMultiplier = 1;

        // Show buff ended notification
        const buffEndText = this.add
          .text(
            this.cameras.main.scrollX + this.cameras.main.width / 2,
            this.cameras.main.scrollY + 100,
            "Speed Boost Ended",
            {
              fontFamily: "'Pixelify Sans', monospace",
              fontSize: "14px",
              color: "#00aaff",
              backgroundColor: "#000000",
              padding: { x: 8, y: 4 },
            }
          )
          .setOrigin(0.5)
          .setDepth(10002);

        this.tweens.add({
          targets: buffEndText,
          alpha: 0,
          duration: 1000,
          onComplete: () => buffEndText.destroy(),
        });
      }
    }

    // Update the lighting effect every frame
    this.updateLighting();

    // Check for F key press to toggle debug mode
    if (Phaser.Input.Keyboard.JustDown(this.debugKey)) {
      this.debugMode = !this.debugMode;
      this.debugBg.setVisible(this.debugMode);
      this.debugInnerBg.setVisible(this.debugMode);

      // Toggle visibility of all wall colliders
      this.wallColliders
        .getChildren()
        .forEach((collider: Phaser.GameObjects.GameObject) => {
          const rect = collider as Phaser.GameObjects.Rectangle;
          if (this.debugMode) {
            rect.setAlpha(0.5);
            rect.setFillStyle(0xff0000, 0.5);
            rect.setStrokeStyle(2, 0xff0000, 1);
            rect.setVisible(true);
          } else {
            rect.setVisible(false);
          }
        });

      console.log(`Debug mode: ${this.debugMode ? "ON" : "OFF"}`);
    }

    // Check for E key press to trigger slash
    if (
      Phaser.Input.Keyboard.JustDown(this.eKey) &&
      !this.isSlashing &&
      !this.isJumping
    ) {
      this.performSlash();
      return;
    }

    // Check for spacebar press to trigger jump
    if (
      Phaser.Input.Keyboard.JustDown(this.spaceKey) &&
      !this.isJumping &&
      !this.isSlashing
    ) {
      this.performJump();
    }

    // Check for Q key press to trigger ult (goku only)
    if (
      this.selectedCharacter === "goku" &&
      Phaser.Input.Keyboard.JustDown(this.qKey) &&
      !this.isJumping &&
      !this.isSlashing
    ) {
      this.performUlt();
      return;
    }

    // If slashing or jumping, stop movement
    if (this.isSlashing || this.isJumping) {
      this.player.setVelocity(0, 0);
      this.player.setAcceleration(0, 0);
      return;
    }

    let moveX = 0;
    let moveY = 0;

    // Arrow keys
    if (this.cursors.left.isDown) {
      moveX = -1;
    }
    if (this.cursors.right.isDown) {
      moveX = 1;
    }
    if (this.cursors.up.isDown) {
      moveY = -1;
    }
    if (this.cursors.down.isDown) {
      moveY = 1;
    }

    // WASD keys
    if (this.wasd.W.isDown) {
      moveY = -1;
    }
    if (this.wasd.S.isDown) {
      moveY = 1;
    }
    if (this.wasd.A.isDown) {
      moveX = -1;
    }
    if (this.wasd.D.isDown) {
      moveX = 1;
    }

    // Normalize diagonal movement
    if (moveX !== 0 && moveY !== 0) {
      moveX *= 0.707;
      moveY *= 0.707;
    }

    // Set velocity directly for responsive movement (with speed boost if active)
    const velocityX = moveX * this.playerSpeed * this.speedBoostMultiplier;
    const velocityY = moveY * this.playerSpeed * this.speedBoostMultiplier;
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

    // Update shadow position to follow player (at the feet)
    const shadowOffset = (this.FRAME_HEIGHT * this.SPRITE_SCALE) / 2 - 10;
    this.playerShadow.x = this.player.x;
    this.playerShadow.y = this.player.y + shadowOffset;

    // Update debug background position to follow player
    this.debugBg.x = this.player.x;
    this.debugBg.y = this.player.y;

    // Update inner debug frame position
    const debugOffsetX =
      ((this.FRAME_OFFSET_RIGHT - this.FRAME_OFFSET_LEFT) / 2) *
      this.SPRITE_SCALE;
    const debugOffsetY =
      ((this.FRAME_OFFSET_BOTTOM - this.FRAME_OFFSET_TOP) / 2) *
      this.SPRITE_SCALE;
    this.debugInnerBg.x = this.player.x + debugOffsetX;
    this.debugInnerBg.y = this.player.y + debugOffsetY;

    // Handle animations (skip if jumping, as jump animation should play)
    if (!this.isJumping) {
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
              this.player.play("run-up", true);
            }
          } else if (currentVelY > 0) {
            this.lastDirection = "down";
            if (
              !this.player.anims.isPlaying ||
              this.player.anims.currentAnim?.key !== "run-down"
            ) {
              this.player.play("run-down", true);
            }
          }
        } else {
          if (currentVelX < 0) {
            this.lastDirection = "left";
            if (
              !this.player.anims.isPlaying ||
              this.player.anims.currentAnim?.key !== "run-left"
            ) {
              this.player.play("run-left", true);
            }
          } else if (currentVelX > 0) {
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
  }

  performSlash() {
    this.isSlashing = true;
    const skillAnim = `skill-${this.lastDirection}`;

    // Stop movement during slash
    this.player.setVelocity(0, 0);
    this.player.setAcceleration(0, 0);

    // Play animation with attack speed multiplier
    this.player.play(skillAnim);
    if (this.attackSpeedMultiplier > 1) {
      this.player.anims.timeScale = this.attackSpeedMultiplier;
    }

    // Check if attack hits enemy (faster with attack speed buff)
    const attackDelay = 150 / this.attackSpeedMultiplier;
    this.time.delayedCall(attackDelay, () => {
      this.checkPlayerAttackHitsEnemy();
    });

    // Listen for animation complete event
    this.player.once("animationcomplete", () => {
      this.isSlashing = false;
      // Reset animation speed
      this.player.anims.timeScale = 1;
      // Return to idle animation after skill
      this.player.play(`idle-${this.lastDirection}`);
    });
  }

  performJump() {
    this.isJumping = true;
    const jumpAnim = `jump-${this.lastDirection}`;

    // Stop movement during jump
    this.player.setVelocity(0, 0);
    this.player.setAcceleration(0, 0);
    this.player.play(jumpAnim);

    // Listen for animation complete event
    this.player.once("animationcomplete", () => {
      this.isJumping = false;
      // Return to idle animation after jump
      this.player.play(`idle-${this.lastDirection}`);
    });
  }

  performUlt() {
    // Pause the dungeon scene and launch the ult scene
    this.scene.pause();
    this.scene.launch("UltScene", {
      character: this.selectedCharacter,
      direction: this.lastDirection,
    });
  }

  setupLighting() {
    const { width, height } = this.cameras.main;

    // Create a render texture for the lighting effect that covers the viewport
    this.renderTexture = this.add.renderTexture(0, 0, width, height);
    this.renderTexture.setDepth(10000);
    this.renderTexture.setScrollFactor(0); // Fixed to camera
    this.renderTexture.setOrigin(0, 0);

    // Create graphics for the darkness overlay
    this.darknessOverlay = this.add.graphics();

    // Create graphics for the light mask (circle around player)
    this.lightMask = this.add.graphics();
  }

  createTorches() {
    // Use the already-sorted nodes (first entry is the player spawn)
    if (!this.nodes.length) return;
    const nodes = this.nodes;

    // Spawn torches at various intervals along the path
    // Skip the first node (player spawn) and place torches every few nodes
    for (let i = 3; i < nodes.length; i += 4) {
      const node = nodes[i];
      const x = node.x;
      const y = node.y;

      // Add some random offset to make torch placement less uniform
      const offsetX = Phaser.Math.Between(-20, 20);
      const offsetY = Phaser.Math.Between(-20, 20);

      const torch = this.torches.create(
        x + offsetX,
        y + offsetY,
        "torch"
      ) as Phaser.Physics.Arcade.Sprite;
      torch.setScale(2);
      torch.setDepth(500);

      // Add a glowing effect to torches
      const glow = this.add.sprite(x + offsetX, y + offsetY, "torch");
      glow.setScale(3);
      glow.setDepth(499);
      glow.setAlpha(0.3);
      glow.setTint(0xffaa00);
      this.torchGlowSprites.push(glow);

      // Animate the glow
      this.tweens.add({
        targets: glow,
        scale: { from: 3, to: 3.5 },
        alpha: { from: 0.3, to: 0.5 },
        duration: 1000,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }
  }

  collectTorch(
    player:
      | Phaser.Physics.Arcade.Body
      | Phaser.Physics.Arcade.StaticBody
      | Phaser.Types.Physics.Arcade.GameObjectWithBody
      | Phaser.Tilemaps.Tile,
    torch:
      | Phaser.Physics.Arcade.Body
      | Phaser.Physics.Arcade.StaticBody
      | Phaser.Types.Physics.Arcade.GameObjectWithBody
      | Phaser.Tilemaps.Tile
  ) {
    const torchSprite = torch as Phaser.Physics.Arcade.Sprite;

    // Find and remove the glow sprite associated with this torch
    const torchIndex = this.torches.getChildren().indexOf(torchSprite);
    if (torchIndex !== -1 && torchIndex < this.torchGlowSprites.length) {
      this.torchGlowSprites[torchIndex].destroy();
      this.torchGlowSprites.splice(torchIndex, 1);
    }

    // Remove the torch
    torchSprite.destroy();

    // Increment torch count
    this.torchCount++;
    this.torchTimeRemaining += this.TORCH_DURATION;

    // Cap at max torches
    if (this.torchTimeRemaining > this.TORCH_DURATION * this.MAX_TORCHES) {
      this.torchTimeRemaining = this.TORCH_DURATION * this.MAX_TORCHES;
    }

    // Update UI
    this.torchText.setText(`🔥 Torches: ${this.torchCount}`);

    // Play a collection effect
    const collectText = this.add.text(
      this.player.x,
      this.player.y - 50,
      "+Torch!",
      {
        fontFamily: "'Pixelify Sans', monospace",
        fontSize: "16px",
        color: "#ffaa00",
      }
    );
    collectText.setDepth(10001);

    this.tweens.add({
      targets: collectText,
      y: collectText.y - 30,
      alpha: 0,
      duration: 1000,
      onComplete: () => collectText.destroy(),
    });
  }

  createCollectibles() {
    if (!this.nodes.length) return;

    // Create collectibles near walkable nodes (guaranteed to be in walkable areas)
    const collectibleTypes = [
      { type: "health", color: 0x00ff00, label: "HP" },
      { type: "attack_speed", color: 0xff0000, label: "ATK" },
      { type: "speed_boost", color: 0x00aaff, label: "SPD" },
    ];

    // Number of collectibles: roughly 1 per 2-3 nodes (skip first node where player spawns)
    const collectibleCount = Math.floor((this.nodes.length - 1) / 2.5);

    // Keep track of used texture keys to avoid conflicts
    const usedTextureKeys = new Set<string>();

    // Spawn collectibles near nodes (skip the first node where player spawns)
    for (
      let i = 1;
      i < this.nodes.length && usedTextureKeys.size < collectibleCount;
      i++
    ) {
      // Randomly decide if we place a collectible at this node (50% chance)
      if (Math.random() > 0.5) continue;

      const node = this.nodes[i];

      // Add random offset from node position (but keep it close to ensure it's walkable)
      const offsetRange = 40; // Smaller range to stay in walkable area
      const offsetX = Phaser.Math.Between(-offsetRange, offsetRange);
      const offsetY = Phaser.Math.Between(-offsetRange, offsetRange);

      const collectibleX = node.x + offsetX;
      const collectibleY = node.y + offsetY;

      // Random collectible type
      const collectibleType =
        collectibleTypes[Phaser.Math.Between(0, collectibleTypes.length - 1)];

      // Generate unique texture key
      const textureIndex = usedTextureKeys.size;
      let textureKey = `collectible-${collectibleType.type}-${textureIndex}`;
      let counter = 0;
      while (usedTextureKeys.has(textureKey)) {
        textureKey = `collectible-${collectibleType.type}-${textureIndex}-${counter}`;
        counter++;
      }
      usedTextureKeys.add(textureKey);

      // Create the collectible as a circle
      const graphics = this.add.graphics();
      graphics.fillStyle(collectibleType.color, 1);
      graphics.fillCircle(10, 10, 10);
      graphics.generateTexture(textureKey, 20, 20);
      graphics.destroy();

      const collectible = this.collectibles.create(
        collectibleX,
        collectibleY,
        textureKey
      ) as Phaser.Physics.Arcade.Sprite;
      collectible.setScale(1.5);
      collectible.setDepth(500);
      collectible.setData("type", collectibleType.type);
      collectible.setData("label", collectibleType.label);
      collectible.setData("color", collectibleType.color);

      // Add floating animation
      this.tweens.add({
        targets: collectible,
        y: collectible.y - 10,
        duration: 1000,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });

      // Add rotation animation
      this.tweens.add({
        targets: collectible,
        angle: 360,
        duration: 3000,
        repeat: -1,
        ease: "Linear",
      });
    }
  }

  collectItem(
    player:
      | Phaser.Physics.Arcade.Body
      | Phaser.Physics.Arcade.StaticBody
      | Phaser.Types.Physics.Arcade.GameObjectWithBody
      | Phaser.Tilemaps.Tile,
    item:
      | Phaser.Physics.Arcade.Body
      | Phaser.Physics.Arcade.StaticBody
      | Phaser.Types.Physics.Arcade.GameObjectWithBody
      | Phaser.Tilemaps.Tile
  ) {
    const itemSprite = item as Phaser.Physics.Arcade.Sprite;
    const type = itemSprite.getData("type");
    const color = itemSprite.getData("color");

    // Apply effect based on type
    let effectText = "";
    let textColor = "#ffffff";

    switch (type) {
      case "health":
        const healAmount = 30;
        this.playerHealth = Math.min(
          this.playerMaxHealth,
          this.playerHealth + healAmount
        );
        this.updatePlayerHealthBar();
        effectText = `+${healAmount} HP`;
        textColor = "#00ff00";
        break;

      case "attack_speed":
        this.attackSpeedMultiplier = 1.5;
        this.attackSpeedBuffTimer = 10000; // 10 seconds
        effectText = "+50% Attack Speed (10s)";
        textColor = "#ff0000";
        break;

      case "speed_boost":
        this.speedBoostMultiplier = 1.5;
        this.speedBoostTimer = 10000; // 10 seconds
        effectText = "+50% Movement Speed (10s)";
        textColor = "#00aaff";
        break;
    }

    // Remove the collectible
    itemSprite.destroy();

    // Show collection text
    const collectText = this.add.text(
      this.player.x,
      this.player.y - 60,
      effectText,
      {
        fontFamily: "'Pixelify Sans', monospace",
        fontSize: "16px",
        color: textColor,
      }
    );
    collectText.setDepth(10001);

    this.tweens.add({
      targets: collectText,
      y: collectText.y - 40,
      alpha: 0,
      duration: 1500,
      onComplete: () => collectText.destroy(),
    });

    // Play sparkle effect
    const sparkle = this.add.circle(
      this.player.x,
      this.player.y,
      20,
      color,
      0.6
    );
    sparkle.setDepth(999);

    this.tweens.add({
      targets: sparkle,
      scale: 3,
      alpha: 0,
      duration: 500,
      onComplete: () => sparkle.destroy(),
    });
  }

  createEnemiesAtNodes() {
    if (!this.nodes.length) return;

    const shadowOffset = (this.FRAME_HEIGHT * this.SPRITE_SCALE) / 2 - 10;

    // Use provided enemy levels, or fallback to default order
    // Fallback array has 12 elements to support map10 (9 enemies), map11 (10 enemies), and map12 (11 enemies)
    const enemyLevelsByOrder =
      this.enemyLevels.length > 0
        ? this.enemyLevels
        : [1, 6, 5, 2, 7, 4, 3, 8, 9, 10, 11, 12];
    let enemyIndex = 0;
    this.nodes.forEach((node: { x: number; y: number }, index: number) => {
      // Skip the first node (player spawn)
      if (index === 0) return;

      // Enforce unique levels per enemy; cap to the provided levels length
      if (enemyIndex >= enemyLevelsByOrder.length) return;
      const enemyLevel = enemyLevelsByOrder[enemyIndex];
      enemyIndex += 1;

      const shadow = this.add.ellipse(
        node.x,
        node.y + shadowOffset,
        50,
        20,
        0x000000,
        0.3
      );
      shadow.setDepth(1000);

      const sprite = this.physics.add.sprite(node.x, node.y, "enemy-idle");
      sprite.setScale(this.SPRITE_SCALE);
      sprite.setOrigin(0.5, 0.5);
      sprite.setDepth(1001);
      sprite.setTint(0xff8888);

      const bodyWidth = this.getCollisionWidth();
      const bodyHeight = this.getCollisionHeight();
      const body = sprite.body as Phaser.Physics.Arcade.Body;
      body.setSize(
        bodyWidth / this.SPRITE_SCALE,
        bodyHeight / this.SPRITE_SCALE
      );
      const bodyOffsetY =
        (this.FRAME_OFFSET_BOTTOM - this.FRAME_OFFSET_TOP) / 2;
      body.setOffset(
        (this.FRAME_WIDTH - bodyWidth / this.SPRITE_SCALE) / 2,
        (this.FRAME_HEIGHT - bodyHeight / this.SPRITE_SCALE) / 2 + bodyOffsetY
      );
      body.setMaxVelocity(this.enemySpeed, this.enemySpeed);
      body.setDrag(600, 600);
      body.setAllowGravity(false);

      this.physics.add.collider(sprite, this.wallColliders);

      // Health bar graphics placed above enemy
      const healthBarBg = this.add.graphics().setDepth(1200);
      const healthBar = this.add.graphics().setDepth(1201);

      // Level label above enemy
      const levelText = this.add
        .text(node.x, node.y - 70, `Lv ${enemyLevel}`, {
          fontFamily: "'Pixelify Sans', monospace",
          fontSize: "12px",
          color: "#ffffff",
          backgroundColor: "#000000",
          padding: { x: 6, y: 3 },
        })
        .setOrigin(0.5, 0.5)
        .setDepth(1202);

      const enemy: EnemyUnit = {
        sprite,
        shadow,
        health: 60 + (enemyLevel - 1) * 12,
        maxHealth: 60 + (enemyLevel - 1) * 12,
        level: enemyLevel,
        levelText,
        lastDirection: "down",
        defeated: false,
        healthBarBg,
        healthBar,
        homeX: node.x,
        homeY: node.y,
        attackCooldownMs: 900,
        attackCooldownRemaining: 0,
        attacking: false,
      };

      // Start idle animation
      enemy.sprite.play("enemy-idle-down");

      this.enemies.push(enemy);
    });

    this.setupEnemyColliders();
  }

  setupEnemyColliders() {
    // Clear old colliders if re-run
    this.enemyVsEnemyColliders.forEach((c) => c.destroy());
    this.enemyVsPlayerColliders.forEach((c) => c.destroy());
    this.enemyVsEnemyColliders = [];
    this.enemyVsPlayerColliders = [];

    // Enemy vs player
    this.enemies.forEach((enemy) => {
      const col = this.physics.add.collider(enemy.sprite, this.player);
      this.enemyVsPlayerColliders.push(col);
    });

    // Enemy vs enemy (prevent overlap)
    for (let i = 0; i < this.enemies.length; i++) {
      for (let j = i + 1; j < this.enemies.length; j++) {
        const col = this.physics.add.collider(
          this.enemies[i].sprite,
          this.enemies[j].sprite
        );
        this.enemyVsEnemyColliders.push(col);
      }
    }
  }

  updateEnemies(delta: number) {
    if (!this.enemies.length) return;

    // Filter out destroyed enemies
    this.enemies = this.enemies.filter((enemyUnit) => {
      return enemyUnit.sprite && enemyUnit.sprite.active;
    });

    this.enemies.forEach((enemyUnit) => {
      const { sprite, shadow, defeated } = enemyUnit;
      if (defeated) return;

      // Check if sprite still exists and is active
      if (!sprite || !sprite.active || !sprite.body) return;

      // Ensure collider stays active even during attack animations
      const body = sprite.body as Phaser.Physics.Arcade.Body;
      if (!body) return;

      body.enable = true;
      body.checkCollision.none = false;
      body.immovable = false;

      // Cooldown ticking
      if (enemyUnit.attackCooldownRemaining > 0) {
        enemyUnit.attackCooldownRemaining = Math.max(
          0,
          enemyUnit.attackCooldownRemaining - delta
        );
      }

      // Keep shadow and level label aligned
      if (shadow && shadow.active) {
        const shadowOffset = (this.FRAME_HEIGHT * this.SPRITE_SCALE) / 2 - 10;
        shadow.x = sprite.x;
        shadow.y = sprite.y + shadowOffset;
      }
      if (enemyUnit.levelText && enemyUnit.levelText.active) {
        enemyUnit.levelText.x = sprite.x;
        enemyUnit.levelText.y = sprite.y - 70;
      }

      // Distance to player
      const dx = this.player.x - sprite.x;
      const dy = this.player.y - sprite.y;
      const distanceToPlayer = Math.sqrt(dx * dx + dy * dy);

      const aggroRange = 260;
      const attackRange = 90;

      // Decide behavior
      if (
        !enemyUnit.attacking &&
        enemyUnit.attackCooldownRemaining <= 0 &&
        distanceToPlayer <= attackRange
      ) {
        // Attack
        enemyUnit.attacking = true;
        sprite.setVelocity(0, 0);

        // Pick attack direction
        const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
        let dir: "up" | "down" | "left" | "right" = "down";
        if (angleDeg > -45 && angleDeg < 45) dir = "right";
        else if (angleDeg > 135 || angleDeg < -135) dir = "left";
        else if (angleDeg >= 45 && angleDeg <= 135) dir = "down";
        else dir = "up";
        enemyUnit.lastDirection = dir;
        sprite.play(`enemy-attack-${dir}`);

        // Apply damage and knockback to player mid-attack
        this.time.delayedCall(220, () => {
          // Calculate damage based on enemy level
          const baseDamage = 10;
          const damage = this.getDamageAfterLevels(
            baseDamage,
            enemyUnit.level,
            this.playerLevel
          );
          this.damagePlayer(damage, enemyUnit.level);

          // Apply knockback
          const kbForce = 250;
          const norm = Math.max(1, Math.sqrt(dx * dx + dy * dy));
          const kbX = (dx / norm) * kbForce;
          const kbY = (dy / norm) * kbForce;
          this.player.setVelocity(kbX, kbY);
        });

        sprite.once("animationcomplete", () => {
          enemyUnit.attacking = false;
          enemyUnit.attackCooldownRemaining = enemyUnit.attackCooldownMs;
          // Return to idle animation after attack
          sprite.play(`enemy-idle-${enemyUnit.lastDirection}`, true);
        });
      } else if (!enemyUnit.attacking && distanceToPlayer <= aggroRange) {
        // Chase player
        const angle = Math.atan2(dy, dx);
        const vx = Math.cos(angle) * this.enemySpeed;
        const vy = Math.sin(angle) * this.enemySpeed;
        sprite.setVelocity(vx, vy);

        // Animation by direction
        if (Math.abs(vx) > Math.abs(vy)) {
          if (vx < 0) {
            enemyUnit.lastDirection = "left";
            sprite.play("enemy-run-left", true);
          } else {
            enemyUnit.lastDirection = "right";
            sprite.play("enemy-run-right", true);
          }
        } else {
          if (vy < 0) {
            enemyUnit.lastDirection = "up";
            sprite.play("enemy-run-up", true);
          } else {
            enemyUnit.lastDirection = "down";
            sprite.play("enemy-run-down", true);
          }
        }
      } else if (!enemyUnit.attacking) {
        // Idle - stop movement and play idle animation
        sprite.setVelocity(0, 0);
        const idleAnim = `enemy-idle-${enemyUnit.lastDirection}`;
        if (
          !sprite.anims.isPlaying ||
          !sprite.anims.currentAnim?.key.startsWith("enemy-idle")
        ) {
          sprite.play(idleAnim, true);
        }
      }

      this.updateEnemyHealthBar(enemyUnit);
    });
  }

  updateEnemyHealthBar(enemy: EnemyUnit) {
    if (!enemy.sprite || !enemy.sprite.active) return;

    const barWidth = 40;
    const barHeight = 6;
    const barX = enemy.sprite.x - barWidth / 2;
    const barY = enemy.sprite.y - 50;

    if (enemy.healthBarBg && enemy.healthBarBg.active) {
      enemy.healthBarBg.clear();
    }
    if (enemy.healthBar && enemy.healthBar.active) {
      enemy.healthBar.clear();
    }

    if (enemy.defeated) return;

    if (enemy.healthBarBg && enemy.healthBarBg.active) {
      enemy.healthBarBg.fillStyle(0x000000, 0.8);
      enemy.healthBarBg.fillRect(
        barX - 2,
        barY - 2,
        barWidth + 4,
        barHeight + 4
      );

      enemy.healthBarBg.fillStyle(0x550000, 1);
      enemy.healthBarBg.fillRect(barX, barY, barWidth, barHeight);
    }

    const pct = Phaser.Math.Clamp(enemy.health / enemy.maxHealth, 0, 1);
    let color = 0x00ff00;
    if (pct < 0.3) color = 0xff0000;
    else if (pct < 0.6) color = 0xffaa00;

    if (enemy.healthBar && enemy.healthBar.active) {
      enemy.healthBar.fillStyle(color, 1);
      enemy.healthBar.fillRect(barX, barY, barWidth * pct, barHeight);
    }
  }

  updatePlayerHealthBar() {
    const barWidth = 150;
    const barHeight = 20;
    const barX = 16;
    const barY = 160;

    this.playerHealthBarBg.clear();
    this.playerHealthBar.clear();

    // Background
    this.playerHealthBarBg.fillStyle(0x000000, 0.8);
    this.playerHealthBarBg.fillRect(
      barX - 2,
      barY - 2,
      barWidth + 4,
      barHeight + 4
    );

    // Red background for missing health
    this.playerHealthBarBg.fillStyle(0x550000, 1);
    this.playerHealthBarBg.fillRect(barX, barY, barWidth, barHeight);

    // Green health bar
    const pct = Phaser.Math.Clamp(
      this.playerHealth / this.playerMaxHealth,
      0,
      1
    );
    let color = 0x00ff00;
    if (pct < 0.3) color = 0xff0000;
    else if (pct < 0.6) color = 0xffaa00;

    this.playerHealthBar.fillStyle(color, 1);
    this.playerHealthBar.fillRect(barX, barY, barWidth * pct, barHeight);

    // Update text
    this.playerHealthText.setText(
      `HP: ${Math.max(0, Math.floor(this.playerHealth))}/${
        this.playerMaxHealth
      }`
    );
  }

  damagePlayer(damage: number, enemyLevel: number) {
    this.playerHealth -= damage;
    this.updatePlayerHealthBar();

    // Shake the camera only if enemy is 2+ levels higher
    const levelDiff = enemyLevel - this.playerLevel;
    if (levelDiff >= 2) {
      this.cameras.main.shake(150, 0.005);
    }

    // Check for game over
    if (this.playerHealth <= 0) {
      this.playerHealth = 0;
      this.updatePlayerHealthBar();
      this.gameOver();
    }

    // Show damage text
    const damageText = this.add.text(
      this.player.x,
      this.player.y - 50,
      `-${Math.floor(damage)}`,
      {
        fontFamily: "'Pixelify Sans', monospace",
        fontSize: "20px",
        color: "#ff0000",
      }
    );
    damageText.setDepth(1300);

    this.tweens.add({
      targets: damageText,
      y: damageText.y - 40,
      alpha: 0,
      duration: 1000,
      onComplete: () => damageText.destroy(),
    });
  }

  gameOver() {
    // Stop all movement
    this.player.setVelocity(0, 0);
    this.isSlashing = false;
    this.isJumping = false;

    // Display game over text
    const { width, height } = this.cameras.main;
    this.add
      .text(width / 2, height / 2, "GAME OVER", {
        fontFamily: "'Pixelify Sans', monospace",
        fontSize: "64px",
        color: "#ff0000",
        stroke: "#000000",
        strokeThickness: 8,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(20000);

    this.add
      .text(width / 2, height / 2 + 80, "Press R to Restart", {
        fontFamily: "'Pixelify Sans', monospace",
        fontSize: "24px",
        color: "#ffffff",
        backgroundColor: "#000000",
        padding: { x: 12, y: 6 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(20000);

    // Add R key to restart
    const rKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    rKey.once("down", () => {
      // Restart with the same initialization data
      this.scene.restart(this.initData);
    });
  }

  checkPlayerAttackHitsEnemy() {
    if (!this.player || !this.isSlashing) return;

    const attackRange = 100;

    this.enemies.forEach((enemyUnit) => {
      if (enemyUnit.defeated) return;

      // Check if sprite still exists and is active
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
        this.damageEnemy(enemyUnit, 10);
      }
    });
  }

  private getDamageAfterLevels(
    baseDamage: number,
    attackerLevel: number,
    defenderLevel: number
  ): number {
    const levelDiff = defenderLevel - attackerLevel; // positive when defender is higher level
    const reduction =
      levelDiff > 0 ? Math.min(0.8, levelDiff * 0.15) : levelDiff * 0.08;
    const multiplier = Phaser.Math.Clamp(1 - reduction, 0.2, 1.5);
    return Math.max(1, Math.floor(baseDamage * multiplier));
  }

  damageEnemy(enemy: EnemyUnit, damage: number) {
    if (enemy.defeated) return;

    const adjustedDamage = this.getDamageAfterLevels(
      damage,
      this.playerLevel,
      enemy.level
    );
    enemy.health -= adjustedDamage;

    const damageText = this.add.text(
      enemy.sprite.x,
      enemy.sprite.y - 50,
      `-${adjustedDamage}`,
      {
        fontFamily: "'Pixelify Sans', monospace",
        fontSize: "16px",
        color: "#ff0000",
      }
    );
    damageText.setDepth(1300);

    this.tweens.add({
      targets: damageText,
      y: damageText.y - 30,
      alpha: 0,
      duration: 800,
      onComplete: () => damageText.destroy(),
    });

    enemy.sprite.setTint(0xff0000);
    this.time.delayedCall(120, () => {
      if (!enemy.defeated) {
        enemy.sprite.setTint(0xff8888);
      }
    });

    if (enemy.health <= 0) {
      enemy.health = 0;
      this.defeatEnemy(enemy);
    }
  }

  defeatEnemy(enemy: EnemyUnit) {
    if (enemy.defeated) return;
    enemy.defeated = true;
    enemy.sprite.setVelocity(0, 0);
    enemy.levelText.setVisible(false);

    // Play hurt animation when defeated
    enemy.sprite.play("enemy-hurt");

    // After hurt animation completes, fade out and destroy
    enemy.sprite.once("animationcomplete", () => {
      enemy.sprite.setTint(0x666666);
      this.tweens.add({
        targets: [
          enemy.sprite,
          enemy.shadow,
          enemy.healthBar,
          enemy.healthBarBg,
          enemy.levelText,
        ],
        alpha: 0,
        duration: 800,
        onComplete: () => {
          enemy.sprite.destroy();
          enemy.shadow.destroy();
          enemy.healthBar.destroy();
          enemy.healthBarBg.destroy();
          enemy.levelText.destroy();
        },
      });
    });

    // Level up the player when defeating an enemy of the same level (max 10)
    if (enemy.level === this.playerLevel && this.playerLevel < 10) {
      this.playerLevel += 1;
      if (this.playerLevelText) {
        this.playerLevelText.setText(`Level: ${this.playerLevel}`);
      }

      // Increase max health by 10 per level
      this.playerMaxHealth += 10;

      // Heal 50% of max health on level up
      const healAmount = Math.floor(this.playerMaxHealth * 0.5);
      this.playerHealth = Math.min(
        this.playerMaxHealth,
        this.playerHealth + healAmount
      );
      this.updatePlayerHealthBar();

      // Show level up text
      const levelUpText = this.add.text(
        this.player.x,
        this.player.y - 70,
        `LEVEL UP! +${healAmount} HP`,
        {
          fontFamily: "'Pixelify Sans', monospace",
          fontSize: "20px",
          color: "#00ffcc",
        }
      );
      levelUpText.setDepth(1300);

      this.tweens.add({
        targets: levelUpText,
        y: levelUpText.y - 40,
        alpha: 0,
        duration: 1500,
        onComplete: () => levelUpText.destroy(),
      });
    }
  }

  updateLighting() {
    const { width, height } = this.cameras.main;

    // Calculate current vision radius
    if (this.torchTimeRemaining > 0) {
      this.currentVisionRadius =
        this.BASE_VISION_RADIUS + this.TORCH_VISION_BONUS;
    } else {
      this.currentVisionRadius = this.BASE_VISION_RADIUS;
    }

    // Clear the render texture
    this.renderTexture.clear();

    // Redraw the darkness overlay to cover the entire viewport
    this.darknessOverlay.clear();
    this.darknessOverlay.fillStyle(0x000000, 0.1); // Dark overlay
    this.darknessOverlay.fillRect(0, 0, width, height);

    // Get player position relative to camera
    const playerScreenX = this.player.x - this.cameras.main.scrollX;
    const playerScreenY = this.player.y - this.cameras.main.scrollY;

    // Draw the darkness to the render texture
    this.renderTexture.draw(this.darknessOverlay, 0, 0);

    // Create a radial gradient light effect
    this.lightMask.clear();

    // Draw multiple circles for smooth gradient effect
    const steps = 20;
    for (let i = steps; i >= 0; i--) {
      const ratio = i / steps;
      const radius = this.currentVisionRadius * ratio;
      const alpha = 1 - ratio * 0.7; // Fade from center to edge

      this.lightMask.fillStyle(0x000000, alpha);
      this.lightMask.fillCircle(playerScreenX, playerScreenY, radius);
    }

    // Erase the light area from darkness (this creates the light circle)
    this.renderTexture.erase(this.lightMask, 0, 0);
  }
}

interface AnimatedSpriteProps {
  characterId: string;
  direction: "up" | "down" | "left" | "right";
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  frameRate?: number;
  scale?: number;
}

function AnimatedSprite({
  characterId,
  direction,
  frameWidth,
  frameHeight,
  frameCount,
  frameRate = 4,
  scale = 2,
}: AnimatedSpriteProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const img = new Image();
    img.src = `/sprite/characters/${characterId}/idle.png`;
    imgRef.current = img;

    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const drawFrame = (frameIndex: number) => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Calculate sprite sheet position based on direction
        // Idle animations: up (0-1), left (2-3), down (4-5), right (6-7)
        let spriteX = 0;
        let spriteY = 0;

        if (direction === "up") spriteY = 0;
        else if (direction === "left") spriteY = frameHeight;
        else if (direction === "down") spriteY = frameHeight * 2;
        else if (direction === "right") spriteY = frameHeight * 3;

        spriteX = frameIndex * frameWidth;

        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(
          img,
          spriteX,
          spriteY,
          frameWidth,
          frameHeight,
          0,
          0,
          frameWidth * scale,
          frameHeight * scale
        );
      };

      let frameIndex = 0;
      const animate = () => {
        drawFrame(frameIndex);
        frameIndex = (frameIndex + 1) % frameCount;
        animationRef.current = setTimeout(
          () => requestAnimationFrame(animate),
          1000 / frameRate
        );
      };

      drawFrame(0);
      animate();
    };

    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    };
  }, [
    characterId,
    direction,
    frameWidth,
    frameHeight,
    frameCount,
    frameRate,
    scale,
  ]);

  return (
    <canvas
      ref={canvasRef}
      width={frameWidth * scale}
      height={frameHeight * scale}
      style={{
        imageRendering: "pixelated",
        width: "100%",
        height: "100%",
        objectFit: "contain",
      }}
      className="pixelated"
    />
  );
}

interface CharacterPickerProps {
  onSelect: (character: string) => void;
  currentCharacter?: string | null;
}

function CharacterPicker({ onSelect, currentCharacter }: CharacterPickerProps) {
  const characters = [
    {
      id: "gojo",
      name: "Gojo",
      direction: "down" as const,
      description: "Master of space manipulation with infinite potential",
      attack: 95,
      defense: 85,
      life: 100,
      cardBackground: "/sprite/card/special_card.png",
    },
    {
      id: "goku",
      name: "Goku",
      direction: "down" as const,
      description: "Legendary Saiyan warrior with boundless energy",
      attack: 100,
      defense: 80,
      life: 95,
      cardBackground: "/sprite/card/hero_card.png",
    },
    {
      id: "gladiator",
      name: "Gladiator",
      direction: "down" as const,
      description: "Battle-hardened warrior with exceptional combat skills",
      attack: 85,
      defense: 95,
      life: 90,
      cardBackground: "/sprite/card/steam_card.png",
    },
  ];

  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) {
      return;
    }

    setCurrent(api.selectedScrollSnap());

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  return (
    <div className={`w-full ${pixelFont.className} relative z-10`}>
      {/* Header */}
      <div className="flex justify-center mb-8">
        <h1 className="text-5xl font-normal text-amber-100 tracking-wider drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]">
          Pick a Character
        </h1>
      </div>

      <Carousel
        setApi={setApi}
        opts={{
          align: "center",
          loop: true,
        }}
        className="w-full"
      >
        <div className="flex items-center justify-center gap-8 w-full">
          {/* Left Arrow Button */}
          <CarouselPrevious
            className="group static relative flex-shrink-0 flex items-center justify-center w-16 h-16 transition-all duration-300 hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            aria-label="Previous character"
            style={{
              backgroundImage: "url('/sprite/btn_circle.png')",
              backgroundSize: "100% 100%",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
              imageRendering: "pixelated",
            }}
          >
            <svg
              className="w-8 h-8 text-amber-200 group-hover:text-amber-100 transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </CarouselPrevious>

          {/* Carousel Content */}
          <div className="flex-1 max-w-[500px]">
            <CarouselContent>
              {characters.map((char) => (
                <CarouselItem key={char.id}>
                  <div className="flex items-center justify-center p-4">
                    <div
                      className="relative w-[450px] h-[600px] transition-all duration-300"
                      style={{
                        backgroundImage: `url('${char.cardBackground}')`,
                        backgroundSize: "100% 100%",
                        backgroundPosition: "center",
                        backgroundRepeat: "no-repeat",
                        imageRendering: "pixelated",
                      }}
                    >
                      {/* Character Name on Top Scroll */}
                      <div className="absolute top-[6%] left-0 right-0 flex items-center justify-center">
                        <h2 className="text-4xl font-bold text-amber-900 tracking-wider text-center w-full">
                          {char.name}
                        </h2>
                      </div>

                      {/* Character Sprite in Center */}
                      <div className="absolute top-[22%] left-0 right-0 bottom-[45%] flex items-center justify-center">
                        <div className="w-[70%] h-[70%] flex items-center justify-center">
                          <AnimatedSprite
                            key={char.id}
                            characterId={char.id}
                            direction={char.direction}
                            frameWidth={64}
                            frameHeight={64}
                            frameCount={2}
                            frameRate={4}
                            scale={5}
                          />
                        </div>
                      </div>

                      {/* Description on Bottom Scroll */}
                      <div className="absolute bottom-[28%] left-[12%] right-[12%] flex items-center justify-center">
                        <p className="text-base font-medium text-amber-900 text-center leading-snug px-2">
                          {char.description}
                        </p>
                      </div>

                      {/* Stats Bar at Bottom */}
                      <div className="absolute bottom-[5%] left-[15%] right-[7%] flex items-center justify-around">
                        {/* Attack */}
                        <div className="flex items-center justify-center">
                          <span className="text-xl font-bold text-amber-900">
                            {char.attack}
                          </span>
                        </div>

                        {/* Defense */}
                        <div className="flex items-center justify-center">
                          <span className="text-xl font-bold text-amber-900">
                            {char.defense}
                          </span>
                        </div>

                        {/* Life */}
                        <div className="flex items-center justify-center">
                          <span className="text-xl font-bold text-amber-900">
                            {char.life}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
          </div>

          {/* Right Arrow Button */}
          <CarouselNext
            className="group static relative flex-shrink-0 flex items-center justify-center w-16 h-16 transition-all duration-300 hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            aria-label="Next character"
            style={{
              backgroundImage: "url('/sprite/btn_circle.png')",
              backgroundSize: "100% 100%",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
              imageRendering: "pixelated",
            }}
          >
            <svg
              className="w-8 h-8 text-amber-200 group-hover:text-amber-100 transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </CarouselNext>
        </div>
      </Carousel>

      {/* Select Button - Outside the carousel */}
      <div className="flex justify-center mt-6">
        <button
          onClick={() => onSelect(characters[current].id)}
          disabled={currentCharacter === characters[current].id}
          className={`font-bold text-xl transition-all duration-300 px-8 ${
            currentCharacter === characters[current].id
              ? "opacity-60 cursor-not-allowed"
              : "hover:scale-105 active:scale-95 cursor-pointer"
          }`}
          style={{
            backgroundImage: "url('/sprite/btn_small.png')",
            backgroundSize: "auto 100%",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            imageRendering: "pixelated",
            color:
              currentCharacter === characters[current].id
                ? "#10b981"
                : "#fbbf24",
            textShadow: "0 2px 4px rgba(0, 0, 0, 0.8)",
            height: "48px",
            minWidth: "200px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {currentCharacter === characters[current].id
            ? "✓ Selected"
            : "Select"}
        </button>
      </div>
    </div>
  );
}

export default function DungeonGame() {
  const [showTitleScreen, setShowTitleScreen] = useState(true);
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(
    null
  );
  const [showPicker, setShowPicker] = useState(false);
  const [showLevelInput, setShowLevelInput] = useState(false);
  const [levelInput, setLevelInput] = useState("");
  const [enemyLevels, setEnemyLevels] = useState<number[]>([]);
  const [showTutorial, setShowTutorial] = useState(false);
  const gameRef = useRef<Phaser.Game | null>(null);
  const parentRef = useRef<HTMLDivElement>(null);

  const handleTitleClick = () => {
    setShowTitleScreen(false);
    setShowPicker(true);
  };

  const handleCharacterSelect = (character: string) => {
    setSelectedCharacter(character);
    setShowPicker(false);
    setShowLevelInput(true);
  };

  const handleLevelInputSubmit = () => {
    // Parse input: accept comma or space separated integers
    const parsed = levelInput
      .split(/[,\s]+/)
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n) && n >= 1 && n <= 100);

    if (parsed.length >= 10 && parsed.length <= 12) {
      setEnemyLevels(parsed);
      setShowLevelInput(false);
    } else {
      alert(
        "Please enter 10-12 integers between 1 and 100 (comma or space separated)"
      );
    }
  };

  const generateRandomLevels = () => {
    // Randomly choose between 10, 11, or 12 enemies
    const count = Math.floor(Math.random() * 3) + 10; // Generates 10, 11, or 12
    // Generate random levels between 1 and 10
    const randomLevels = Array.from(
      { length: count },
      () => Math.floor(Math.random() * 10) + 1
    );
    setLevelInput(randomLevels.join(", "));
  };

  useEffect(() => {
    if (!parentRef.current || !selectedCharacter || enemyLevels.length === 0)
      return;

    // Get window dimensions
    const getWindowSize = () => ({
      width: window.innerWidth,
      height: window.innerHeight,
    });

    const initialSize = getWindowSize();

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: initialSize.width,
      height: initialSize.height,
      parent: parentRef.current,
      backgroundColor: "#1a1a2e",
      scene: [DungeonScene, UltScene],
      physics: {
        default: "arcade",
        arcade: {
          gravity: { y: 0, x: 0 },
          debug: false, // Set to true to see collision boxes
          fps: 60,
        },
      },
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      render: {
        antialias: false,
        pixelArt: true,
      },
    };

    gameRef.current = new Phaser.Game(config);

    // Handle window resize
    const handleResize = () => {
      if (gameRef.current) {
        const newSize = getWindowSize();
        gameRef.current.scale.resize(newSize.width, newSize.height);
      }
    };

    window.addEventListener("resize", handleResize);

    // Determine map name based on number of levels
    let mapName = "map10.json";
    if (enemyLevels.length === 11) {
      mapName = "map11.json";
    } else if (enemyLevels.length === 12) {
      mapName = "map12.json";
    }

    // Pass character data, enemy levels, and map name to scene
    gameRef.current.scene.start("DungeonScene", {
      character: selectedCharacter,
      enemyLevels: enemyLevels,
      mapName: mapName,
    });

    return () => {
      window.removeEventListener("resize", handleResize);
      gameRef.current?.destroy(true);
    };
  }, [selectedCharacter, enemyLevels]);

  const isGameActive = selectedCharacter && enemyLevels.length > 0;

  return (
    <div
      className={`${pixelFont.className} ${
        isGameActive
          ? "fixed inset-0 bg-black"
          : "flex flex-col items-center justify-center min-h-screen p-4"
      }`}
      style={
        !isGameActive
          ? {
              backgroundImage: "url('/sprite/screen.png')",
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
            }
          : undefined
      }
    >
      {!isGameActive && (
        <>
          {/* Dark overlay for better text readability */}
          <div
            className={`fixed inset-0 -z-10 ${
              showTitleScreen ? "bg-black/70" : "bg-black/60 backdrop-blur-sm"
            }`}
          />

          {showTitleScreen && (
            <>
              {/* Vignette effect */}
              <div className="fixed inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60 pointer-events-none -z-5" />
              <div
                className="fixed inset-0 pointer-events-none -z-5"
                style={{
                  background:
                    "radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.5) 100%)",
                }}
              />

              {/* Animated glow orbs */}
              <div
                className="fixed top-20 left-20 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse pointer-events-none -z-5"
                style={{ animationDuration: "4s" }}
              />
              <div
                className="fixed bottom-20 right-20 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl animate-pulse pointer-events-none -z-5"
                style={{ animationDuration: "5s", animationDelay: "1s" }}
              />
            </>
          )}

          {showTitleScreen ? (
            // Title Screen
            <div
              className="flex flex-col items-center justify-center min-h-screen cursor-pointer relative z-10"
              onClick={handleTitleClick}
            >
              <div className="flex flex-col items-center gap-8">
                <img
                  src="/sprite/title.png"
                  alt="Node Quest"
                  className="w-full max-w-3xl h-auto drop-shadow-[0_0_40px_rgba(255,180,0,0.6)] transition-all duration-300 hover:drop-shadow-[0_0_60px_rgba(255,180,0,0.8)] hover:scale-105"
                  style={{ imageRendering: "pixelated" }}
                />
                <p className="text-white text-2xl font-bold drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] bg-black/40 backdrop-blur-md px-8 py-4 rounded-lg border-2 border-yellow-500/30 shadow-[0_0_20px_rgba(255,180,0,0.3)] animate-pulse">
                  Click anywhere to start
                </p>
              </div>
            </div>
          ) : (
            <>
              {showPicker ? (
                <div
                  className="fixed inset-0 flex items-center justify-center"
                  style={{
                    backgroundImage: "url('/sprite/screen.png')",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                  }}
                >
                  {/* Dark overlay to dim the background */}
                  <div className="fixed inset-0 bg-black/60 -z-0" />
                  <div className="relative z-10 flex items-center justify-center w-full h-full">
                    <CharacterPicker
                      onSelect={handleCharacterSelect}
                      currentCharacter={selectedCharacter}
                    />
                  </div>
                </div>
              ) : showLevelInput ? (
                <>
                  {/* Dark overlay to dim the background */}
                  <div className="fixed inset-0 bg-black/60 -z-0" />
                  <div className="w-full max-w-2xl relative z-10 px-4 flex flex-col gap-6">
                    <div
                      className="flex flex-col gap-8 bg-black/60 backdrop-blur-xl p-10 border-4 shadow-[0_0_60px_rgba(120,53,15,0.25),0_0_30px_rgba(120,53,15,0.15)_inset]"
                      style={{
                        borderImage:
                          "linear-gradient(135deg, #92400e 0%, #78350f 25%, #92400e 50%, #78350f 75%, #92400e 100%) 4",
                        clipPath:
                          "polygon(0 8px, 8px 8px, 8px 0, calc(100% - 8px) 0, calc(100% - 8px) 8px, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 8px calc(100% - 8px), 0 calc(100% - 8px))",
                        imageRendering: "pixelated",
                      }}
                    >
                      {/* Header */}
                      <div className="text-center">
                        <h2 className="text-5xl font-bold text-amber-100 tracking-wider drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)]">
                          Level Selection
                        </h2>
                      </div>

                      {/* Level Input Section */}
                      <div
                        className="flex flex-col gap-4 bg-black/40 p-6 border-4 shadow-[0_0_20px_rgba(120,53,15,0.1)_inset]"
                        style={{
                          borderImage:
                            "linear-gradient(135deg, #78350f 0%, #92400e 50%, #78350f 100%) 4",
                          clipPath:
                            "polygon(0 4px, 4px 4px, 4px 0, calc(100% - 4px) 0, calc(100% - 4px) 4px, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 4px calc(100% - 4px), 0 calc(100% - 4px))",
                          imageRendering: "pixelated",
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <label className="text-amber-100 font-bold text-lg">
                            Enemy Levels
                          </label>
                          <span
                            className="text-amber-200/70 text-sm font-medium bg-amber-900/50 px-3 py-1 border-2 shadow-[0_0_10px_rgba(120,53,15,0.2)]"
                            style={{
                              borderImage:
                                "linear-gradient(90deg, #78350f 0%, #92400e 100%) 2",
                              clipPath:
                                "polygon(0 2px, 2px 2px, 2px 0, calc(100% - 2px) 0, calc(100% - 2px) 2px, 100% 2px, 100% calc(100% - 2px), calc(100% - 2px) calc(100% - 2px), calc(100% - 2px) 100%, 2px 100%, 2px calc(100% - 2px), 0 calc(100% - 2px))",
                              imageRendering: "pixelated",
                            }}
                          >
                            10-12 enemies
                          </span>
                        </div>

                        <div className="relative">
                          <input
                            type="text"
                            value={levelInput}
                            onChange={(e) => setLevelInput(e.target.value)}
                            placeholder="e.g., 1, 6, 5, 2, 7, 4, 3, 8, 9, 10"
                            className="w-full pl-5 pr-20 py-4 bg-black/70 backdrop-blur-md border-2 text-white placeholder-white/40 focus:outline-none focus:shadow-[0_0_20px_rgba(120,53,15,0.3)] text-center text-lg font-medium shadow-xl transition-all hover:shadow-[0_0_15px_rgba(120,53,15,0.2)]"
                            style={{
                              borderImage:
                                "linear-gradient(90deg, #78350f 0%, #92400e 50%, #78350f 100%) 2",
                              clipPath:
                                "polygon(0 4px, 4px 4px, 4px 0, calc(100% - 4px) 0, calc(100% - 4px) 4px, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 4px calc(100% - 4px), 0 calc(100% - 4px))",
                              imageRendering: "pixelated",
                            }}
                            onKeyPress={(e) => {
                              if (e.key === "Enter") {
                                handleLevelInputSubmit();
                              }
                            }}
                          />
                          <button
                            onClick={generateRandomLevels}
                            className="absolute right-2 top-1/2 -translate-y-1/2 transition-all duration-300 hover:scale-110 active:scale-95 hover:drop-shadow-[0_0_15px_rgba(146,64,14,0.6)]"
                            style={{
                              backgroundImage: "url('/sprite/random.png')",
                              backgroundSize: "100% 100%",
                              backgroundPosition: "center",
                              backgroundRepeat: "no-repeat",
                              imageRendering: "pixelated",
                              width: "35px",
                              height: "35px",
                              border: "none",
                              padding: 0,
                            }}
                            title="Generate Random Levels"
                            aria-label="Generate Random Levels"
                          />
                        </div>

                        <div className="text-amber-200/70 text-sm text-center bg-black/30 p-3">
                          Levels range from 1-100. Lower values make enemies
                          easier to defeat.
                        </div>
                      </div>

                      {/* Start Button */}
                      <button
                        onClick={handleLevelInputSubmit}
                        className="w-full px-8 font-bold text-2xl transition-all duration-300 hover:scale-105 hover:drop-shadow-[0_0_20px_rgba(16,185,129,0.5)]"
                        style={{
                          backgroundImage: "url('/sprite/btn_small.png')",
                          backgroundSize: "auto 100%",
                          backgroundPosition: "center",
                          backgroundRepeat: "no-repeat",
                          imageRendering: "pixelated",
                          color: "#10b981",
                          textShadow: "0 3px 6px rgba(0, 0, 0, 0.9)",
                          height: "60px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        Start
                      </button>
                    </div>

                    {/* Navigation Buttons - Outside Card */}
                    <div className="flex gap-4 items-center justify-center">
                      <button
                        onClick={() => {
                          setShowLevelInput(false);
                          setShowPicker(true);
                        }}
                        className="font-semibold text-base transition-all duration-300 hover:scale-105"
                        style={{
                          backgroundImage: "url('/sprite/btn_small.png')",
                          backgroundSize: "auto 100%",
                          backgroundPosition: "center",
                          backgroundRepeat: "no-repeat",
                          imageRendering: "pixelated",
                          color: "#fbbf24",
                          textShadow: "0 2px 4px rgba(0, 0, 0, 0.8)",
                          height: "48px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          minWidth: "160px",
                          padding: "0 24px",
                        }}
                      >
                        Back
                      </button>
                      <button
                        onClick={() => setShowTutorial(true)}
                        className="font-semibold text-base transition-all duration-300 hover:scale-105"
                        style={{
                          backgroundImage: "url('/sprite/btn_small.png')",
                          backgroundSize: "auto 100%",
                          backgroundPosition: "center",
                          backgroundRepeat: "no-repeat",
                          imageRendering: "pixelated",
                          color: "#60a5fa",
                          textShadow: "0 2px 4px rgba(0, 0, 0, 0.8)",
                          height: "48px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          minWidth: "160px",
                          padding: "0 24px",
                        }}
                      >
                        Tutorial
                      </button>
                    </div>
                  </div>

                  {/* Tutorial Modal */}
                  {showTutorial && (
                    <div className="fixed inset-0 flex items-center justify-center z-50">
                      {/* Backdrop */}
                      <div
                        className="fixed inset-0 bg-black/80"
                        onClick={() => setShowTutorial(false)}
                      />
                      {/* Tutorial Content */}
                      <div
                        className="relative w-full max-w-lg mx-4"
                        style={{
                          backgroundImage: "url('/sprite/infosheet.png')",
                          backgroundSize: "contain",
                          backgroundPosition: "center",
                          backgroundRepeat: "no-repeat",
                          imageRendering: "pixelated",
                          aspectRatio: "3/4",
                          padding: "3rem 2rem",
                        }}
                      >
                        {/* Close Button */}
                        <button
                          onClick={() => setShowTutorial(false)}
                          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-amber-900 hover:text-amber-700 transition-colors font-bold text-2xl"
                        >
                          ×
                        </button>

                        {/* Tutorial Text Content */}
                        <div className="px-8 py-6 text-amber-900">
                          <h2 className="text-3xl font-bold mb-4 text-center">
                            How to Play
                          </h2>
                          <div className="space-y-4 text-lg leading-relaxed">
                            <div>
                              <h3 className="font-bold text-xl mb-2">
                                Level Selection
                              </h3>
                              <p>
                                Enter enemy levels separated by commas (e.g., 1,
                                6, 5, 2, 7, 4, 3, 8, 9, 10). You can select
                                10-12 levels. Use "Generate Random Levels" for a
                                quick start.
                              </p>
                            </div>
                            <div>
                              <h3 className="font-bold text-xl mb-2">
                                Gameplay
                              </h3>
                              <p>
                                Navigate through the dungeon, defeat enemies,
                                and reach the end. Each enemy has a level that
                                determines their strength. Plan your strategy
                                carefully!
                              </p>
                            </div>
                            <div>
                              <h3 className="font-bold text-xl mb-2">
                                Controls
                              </h3>
                              <p>
                                Use arrow keys or WASD to move. Space to jump.
                                Attack enemies to progress through levels.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <button
                  onClick={() => {
                    setShowPicker(true);
                    setEnemyLevels([]);
                    setLevelInput("");
                    setShowLevelInput(false);
                  }}
                  className="mb-4 px-6 font-semibold text-base relative z-10 transition-all duration-300 hover:scale-105"
                  style={{
                    backgroundImage: "url('/sprite/btn_small.png')",
                    backgroundSize: "auto 100%",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                    imageRendering: "pixelated",
                    color: "#60a5fa",
                    textShadow: "0 2px 4px rgba(0, 0, 0, 0.8)",
                    height: "48px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  Change Character
                </button>
              )}
            </>
          )}
        </>
      )}

      {selectedCharacter && (
        <div
          ref={parentRef}
          className={
            isGameActive
              ? "w-full h-full"
              : "rounded-lg shadow-2xl overflow-hidden border-4 border-green-500"
          }
        />
      )}
    </div>
  );
}
