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
  nodeIndex: number; // Index of the node this enemy is at
  parentNodeIndex: number | null; // Index of parent node (null for root)
  unlocked: boolean; // Always true - all enemies spawn immediately (kept for compatibility)
  childrenNodeIndices: number[]; // Indices of child nodes
};

type TreeNode = {
  node: { x: number; y: number; level: number; index: number };
  left: TreeNode | null;
  right: TreeNode | null;
  traversalOrder?: number;
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
  private sortedEnemyLevels: number[] = [];
  private currentLevelIndex: number = 0;

  // Traversal tracking
  private enemyTraversalData: Array<{
    x: number;
    y: number;
    level: number;
    index: number;
  }> = [];
  private traversalDisplayObjects: Phaser.GameObjects.GameObject[] = [];
  private debugButton!: Phaser.GameObjects.Text;
  private treeDisplayButton!: Phaser.GameObjects.Text;
  private playerSpawnX: number = 0;
  private playerSpawnY: number = 0;
  private originalCameraZoom: number = 1;
  private originalCameraX: number = 0;
  private originalCameraY: number = 0;

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
  private enemyParentChildMap: Map<number, number[]> = new Map(); // nodeIndex -> children node indices
  private enemyParentMap: Map<number, number | null> = new Map(); // nodeIndex -> parent node index (null for root)
  private enemySpeed: number = 80;
  private enemyVsEnemyColliders: Phaser.Physics.Arcade.Collider[] = [];
  private enemyVsPlayerColliders: Phaser.Physics.Arcade.Collider[] = [];

  // Collectibles system
  private collectibles!: Phaser.Physics.Arcade.Group;
  private attackSpeedMultiplier: number = 1;
  private attackSpeedBuffTimer: number = 0;
  private speedBoostMultiplier: number = 1;
  private speedBoostTimer: number = 0;
  private attackBoostMultiplier: number = 1;
  private attackBoostTimer: number = 0;

  constructor() {
    super({ key: "DungeonScene" });
  }

  init(data: { character: string; enemyLevels?: number[]; mapName?: string }) {
    // Store init data for restart
    this.initData = data;

    if (data.character) {
      this.selectedCharacter = data.character;
    }
    if (data.enemyLevels && data.enemyLevels.length > 0) {
      this.enemyLevels = data.enemyLevels;
      // Sort enemy levels and set player to first level
      this.sortedEnemyLevels = [...data.enemyLevels].sort((a, b) => a - b);
      this.currentLevelIndex = 0;
      this.playerLevel = this.sortedEnemyLevels[0] || 1;
    } else {
      // Fallback: use default levels
      this.enemyLevels = [];
      this.sortedEnemyLevels = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
      this.currentLevelIndex = 0;
      this.playerLevel = 1;
    }
    // Set player health based on starting level
    this.playerMaxHealth = 100 + (this.playerLevel - 1) * 10;
    this.playerHealth = this.playerMaxHealth;
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
        // Exclude "nodes" and "Door" layers even if they have collider flag (Door is player spawn)
        if (
          layer.collider === true &&
          layer.name !== "nodes" &&
          layer.name !== "Door"
        ) {
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
          // Exclude "nodes" and "Door" layers even if they have collider flag (Door is player spawn)
          if (
            layer.collider === true &&
            layer.name !== "nodes" &&
            layer.name !== "Door"
          ) {
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

    // Find the Door layer to spawn the player
    const doorLayer = mapData.layers.find(
      (layer: {
        name: string;
        tiles: Array<{ x: number; y: number; id: string }>;
      }) => layer.name === "Door"
    );

    // Find the nodes layer for enemy spawning
    const nodesLayer = mapData.layers.find(
      (layer: {
        name: string;
        tiles: Array<{ x: number; y: number; id: string }>;
      }) => layer.name === "nodes"
    );

    let playerX = this.mapWidth * 0.5; // Default to center
    let playerY = this.mapHeight * 0.5;

    // Spawn player at Door tile (prefer center of door structure)
    if (doorLayer && doorLayer.tiles.length > 0) {
      // Group door tiles by Y position to find the middle row
      const tilesByY = new Map<
        number,
        Array<{ x: number; y: number; id: string }>
      >();
      doorLayer.tiles.forEach((tile: { x: number; y: number; id: string }) => {
        if (!tilesByY.has(tile.y)) {
          tilesByY.set(tile.y, []);
        }
        tilesByY.get(tile.y)!.push(tile);
      });

      // Find the middle Y position (center row of door)
      const yPositions = Array.from(tilesByY.keys()).sort((a, b) => a - b);
      const middleY = yPositions[Math.floor(yPositions.length / 2)];
      const middleRowTiles = tilesByY.get(middleY) || [];

      // Pick the center tile from the middle row, or first tile if no middle row
      let selectedDoor;
      if (middleRowTiles.length > 0) {
        middleRowTiles.sort((a, b) => a.x - b.x);
        const centerIndex = Math.floor(middleRowTiles.length / 2);
        selectedDoor = middleRowTiles[centerIndex];
      } else {
        // Fallback: use first tile sorted by Y then X
        const sortedDoors = [...doorLayer.tiles].sort((a, b) => {
          if (a.y !== b.y) return a.y - b.y;
          return a.x - b.x;
        });
        selectedDoor = sortedDoors[0];
      }

      // Convert tile coordinates to world coordinates
      playerX = (selectedDoor.x + 0.5) * tileSize * this.MAP_SCALE;
      playerY = (selectedDoor.y + 0.5) * tileSize * this.MAP_SCALE;
      // Store player spawn position for filtering
      this.playerSpawnX = playerX;
      this.playerSpawnY = playerY;
      console.log(
        `Player spawning at Door: tile (${selectedDoor.x}, ${selectedDoor.y}) -> world (${playerX}, ${playerY})`
      );
    }

    // Store all nodes for enemy pathfinding (only skull tiles with id "51")
    // Floor tiles (id "33") in the nodes layer represent paths/branches and are used for pathfinding
    if (nodesLayer && nodesLayer.tiles.length > 0) {
      // Filter to only include skull tiles (id "51") - these are enemy spawn nodes
      const skullNodes = nodesLayer.tiles.filter(
        (tile: { x: number; y: number; id: string }) => tile.id === "51"
      );

      // Sort nodes from top-most to bottom-most (then left to right)
      const sortedNodes = [...skullNodes].sort((a, b) => {
        if (a.y !== b.y) return a.y - b.y;
        return a.x - b.x;
      });

      // Store all nodes for enemy pathfinding using the sorted order
      this.nodes = sortedNodes.map((node: { x: number; y: number }) => ({
        x: (node.x + 0.5) * tileSize * this.MAP_SCALE,
        y: (node.y + 0.5) * tileSize * this.MAP_SCALE,
      }));

      console.log(
        `Found ${this.nodes.length} enemy spawn nodes (skulls) in nodes layer`
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

    // Debug button - top-right corner
    const screenWidth = this.cameras.main.width;
    this.debugButton = this.add
      .text(screenWidth - 16, 16, "DEBUG: Show Map", {
        fontFamily: "'Pixelify Sans', monospace",
        fontSize: "14px",
        color: "#ffaa00",
        backgroundColor: "#000000",
        padding: { x: 10, y: 6 },
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(10000)
      .setInteractive({ useHandCursor: true });

    this.debugButton.on("pointerdown", () => {
      if (this.enemyTraversalData.length > 0) {
        this.displayTraversedMap();
      } else {
        // If no traversal data yet, create it from current enemies
        const tempData = this.enemies
          .filter((e) => !e.defeated)
          .map((e, idx) => ({
            x: e.sprite.x,
            y: e.sprite.y,
            level: e.level,
            index: idx + 1,
          }));
        if (tempData.length > 0) {
          this.enemyTraversalData = tempData;
          this.displayTraversedMap();
        }
      }
    });

    // Add hover effect
    this.debugButton.on("pointerover", () => {
      this.debugButton.setStyle({ backgroundColor: "#333333" });
    });
    this.debugButton.on("pointerout", () => {
      this.debugButton.setStyle({ backgroundColor: "#000000" });
    });

    // Tree display button - below debug button
    this.treeDisplayButton = this.add
      .text(screenWidth - 16, 50, "Show Tree", {
        fontFamily: "'Pixelify Sans', monospace",
        fontSize: "14px",
        color: "#00ffcc",
        backgroundColor: "#000000",
        padding: { x: 10, y: 6 },
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(10000)
      .setInteractive({ useHandCursor: true });

    this.treeDisplayButton.on("pointerdown", () => {
      // Create traversal data from current enemies if not available
      if (this.enemyTraversalData.length === 0) {
        const tempData = this.enemies
          .filter((e) => !e.defeated)
          .map((e, idx) => ({
            x: e.sprite.x,
            y: e.sprite.y,
            level: e.level,
            index: idx + 1,
          }));
        if (tempData.length > 0) {
          this.enemyTraversalData = tempData;
        }
      }

      // Show tree display
      if (this.enemyTraversalData.length > 0) {
        this.displayTraversedMap();
      }
    });

    // Add hover effect
    this.treeDisplayButton.on("pointerover", () => {
      this.treeDisplayButton.setStyle({ backgroundColor: "#333333" });
    });
    this.treeDisplayButton.on("pointerout", () => {
      this.treeDisplayButton.setStyle({ backgroundColor: "#000000" });
    });

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

    if (this.attackBoostTimer > 0) {
      this.attackBoostTimer -= delta;
      if (this.attackBoostTimer <= 0) {
        this.attackBoostTimer = 0;
        this.attackBoostMultiplier = 1;

        // Show buff ended notification
        const buffEndText = this.add
          .text(
            this.cameras.main.scrollX + this.cameras.main.width / 2,
            this.cameras.main.scrollY + 100,
            "Attack Boost Ended",
            {
              fontFamily: "'Pixelify Sans', monospace",
              fontSize: "14px",
              color: "#ffaa00",
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
    // Get map data to access floors layer
    const mapData = this.cache.json.get("tilemap");
    if (!mapData) return;

    // Find the floors layer
    const floorsLayer = mapData.layers.find(
      (layer: {
        name: string;
        tiles: Array<{ x: number; y: number; id: string }>;
      }) => layer.name === "floors"
    );

    // Get tile size and map scale for coordinate conversion
    const tileSize = mapData.tileSize;
    let floorsTiles: Array<{ x: number; y: number; id: string }> = [];

    if (floorsLayer && floorsLayer.tiles && floorsLayer.tiles.length > 0) {
      floorsTiles = floorsLayer.tiles;
    } else {
      // Fallback: use nodes if floors layer not found
      console.warn("Floors layer not found, using nodes as fallback");
      if (!this.nodes.length) return;
      // Convert nodes to tile-like format for consistency
      floorsTiles = this.nodes.map((node, index) => ({
        x: Math.floor(node.x / (tileSize * this.MAP_SCALE)),
        y: Math.floor(node.y / (tileSize * this.MAP_SCALE)),
        id: `node-${index}`,
      }));
    }

    // Create collectibles on floors layer tiles
    const collectibleTypes = [
      { type: "health", color: 0x00ff00, label: "HP" },
      { type: "attack_speed", color: 0xff0000, label: "ATK SPD" },
      { type: "speed_boost", color: 0x00aaff, label: "SPD" },
      { type: "attack_boost", color: 0xffaa00, label: "ATK" },
    ];

    // Number of collectibles: roughly 1 per 20 floor tiles, with a maximum cap
    const collectibleCount = Math.min(
      Math.floor(floorsTiles.length / 20),
      15 // Maximum 15 collectibles per map
    );

    // Keep track of used texture keys to avoid conflicts
    const usedTextureKeys = new Set<string>();
    const usedFloorTiles = new Set<string>();

    // Spawn collectibles on random floor tiles
    let attempts = 0;
    const maxAttempts = floorsTiles.length * 2;

    while (usedTextureKeys.size < collectibleCount && attempts < maxAttempts) {
      attempts++;

      // Pick a random floor tile
      const randomTileIndex = Phaser.Math.Between(0, floorsTiles.length - 1);
      const floorTile = floorsTiles[randomTileIndex];
      const tileKey = `${floorTile.x}-${floorTile.y}`;

      // Skip if already used
      if (usedFloorTiles.has(tileKey)) continue;
      usedFloorTiles.add(tileKey);

      // Convert tile coordinates to world coordinates
      const collectibleX = (floorTile.x + 0.5) * tileSize * this.MAP_SCALE;
      const collectibleY = (floorTile.y + 0.5) * tileSize * this.MAP_SCALE;

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

      case "attack_boost":
        this.attackBoostMultiplier = 1.5;
        this.attackBoostTimer = 15000; // 15 seconds
        effectText = "+50% Attack Damage (15s)";
        textColor = "#ffaa00";
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

  // Left-priority depth-first traversal: start at top, always go left first, then right
  private traverseBinaryTreeLeftPriority(
    nodes: Array<{ x: number; y: number; index: number }>
  ): Array<{ x: number; y: number; index: number }> {
    if (nodes.length === 0) return [];

    const result: Array<{ x: number; y: number; index: number }> = [];
    const visited = new Set<number>();

    // Recursive left-priority pre-order traversal: process root, then ALL left subtree, then ALL right subtree
    // Within each subtree, maintain left-to-right order
    const leftPriorityTraverse = (
      nodeList: Array<{ x: number; y: number; index: number }>
    ) => {
      if (nodeList.length === 0) return;

      // Find root: topmost node (smallest Y), if tie use leftmost (smallest X)
      let rootIdx = 0;
      for (let i = 1; i < nodeList.length; i++) {
        if (
          nodeList[i].y < nodeList[rootIdx].y ||
          (nodeList[i].y === nodeList[rootIdx].y &&
            nodeList[i].x < nodeList[rootIdx].x)
        ) {
          rootIdx = i;
        }
      }

      const root = nodeList[rootIdx];

      // Skip if already visited
      if (visited.has(root.index)) return;
      visited.add(root.index);

      // Process current node (top/root)
      result.push(root);

      // Partition remaining nodes into left and right subtrees
      const remainingNodes = nodeList.filter(
        (n, i) => i !== rootIdx && !visited.has(n.index)
      );

      // Left subtree: all nodes with X < root.x
      const leftSubtree = remainingNodes.filter((n) => n.x < root.x);

      // Right subtree: all nodes with X > root.x
      const rightSubtree = remainingNodes.filter((n) => n.x > root.x);

      // Handle nodes with same X as root
      const sameXNodes = remainingNodes.filter((n) => n.x === root.x);
      sameXNodes.forEach((node) => {
        // Nodes above root (smaller Y) go to left, nodes below go to left by default
        leftSubtree.push(node);
      });

      // Sort left and right subtrees by Y (top to bottom), then X (left to right)
      // This ensures left-to-right traversal within each subtree
      leftSubtree.sort((a, b) => {
        if (a.y !== b.y) return a.y - b.y;
        return a.x - b.x;
      });
      rightSubtree.sort((a, b) => {
        if (a.y !== b.y) return a.y - b.y;
        return a.x - b.x;
      });

      // ALWAYS traverse ALL left subtree nodes first (complete left subtree before any right)
      if (leftSubtree.length > 0) {
        leftPriorityTraverse(leftSubtree);
      }

      // THEN traverse ALL right subtree nodes (only after left is completely done)
      if (rightSubtree.length > 0) {
        leftPriorityTraverse(rightSubtree);
      }
    };

    // Start traversal from all nodes
    leftPriorityTraverse(nodes);

    // Add any remaining unvisited nodes (fallback - should not happen)
    nodes.forEach((node) => {
      if (!visited.has(node.index)) {
        result.push(node);
      }
    });

    return result;
  }

  createEnemiesAtNodes() {
    if (!this.nodes.length) return;

    const shadowOffset = (this.FRAME_HEIGHT * this.SPRITE_SCALE) / 2 - 10;

    // Calculate number of enemies (all nodes, since first node is root with enemy, player spawns at Door)
    const numEnemies = this.nodes.length;

    // Use provided enemy levels, or fallback to default order
    // Fallback array has 12 elements to support map10 (10 enemies), map11 (11 enemies), and map12 (12 enemies)
    const enemyLevelsByOrder =
      this.enemyLevels.length > 0
        ? [...this.enemyLevels] // Create a copy to avoid modifying original
        : [1, 6, 5, 2, 7, 4, 3, 8, 9, 10, 11, 12];

    // Ensure unique levels - if there are duplicates, generate unique levels
    const usedLevels = new Set<number>();
    const uniqueLevels: number[] = [];

    // First, try to use provided levels without duplicates
    for (const level of enemyLevelsByOrder) {
      if (!usedLevels.has(level)) {
        uniqueLevels.push(level);
        usedLevels.add(level);
      }
    }

    // If we don't have enough unique levels, generate more
    if (uniqueLevels.length < numEnemies) {
      let nextLevel = 1;
      while (uniqueLevels.length < numEnemies) {
        if (!usedLevels.has(nextLevel)) {
          uniqueLevels.push(nextLevel);
          usedLevels.add(nextLevel);
        }
        nextLevel++;
        // Safety check to prevent infinite loop
        if (nextLevel > 100) break;
      }
    }

    // Note: Levels are assigned in pre-order traversal order (1, 2, 3, ...)
    // Left subtree gets levels 2, 3, 4... (in pre-order)
    // Right subtree gets levels after all left subtree nodes (in pre-order)

    // Add index to nodes for tracking - include ALL nodes
    const nodesWithIndex = this.nodes.map((node, index) => ({
      x: node.x,
      y: node.y,
      level: 0, // Will be assigned later
      index: index,
    }));

    // Get floor tiles for tree building - FOR MAP11: use ONLY floor tiles (id "33") from "nodes" layer
    // These floor tiles represent the paths/branches between enemy spawn points (skulls)
    const mapData = this.cache.json.get("tilemap");
    let floorTileWorldPositions: Array<{
      tileX: number;
      tileY: number;
      worldX: number;
      worldY: number;
    }> = [];
    let tileSize = 64; // Default

    if (mapData) {
      tileSize = mapData.tileSize;

      // For map11: Use ONLY floor tiles (id "33") from "nodes" layer as paths/branches
      const nodesLayer = mapData.layers.find(
        (layer: {
          name: string;
          tiles: Array<{ x: number; y: number; id: string }>;
        }) => layer.name === "nodes"
      );

      if (nodesLayer && nodesLayer.tiles && nodesLayer.tiles.length > 0) {
        // Filter for floor tiles (id "33") in the nodes layer - these are the tree paths
        const nodeFloorTiles = nodesLayer.tiles.filter(
          (tile: { x: number; y: number; id: string }) => tile.id === "33"
        );

        // Convert to world positions for pathfinding
        floorTileWorldPositions = nodeFloorTiles.map(
          (tile: { x: number; y: number; id: string }) => ({
            tileX: tile.x,
            tileY: tile.y,
            worldX:
              tile.x * tileSize * this.MAP_SCALE +
              (tileSize * this.MAP_SCALE) / 2,
            worldY:
              tile.y * tileSize * this.MAP_SCALE +
              (tileSize * this.MAP_SCALE) / 2,
          })
        );

        console.log(
          `Map11: Using ${nodeFloorTiles.length} floor tiles from nodes layer for tree pathfinding`
        );
      } else {
        // Fallback: try floors layer if nodes layer not found
        const floorsLayer = mapData.layers.find(
          (layer: {
            name: string;
            tiles: Array<{ x: number; y: number; id: string }>;
          }) => layer.name === "floors"
        );

        if (floorsLayer && floorsLayer.tiles && floorsLayer.tiles.length > 0) {
          const floorsTiles = floorsLayer.tiles;
          floorTileWorldPositions = floorsTiles.map(
            (tile: { x: number; y: number; id: string }) => ({
              tileX: tile.x,
              tileY: tile.y,
              worldX:
                tile.x * tileSize * this.MAP_SCALE +
                (tileSize * this.MAP_SCALE) / 2,
              worldY:
                tile.y * tileSize * this.MAP_SCALE +
                (tileSize * this.MAP_SCALE) / 2,
            })
          );
          console.log(
            `Fallback: Using ${floorsTiles.length} floor tiles from floors layer`
          );
        }
      }

      console.log(
        `Total floor tiles for pathfinding: ${floorTileWorldPositions.length}`
      );
    }

    // Build binary tree structure using floor pathfinding (same as display)
    const tree = this.buildBinaryTreeStructure(
      nodesWithIndex,
      floorTileWorldPositions,
      tileSize
    );

    if (!tree) return;

    // Verify tree structure: check if all parent-child relationships have valid floor paths
    // If a floor path is cut/blocked, that relationship is invalid
    const verifyTreeStructure = (
      node: TreeNode | null,
      parentNode: TreeNode | null
    ): boolean => {
      if (!node) return true;

      // If there's a parent, verify floor path exists
      if (parentNode) {
        const path = this.findPathThroughFloors(
          parentNode.node.x,
          parentNode.node.y,
          node.node.x,
          node.node.y,
          floorTileWorldPositions,
          tileSize
        );

        if (!path || path.length === 0) {
          // Floor path is cut - this relationship is invalid
          console.warn(
            `Invalid parent-child relationship: No floor path from node ${parentNode.node.index} to node ${node.node.index}`
          );
          return false;
        }
      }

      // Recursively verify left and right children
      const leftValid = verifyTreeStructure(node.left, node);
      const rightValid = verifyTreeStructure(node.right, node);

      return leftValid && rightValid;
    };

    // Verify and fix tree structure: remove invalid relationships where floor paths are cut
    const fixTreeStructure = (
      node: TreeNode | null,
      parentNode: TreeNode | null,
      availableNodes: Set<number>
    ): TreeNode | null => {
      if (!node) return null;

      // If there's a parent, verify floor path exists
      if (parentNode) {
        const path = this.findPathThroughFloors(
          parentNode.node.x,
          parentNode.node.y,
          node.node.x,
          node.node.y,
          floorTileWorldPositions,
          tileSize
        );

        if (!path || path.length === 0) {
          // Floor path is cut - remove this relationship
          console.warn(
            `Removing invalid relationship: No floor path from node ${parentNode.node.index} to node ${node.node.index}`
          );
          // Mark this node as available for reassignment
          availableNodes.add(node.node.index);
          return null;
        }
      }

      // Recursively fix left and right children
      const fixedLeft = fixTreeStructure(node.left, node, availableNodes);
      const fixedRight = fixTreeStructure(node.right, node, availableNodes);

      return {
        node: node.node,
        left: fixedLeft,
        right: fixedRight,
        traversalOrder: node.traversalOrder,
      };
    };

    // First verify
    const isValid = verifyTreeStructure(tree, null);

    // If invalid, try to fix by removing invalid relationships
    let workingTree: TreeNode | null = tree;
    if (!isValid) {
      console.warn(
        "Tree structure has invalid relationships, attempting to fix..."
      );
      const availableNodes = new Set<number>();
      workingTree = fixTreeStructure(tree, null, availableNodes);

      // If we have orphaned nodes, try to reassign them to valid parents
      if (availableNodes.size > 0 && workingTree) {
        const orphanedNodes = nodesWithIndex.filter((n) =>
          availableNodes.has(n.index)
        );
        console.log(
          `Found ${orphanedNodes.length} orphaned nodes, attempting reassignment...`
        );

        // Build a set of all node indices already in the tree to prevent duplicate assignments
        const nodesInTree = new Set<number>();
        const collectNodeIndices = (node: TreeNode | null) => {
          if (!node) return;
          nodesInTree.add(node.node.index);
          collectNodeIndices(node.left);
          collectNodeIndices(node.right);
        };
        collectNodeIndices(workingTree);

        // Try to find valid parents for orphaned nodes
        const reassignOrphans = (
          treeNode: TreeNode,
          orphans: typeof orphanedNodes
        ) => {
          if (orphans.length === 0) return;

          const remainingOrphans: typeof orphanedNodes = [];

          for (const orphan of orphans) {
            // Skip if this orphan is already in the tree (has a parent)
            if (nodesInTree.has(orphan.index)) {
              continue;
            }

            const path = this.findPathThroughFloors(
              treeNode.node.x,
              treeNode.node.y,
              orphan.x,
              orphan.y,
              floorTileWorldPositions,
              tileSize
            );

            if (path && path.length > 0) {
              // Found valid parent - determine if left or right child using same logic as tree building
              const dx = orphan.x - treeNode.node.x;
              const dy = orphan.y - treeNode.node.y;
              const xThreshold = tileSize * this.MAP_SCALE * 0.3;

              let shouldBeLeft = false;

              if (dx < -xThreshold) {
                // Orphan is clearly to the left
                shouldBeLeft = true;
              } else if (dx > xThreshold) {
                // Orphan is clearly to the right
                shouldBeLeft = false;
              } else {
                // Approximately vertically aligned - use path direction or Y position
                if (path.length > 1) {
                  const firstStepDx = path[1].x - path[0].x;
                  if (Math.abs(firstStepDx) > xThreshold) {
                    shouldBeLeft = firstStepDx < 0;
                  } else {
                    shouldBeLeft = dy <= 0;
                  }
                } else {
                  shouldBeLeft = dy <= 0;
                }
              }

              const orphanNode: TreeNode = {
                node: orphan,
                left: null,
                right: null,
                traversalOrder: 0,
              };

              if (shouldBeLeft) {
                // Should be left child
                if (!treeNode.left) {
                  treeNode.left = orphanNode;
                  nodesInTree.add(orphan.index); // Mark as now in tree
                  console.log(
                    `Reassigned orphan node ${orphan.index} as left child of ${treeNode.node.index}`
                  );
                } else {
                  remainingOrphans.push(orphan);
                }
              } else {
                // Should be right child
                if (!treeNode.right) {
                  treeNode.right = orphanNode;
                  nodesInTree.add(orphan.index); // Mark as now in tree
                  console.log(
                    `Reassigned orphan node ${orphan.index} as right child of ${treeNode.node.index}`
                  );
                } else {
                  remainingOrphans.push(orphan);
                }
              }
            } else {
              remainingOrphans.push(orphan);
            }
          }

          // Recursively try to reassign remaining orphans
          if (remainingOrphans.length > 0) {
            if (treeNode.left) reassignOrphans(treeNode.left, remainingOrphans);
            if (treeNode.right)
              reassignOrphans(treeNode.right, remainingOrphans);
          }
        };

        reassignOrphans(workingTree, orphanedNodes);
      }
    }

    // Use the working tree (fixed or original)
    if (!workingTree) {
      console.error("Failed to build valid tree structure");
      return;
    }

    // Validate that no node appears multiple times in the tree
    const nodeIndicesInTree = new Set<number>();
    const validateNoDuplicates = (node: TreeNode | null): boolean => {
      if (!node) return true;
      if (nodeIndicesInTree.has(node.node.index)) {
        console.error(
          `Duplicate node detected: node ${node.node.index} appears multiple times in tree`
        );
        return false;
      }
      nodeIndicesInTree.add(node.node.index);
      return (
        validateNoDuplicates(node.left) && validateNoDuplicates(node.right)
      );
    };

    if (!validateNoDuplicates(workingTree)) {
      console.error(
        "Tree structure has duplicate nodes, this should not happen"
      );
    }

    // Debug: Log tree structure for validation
    const logTreeStructure = (
      node: TreeNode | null,
      depth: number = 0,
      side: string = "root"
    ) => {
      if (!node) return;
      const indent = "  ".repeat(depth);
      console.log(
        `${indent}${side}: Node ${node.node.index} at (${node.node.x.toFixed(
          0
        )}, ${node.node.y.toFixed(0)})`
      );
      if (node.left) logTreeStructure(node.left, depth + 1, "left");
      if (node.right) logTreeStructure(node.right, depth + 1, "right");
    };
    console.log("Final tree structure:");
    logTreeStructure(workingTree);

    const finalTree = workingTree;

    // Build parent-child relationship maps from tree structure
    this.enemyParentChildMap.clear();
    this.enemyParentMap.clear();

    // Collect all nodes in pre-order traversal for level assignment
    const preOrderNodes: Array<{ x: number; y: number; index: number }> = [];

    const buildParentChildMap = (
      node: TreeNode | null,
      parentIndex: number | null,
      subtree: string = "root"
    ) => {
      if (!node) return;

      const nodeIndex = node.node.index;

      // Set parent
      this.enemyParentMap.set(nodeIndex, parentIndex);

      // Add to pre-order traversal list (root → left → right)
      // Pre-order: visit root, then ENTIRE left subtree, then ENTIRE right subtree
      preOrderNodes.push({
        x: node.node.x,
        y: node.node.y,
        index: nodeIndex,
      });

      console.log(
        `  Pre-order: Adding node ${nodeIndex} (${subtree} subtree) at position ${preOrderNodes.length}`
      );

      // Initialize children array
      const children: number[] = [];

      // Pre-order: Process left subtree COMPLETELY before right subtree
      // Add left child if exists - this will recursively process entire left subtree
      if (node.left) {
        const leftIndex = node.left.node.index;
        children.push(leftIndex);
        buildParentChildMap(node.left, nodeIndex, "left");
      }

      // Only after left subtree is completely processed, process right subtree
      // Add right child if exists - this will recursively process entire right subtree
      if (node.right) {
        const rightIndex = node.right.node.index;
        children.push(rightIndex);
        buildParentChildMap(node.right, nodeIndex, "right");
      }

      // Set children
      if (children.length > 0) {
        this.enemyParentChildMap.set(nodeIndex, children);
      }
    };

    // Build maps starting from root (no parent) - this also collects nodes in pre-order
    console.log("=== MAP11 TREE STRUCTURE - PRE-ORDER TRAVERSAL ===");
    buildParentChildMap(finalTree, null, "root");

    console.log(
      "\nParent-child map:",
      Array.from(this.enemyParentChildMap.entries())
    );
    console.log("Parent map:", Array.from(this.enemyParentMap.entries()));

    // Verify pre-order: root → entire left subtree → entire right subtree
    // Count nodes in each subtree to verify structure
    const countNodesInSubtree = (node: TreeNode | null): number => {
      if (!node) return 0;
      return (
        1 + countNodesInSubtree(node.left) + countNodesInSubtree(node.right)
      );
    };

    const leftSubtreeCount = countNodesInSubtree(finalTree.left);
    const rightSubtreeCount = countNodesInSubtree(finalTree.right);

    // In pre-order: root (1) → left subtree (2 to 1+leftCount) → right subtree (1+leftCount+1 to end)
    const rootNode = preOrderNodes[0];
    const leftSubtreeStart = 1; // After root
    const leftSubtreeEnd = 1 + leftSubtreeCount;
    const rightSubtreeStart = leftSubtreeEnd;
    const rightSubtreeEnd = preOrderNodes.length;

    console.log(`\nPre-order structure verification:`);
    console.log(`  Root: Node ${rootNode.index} (Level 1)`);
    console.log(
      `  Left subtree: ${leftSubtreeCount} nodes → Levels ${
        leftSubtreeStart + 1
      }-${leftSubtreeEnd}`
    );
    console.log(
      `    Nodes: ${preOrderNodes
        .slice(leftSubtreeStart, leftSubtreeEnd)
        .map((n) => n.index)
        .join(", ")}`
    );
    console.log(
      `  Right subtree: ${rightSubtreeCount} nodes → Levels ${
        rightSubtreeStart + 1
      }-${rightSubtreeEnd}`
    );
    console.log(
      `    Nodes: ${preOrderNodes
        .slice(rightSubtreeStart)
        .map((n) => n.index)
        .join(", ")}`
    );
    console.log(
      `\nFull pre-order traversal (defeat order):`,
      preOrderNodes.map((n, i) => `Lv${i + 1}:Node${n.index}`).join(" → ")
    );

    // Assign levels strictly in pre-order traversal order of binary search tree
    // Pre-order: root → left subtree (complete pre-order) → right subtree (complete pre-order)
    // The level indicates the order in which enemies should be defeated
    // Level 1 = root (first to defeat), then ALL left subtree, then ALL right subtree
    const nodeToLevelMap = new Map<number, number>();

    // Assign levels in pre-order traversal order (1, 2, 3, ...)
    // Pre-order: root → ENTIRE left subtree (complete pre-order) → ENTIRE right subtree (complete pre-order)
    // This ensures the player defeats enemies in the correct order: root → ALL left subtree → ALL right subtree
    // Player MUST clear all left subtree enemies (levels 2 to 1+leftCount) before any right subtree enemies
    preOrderNodes.forEach((node, index) => {
      // Level is simply the pre-order position (1-indexed)
      // Level 1 = root
      // Levels 2 to (1+leftSubtreeCount) = entire left subtree in pre-order
      // Levels (1+leftSubtreeCount+1) to end = entire right subtree in pre-order
      const assignedLevel = index + 1;

      nodeToLevelMap.set(node.index, assignedLevel);

      // Determine which subtree this node belongs to for logging
      let subtreeType = "ROOT";
      if (index >= leftSubtreeStart && index < leftSubtreeEnd) {
        subtreeType = "LEFT";
      } else if (index >= rightSubtreeStart) {
        subtreeType = "RIGHT";
      }

      console.log(
        `  Level ${assignedLevel} (${subtreeType}): Node ${
          node.index
        } at (${node.x.toFixed(0)}, ${node.y.toFixed(0)})`
      );
    });
    console.log("=== END TREE STRUCTURE ===\n");

    // Find orphaned nodes (nodes not in the tree - should be rare if tree is built correctly)
    const nodesInTree = new Set(preOrderNodes.map((n) => n.index));
    const orphanedNodes = nodesWithIndex.filter(
      (n) => !nodesInTree.has(n.index)
    );

    if (orphanedNodes.length > 0) {
      console.warn(
        `Warning: ${orphanedNodes.length} orphaned nodes not in tree structure:`,
        orphanedNodes.map((n) => n.index)
      );
    }

    // Store traversal data for display (using pre-order nodes)
    this.enemyTraversalData = preOrderNodes.map((node) => ({
      x: node.x,
      y: node.y,
      level: nodeToLevelMap.get(node.index) || 1,
      index: node.index,
    }));

    // Verify each node's left and right branches have valid floor paths
    const verifyBranches = (node: TreeNode | null): boolean => {
      if (!node) return true;

      let isValid = true;

      // Check left branch
      if (node.left) {
        const leftPath = this.findPathThroughFloors(
          node.node.x,
          node.node.y,
          node.left.node.x,
          node.left.node.y,
          floorTileWorldPositions,
          tileSize
        );

        if (!leftPath || leftPath.length === 0) {
          console.error(
            `Invalid left branch: Node ${node.node.index} has no floor path to left child ${node.left.node.index}`
          );
          isValid = false;
        }
      }

      // Check right branch
      if (node.right) {
        const rightPath = this.findPathThroughFloors(
          node.node.x,
          node.node.y,
          node.right.node.x,
          node.right.node.y,
          floorTileWorldPositions,
          tileSize
        );

        if (!rightPath || rightPath.length === 0) {
          console.error(
            `Invalid right branch: Node ${node.node.index} has no floor path to right child ${node.right.node.index}`
          );
          isValid = false;
        }
      }

      // Recursively check children
      const leftValid = verifyBranches(node.left);
      const rightValid = verifyBranches(node.right);

      return isValid && leftValid && rightValid;
    };

    // Verify all branches
    const branchesValid = verifyBranches(finalTree);
    if (!branchesValid) {
      console.error(
        "Tree structure validation failed: Some branches have no valid floor paths"
      );
    }

    // Create enemies for ALL nodes in nodesWithIndex
    // Use pre-order traversal order for nodes in tree, then add orphaned nodes
    console.log(
      `Creating enemies: ${preOrderNodes.length} nodes in tree, ${orphanedNodes.length} orphaned, ${nodesWithIndex.length} total nodes`
    );

    // Create enemies for all nodes - first from tree (pre-order), then orphaned
    nodesWithIndex.forEach((nodeData) => {
      const nodeIndex = nodeData.index;
      const node = this.nodes[nodeIndex];
      if (!node) {
        console.warn(
          `Node at index ${nodeIndex} not found in this.nodes array`
        );
        return;
      }

      // Get level from map (assigned in pre-order traversal)
      // Orphaned nodes get levels after all tree nodes
      let enemyLevel = nodeToLevelMap.get(nodeIndex);
      if (enemyLevel === undefined) {
        // This is an orphaned node - assign level after all tree nodes
        const orphanIndex = orphanedNodes.findIndex(
          (n) => n.index === nodeIndex
        );
        if (orphanIndex >= 0) {
          // Orphaned nodes get levels sequentially after tree nodes
          enemyLevel = preOrderNodes.length + orphanIndex + 1;
        } else {
          // Fallback: use index as level
          enemyLevel =
            preOrderNodes.length + orphanedNodes.length + nodeIndex + 1;
          console.warn(
            `Node ${nodeIndex} not in tree or orphaned list, using fallback level ${enemyLevel}`
          );
        }
      }

      // Get parent and children info (for reference, but all enemies spawn immediately)
      const parentNodeIndex = this.enemyParentMap.get(nodeIndex) ?? null;
      const childrenNodeIndices = this.enemyParentChildMap.get(nodeIndex) ?? [];

      // All enemies spawn immediately - no prerequisite system
      const isUnlocked = true;

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
        nodeIndex,
        parentNodeIndex,
        unlocked: isUnlocked,
        childrenNodeIndices,
      };

      // All enemies spawn immediately - start idle animation
      enemy.sprite.play("enemy-idle-down");

      this.enemies.push(enemy);
    });

    // Also create enemies for orphaned nodes (nodes not in tree structure)
    if (orphanedNodes.length > 0) {
      console.log(
        `Creating enemies for ${orphanedNodes.length} orphaned nodes`
      );

      orphanedNodes.forEach((orphan) => {
        const nodeIndex = orphan.index;
        const node = this.nodes[nodeIndex];
        if (!node) {
          console.warn(
            `Orphaned node at index ${nodeIndex} not found in this.nodes array`
          );
          return;
        }

        // Assign level for orphaned nodes (after all tree nodes in pre-order)
        const orphanIndex = orphanedNodes.indexOf(orphan);
        // Orphaned nodes get levels sequentially after tree nodes
        const enemyLevel = preOrderNodes.length + orphanIndex + 1;

        // Get parent and children info (for reference)
        const parentNodeIndex = this.enemyParentMap.get(nodeIndex) ?? null;
        const childrenNodeIndices =
          this.enemyParentChildMap.get(nodeIndex) ?? [];

        // All enemies spawn immediately - no prerequisite system
        const isUnlocked = true;

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

        const orphanBodyWidth = this.getCollisionWidth();
        const orphanBodyHeight = this.getCollisionHeight();
        const orphanBody = sprite.body as Phaser.Physics.Arcade.Body;
        orphanBody.setSize(
          orphanBodyWidth / this.SPRITE_SCALE,
          orphanBodyHeight / this.SPRITE_SCALE
        );
        const bodyOffsetY =
          (this.FRAME_OFFSET_BOTTOM - this.FRAME_OFFSET_TOP) / 2;
        orphanBody.setOffset(
          (this.FRAME_WIDTH - orphanBodyWidth / this.SPRITE_SCALE) / 2,
          (this.FRAME_HEIGHT - orphanBodyHeight / this.SPRITE_SCALE) / 2 +
            bodyOffsetY
        );
        orphanBody.setMaxVelocity(this.enemySpeed, this.enemySpeed);
        orphanBody.setDrag(600, 600);
        orphanBody.setAllowGravity(false);

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
          nodeIndex,
          parentNodeIndex,
          unlocked: isUnlocked,
          childrenNodeIndices,
        };

        // All enemies spawn immediately - start idle animation
        enemy.sprite.play("enemy-idle-down");

        this.enemies.push(enemy);
      });
    }

    console.log(`Total enemies created: ${this.enemies.length}`);

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
      if (enemy.defeated) return;
      const col = this.physics.add.collider(enemy.sprite, this.player);
      this.enemyVsPlayerColliders.push(col);
    });

    // Enemy vs enemy (prevent overlap)
    for (let i = 0; i < this.enemies.length; i++) {
      if (this.enemies[i].defeated) continue;
      for (let j = i + 1; j < this.enemies.length; j++) {
        if (this.enemies[j].defeated) continue;
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
        this.damageEnemy(enemyUnit, 50);
      }
    });
  }

  private getDamageAfterLevels(
    baseDamage: number,
    attackerLevel: number,
    defenderLevel: number
  ): number {
    const levelDiff = defenderLevel - attackerLevel; // positive when defender is higher level

    let multiplier = 1;

    // If enemy is same or lower level, increase damage
    if (levelDiff <= 0) {
      // Bonus damage when enemy is same or lower level
      const bonus = Math.abs(levelDiff) * 0.2; // 20% bonus per level below
      multiplier = 1 + bonus;
    } else {
      // Enemy is higher level, reduce damage
      const reduction = Math.min(0.8, levelDiff * 0.15);
      multiplier = 1 - reduction;
    }

    // Apply attack boost buff if active
    multiplier *= this.attackBoostMultiplier;

    multiplier = Phaser.Math.Clamp(multiplier, 0.2, 3.0); // Cap between 0.2x and 3.0x
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

    // Level up the player when defeating an enemy - move to next level from input list
    if (enemy.level === this.playerLevel && this.sortedEnemyLevels.length > 0) {
      // Move to next level in the sorted input list
      if (this.currentLevelIndex < this.sortedEnemyLevels.length - 1) {
        this.currentLevelIndex++;
        const nextLevel = this.sortedEnemyLevels[this.currentLevelIndex];
        const levelDifference = nextLevel - this.playerLevel;

        this.playerLevel = nextLevel;
        if (this.playerLevelText) {
          this.playerLevelText.setText(`Level: ${this.playerLevel}`);
        }

        // Increase max health by 10 per level difference
        this.playerMaxHealth += 10 * levelDifference;

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

    // Check if all enemies are defeated
    const allDefeated = this.enemies.every((e) => e.defeated);
    if (allDefeated && this.enemies.length > 0) {
      // Wait a bit for animations to complete, then show traversal map
      this.time.delayedCall(2000, () => {
        this.displayTraversedMap();
      });
    }
  }

  // Find path through floor tiles between two points using A* pathfinding
  private findPathThroughFloors(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    floorTiles: Array<{
      tileX: number;
      tileY: number;
      worldX: number;
      worldY: number;
    }>,
    tileSize: number
  ): Array<{ x: number; y: number }> | null {
    if (floorTiles.length === 0) return null;

    // Find closest floor tiles to start and end with a more generous tolerance
    // Allow finding floor tiles within 1.5 tile sizes (to handle nodes not exactly on floor centers)
    const maxSearchDistance = tileSize * this.MAP_SCALE * 1.5;
    let startTile: {
      tileX: number;
      tileY: number;
      worldX: number;
      worldY: number;
    } | null = null;
    let endTile: {
      tileX: number;
      tileY: number;
      worldX: number;
      worldY: number;
    } | null = null;
    let startDist = Infinity;
    let endDist = Infinity;

    for (const floor of floorTiles) {
      const distToStart = Math.sqrt(
        Math.pow(startX - floor.worldX, 2) + Math.pow(startY - floor.worldY, 2)
      );
      const distToEnd = Math.sqrt(
        Math.pow(endX - floor.worldX, 2) + Math.pow(endY - floor.worldY, 2)
      );

      if (distToStart < startDist && distToStart <= maxSearchDistance) {
        startDist = distToStart;
        startTile = floor;
      }
      if (distToEnd < endDist && distToEnd <= maxSearchDistance) {
        endDist = distToEnd;
        endTile = floor;
      }
    }

    // If no tiles found within tolerance, try again with unlimited distance
    if (!startTile || !endTile) {
      for (const floor of floorTiles) {
        const distToStart = Math.sqrt(
          Math.pow(startX - floor.worldX, 2) +
            Math.pow(startY - floor.worldY, 2)
        );
        const distToEnd = Math.sqrt(
          Math.pow(endX - floor.worldX, 2) + Math.pow(endY - floor.worldY, 2)
        );

        if (distToStart < startDist) {
          startDist = distToStart;
          startTile = floor;
        }
        if (distToEnd < endDist) {
          endDist = distToEnd;
          endTile = floor;
        }
      }
    }

    if (!startTile || !endTile) return null;

    // If start and end are the same tile, return a direct path
    const startKey = `${startTile.tileX},${startTile.tileY}`;
    const endKey = `${endTile.tileX},${endTile.tileY}`;

    if (startKey === endKey) {
      // Same tile - return path with start and end positions
      return [
        { x: startX, y: startY },
        { x: endX, y: endY },
      ];
    }

    // Create a map of floor tiles for quick lookup
    const tileMap = new Map<
      string,
      { tileX: number; tileY: number; worldX: number; worldY: number }
    >();
    for (const tile of floorTiles) {
      const key = `${tile.tileX},${tile.tileY}`;
      tileMap.set(key, tile);
    }

    // A* pathfinding
    const openSet: Array<{
      tile: { tileX: number; tileY: number; worldX: number; worldY: number };
      g: number;
      f: number;
      cameFrom: { tileX: number; tileY: number } | null;
    }> = [];
    const closedSet = new Set<string>();
    const gScore = new Map<string, number>();
    const fScore = new Map<string, number>();
    const cameFrom = new Map<string, { tileX: number; tileY: number } | null>();

    gScore.set(startKey, 0);
    fScore.set(
      startKey,
      Math.sqrt(
        Math.pow(startTile.worldX - endTile.worldX, 2) +
          Math.pow(startTile.worldY - endTile.worldY, 2)
      )
    );

    openSet.push({
      tile: startTile,
      g: 0,
      f: fScore.get(startKey)!,
      cameFrom: null,
    });

    while (openSet.length > 0) {
      // Find node with lowest f score
      openSet.sort((a, b) => a.f - b.f);
      const current = openSet.shift()!;
      const currentKey = `${current.tile.tileX},${current.tile.tileY}`;

      if (currentKey === endKey) {
        // Reconstruct path
        const path: Array<{ x: number; y: number }> = [];
        let pathKey: string | null = endKey;
        while (pathKey) {
          const pathTile = tileMap.get(pathKey);
          if (pathTile) {
            path.unshift({ x: pathTile.worldX, y: pathTile.worldY });
          }
          const from = cameFrom.get(pathKey);
          pathKey = from ? `${from.tileX},${from.tileY}` : null;
        }

        // Ensure path starts with actual start position and ends with actual end position
        // if they're close enough to the tile centers
        if (path.length > 0) {
          const startDist = Math.sqrt(
            Math.pow(startX - path[0].x, 2) + Math.pow(startY - path[0].y, 2)
          );
          const endDist = Math.sqrt(
            Math.pow(endX - path[path.length - 1].x, 2) +
              Math.pow(endY - path[path.length - 1].y, 2)
          );

          // If start/end are close to tile centers, use actual positions
          if (startDist < tileSize * this.MAP_SCALE * 0.5) {
            path[0] = { x: startX, y: startY };
          }
          if (endDist < tileSize * this.MAP_SCALE * 0.5) {
            path[path.length - 1] = { x: endX, y: endY };
          }
        }

        return path;
      }

      closedSet.add(currentKey);

      // Check neighbors (adjacent tiles)
      const neighbors = [
        { dx: -1, dy: 0 },
        { dx: 1, dy: 0 },
        { dx: 0, dy: -1 },
        { dx: 0, dy: 1 },
      ];

      for (const neighbor of neighbors) {
        const neighborTileX = current.tile.tileX + neighbor.dx;
        const neighborTileY = current.tile.tileY + neighbor.dy;
        const neighborKey = `${neighborTileX},${neighborTileY}`;

        if (closedSet.has(neighborKey)) continue;

        const neighborTile = tileMap.get(neighborKey);
        if (!neighborTile) continue;

        const tentativeG =
          (gScore.get(currentKey) || Infinity) +
          Math.sqrt(
            Math.pow(current.tile.worldX - neighborTile.worldX, 2) +
              Math.pow(current.tile.worldY - neighborTile.worldY, 2)
          );

        const neighborG = gScore.get(neighborKey) || Infinity;
        if (tentativeG < neighborG) {
          cameFrom.set(neighborKey, {
            tileX: current.tile.tileX,
            tileY: current.tile.tileY,
          });
          gScore.set(neighborKey, tentativeG);
          const h = Math.sqrt(
            Math.pow(neighborTile.worldX - endTile.worldX, 2) +
              Math.pow(neighborTile.worldY - endTile.worldY, 2)
          );
          fScore.set(neighborKey, tentativeG + h);

          // Add to open set if not already there
          if (
            !openSet.some(
              (n) => `${n.tile.tileX},${n.tile.tileY}` === neighborKey
            )
          ) {
            openSet.push({
              tile: neighborTile,
              g: tentativeG,
              f: tentativeG + h,
              cameFrom: {
                tileX: current.tile.tileX,
                tileY: current.tile.tileY,
              },
            });
          }
        }
      }
    }

    return null; // No path found
  }

  // Build binary tree structure based on enemy levels (lowest = root, left-to-right traversal)
  // Uses floor pathfinding to determine parent-child relationships
  private buildBinaryTreeStructure(
    nodes: Array<{ x: number; y: number; level: number; index: number }>,
    floorTiles: Array<{
      tileX: number;
      tileY: number;
      worldX: number;
      worldY: number;
    }>,
    tileSize: number,
    isRightSubtree: boolean = false
  ): TreeNode | null {
    if (nodes.length === 0) return null;

    // For map11: Root should be the topmost node (smallest Y), then leftmost if tie
    // This ensures consistent tree structure based on spatial position
    // Don't use levels for root selection - use spatial position only
    const sortedNodes = [...nodes].sort((a, b) => {
      // Sort by Y first (topmost), then X (leftmost)
      if (a.y !== b.y) return a.y - b.y; // Top to bottom
      return a.x - b.x; // Left to right
    });

    // Root: topmost node (smallest Y), or leftmost if same Y
    const root = sortedNodes[0];
    const remainingNodes = sortedNodes.slice(1);

    console.log(
      `Building tree: Root is node ${root.index} at (${root.x.toFixed(
        0
      )}, ${root.y.toFixed(0)})`
    );

    // Partition remaining nodes into left and right subtrees based on floor paths
    // This ensures all nodes are included and connections follow floor paths
    const leftSubtree: Array<{
      x: number;
      y: number;
      level: number;
      index: number;
    }> = [];
    const rightSubtree: Array<{
      x: number;
      y: number;
      level: number;
      index: number;
    }> = [];

    for (const node of remainingNodes) {
      // Find path from root to node through floor tiles
      const path = this.findPathThroughFloors(
        root.x,
        root.y,
        node.x,
        node.y,
        floorTiles,
        tileSize
      );

      if (path && path.length > 0) {
        // Valid floor path exists - determine direction based on actual node positions
        // Use the actual spatial relationship between root and node
        // This is more reliable than using path steps which might zigzag
        const dx = node.x - root.x;
        const dy = node.y - root.y;

        // Determine if node is to the left or right of root
        // Use X position as primary, with a small tolerance for vertical alignment
        // LEFT = nodes with smaller X (or same X, use Y as tiebreaker)
        // RIGHT = nodes with larger X
        const xThreshold = tileSize * this.MAP_SCALE * 0.3; // Small threshold for "same X"

        // LEFT subtree = nodes with SMALLER X (visually to the left) - gets levels 2,3,4... in pre-order
        // RIGHT subtree = nodes with LARGER X (visually to the right) - gets levels after left subtree
        // This ensures left-side nodes get lower levels (defeated first in pre-order)
        if (dx < -xThreshold) {
          // Node X < Root X -> Node is visually to the LEFT -> LEFT subtree (gets lower levels 2,3,4...)
          leftSubtree.push(node);
          console.log(
            `  Node ${node.index} (x:${node.x.toFixed(
              0
            )}) -> LEFT subtree (root x:${root.x.toFixed(0)}, dx:${dx.toFixed(
              1
            )})`
          );
        } else if (dx > xThreshold) {
          // Node X > Root X -> Node is visually to the RIGHT -> RIGHT subtree (gets higher levels after left)
          rightSubtree.push(node);
          console.log(
            `  Node ${node.index} (x:${node.x.toFixed(
              0
            )}) -> RIGHT subtree (root x:${root.x.toFixed(0)}, dx:${dx.toFixed(
              1
            )})`
          );
        } else {
          // Node is approximately vertically aligned with root (same X)
          // For same X: use Y position as tiebreaker
          // LEFT = nodes above root (smaller Y) - gets lower levels
          // RIGHT = nodes below root (larger Y) - gets higher levels
          if (path.length > 1) {
            const firstStepDx = path[1].x - path[0].x;
            if (Math.abs(firstStepDx) > xThreshold) {
              // First step has clear horizontal direction - use path direction
              if (firstStepDx < 0) {
                // Path goes left visually -> LEFT subtree (gets lower levels)
                leftSubtree.push(node);
                console.log(
                  `  Node ${node.index} (same X, path left) -> LEFT subtree`
                );
              } else {
                // Path goes right visually -> RIGHT subtree (gets higher levels)
                rightSubtree.push(node);
                console.log(
                  `  Node ${node.index} (same X, path right) -> RIGHT subtree`
                );
              }
            } else {
              // Path starts vertically - use Y position
              // LEFT = smaller Y (above) - gets lower levels, RIGHT = larger Y (below) - gets higher levels
              if (dy < 0) {
                // Node is above root -> LEFT subtree (gets lower levels)
                leftSubtree.push(node);
                console.log(
                  `  Node ${node.index} (same X, above root) -> LEFT subtree`
                );
              } else {
                // Node is below or at same Y as root -> RIGHT subtree (gets higher levels)
                rightSubtree.push(node);
                console.log(
                  `  Node ${node.index} (same X, below root) -> RIGHT subtree`
                );
              }
            }
          } else {
            // Single step path or no path - use Y position
            // LEFT = smaller Y (above) - gets lower levels, RIGHT = larger Y (below) - gets higher levels
            if (dy < 0) {
              // Node is above root -> LEFT subtree (gets lower levels)
              leftSubtree.push(node);
              console.log(
                `  Node ${node.index} (same X, above root, no path) -> LEFT subtree`
              );
            } else {
              // Node is below or at same Y as root -> RIGHT subtree (gets higher levels)
              rightSubtree.push(node);
              console.log(
                `  Node ${node.index} (same X, below root, no path) -> RIGHT subtree`
              );
            }
          }
        }
      } else {
        // No floor path found - use spatial position as fallback
        // LEFT = smaller X (visually left) - gets lower levels
        // RIGHT = larger X (visually right) - gets higher levels
        console.warn(
          `No floor path from root (node ${root.index}) to node ${node.index}, using spatial position fallback`
        );
        if (node.x < root.x) {
          // Node is visually to the left (smaller X) -> LEFT subtree (gets lower levels)
          leftSubtree.push(node);
        } else if (node.x > root.x) {
          // Node is visually to the right (larger X) -> RIGHT subtree (gets higher levels)
          rightSubtree.push(node);
        } else {
          // Same X - use Y as tiebreaker
          if (node.y < root.y) {
            // Node is above (smaller Y) -> LEFT subtree (gets lower levels)
            leftSubtree.push(node);
          } else {
            // Node is below or same Y -> RIGHT subtree (gets higher levels)
            rightSubtree.push(node);
          }
        }
      }
    }

    // If this is a right subtree node, it should not have a left branch
    // Move any left children to the right subtree
    if (isRightSubtree && leftSubtree.length > 0) {
      rightSubtree.push(...leftSubtree);
      leftSubtree.length = 0;
    }

    // Sort subtrees by spatial position (Y then X) for consistent tree building
    // This ensures consistent ordering within each subtree for pre-order traversal
    leftSubtree.sort((a, b) => {
      if (a.y !== b.y) return a.y - b.y; // Top to bottom
      return a.x - b.x; // Left to right
    });
    rightSubtree.sort((a, b) => {
      if (a.y !== b.y) return a.y - b.y; // Top to bottom
      return a.x - b.x; // Left to right
    });

    console.log(
      `  Left subtree: ${leftSubtree.length} nodes (will get levels 2-${
        1 + leftSubtree.length
      })`
    );
    console.log(
      `  Right subtree: ${rightSubtree.length} nodes (will get levels ${
        2 + leftSubtree.length
      }-${1 + leftSubtree.length + rightSubtree.length})`
    );

    // Recursively build subtrees
    return {
      node: root,
      left:
        leftSubtree.length > 0
          ? this.buildBinaryTreeStructure(
              leftSubtree,
              floorTiles,
              tileSize,
              false
            )
          : null,
      right:
        rightSubtree.length > 0
          ? this.buildBinaryTreeStructure(
              rightSubtree,
              floorTiles,
              tileSize,
              true
            )
          : null,
    };
  }

  // Assign traversal order numbers to tree nodes (in-order: left, root, right)
  private assignTraversalOrder(
    tree: TreeNode | null,
    orderCounter: { value: number }
  ): void {
    if (!tree) return;

    // Traverse left subtree first
    if (tree.left) {
      this.assignTraversalOrder(tree.left, orderCounter);
    }

    // Assign order to current node
    tree.traversalOrder = orderCounter.value++;

    // Traverse right subtree
    if (tree.right) {
      this.assignTraversalOrder(tree.right, orderCounter);
    }
  }

  displayTraversedMap() {
    if (this.enemyTraversalData.length === 0) return;

    const { width, height } = this.cameras.main;

    // Clear any existing display
    this.hideTraversedMap();

    // Hide buttons while map is displayed
    if (this.debugButton) {
      this.debugButton.setVisible(false);
    }
    if (this.treeDisplayButton) {
      this.treeDisplayButton.setVisible(false);
    }

    // Filter out player spawn position (Door location)
    const enemyNodesOnly = this.enemyTraversalData.filter((node) => {
      const distance = Math.sqrt(
        Math.pow(node.x - this.playerSpawnX, 2) +
          Math.pow(node.y - this.playerSpawnY, 2)
      );
      return distance > 10;
    });

    if (enemyNodesOnly.length === 0) return;

    // Get map data to access floors layer for tree building and branch pathfinding
    const mapData = this.cache.json.get("tilemap");
    let floorTileWorldPositions: Array<{
      tileX: number;
      tileY: number;
      worldX: number;
      worldY: number;
    }> = [];
    let tileSize = 64; // Default

    if (mapData) {
      // Find the floors layer
      const floorsLayer = mapData.layers.find(
        (layer: {
          name: string;
          tiles: Array<{ x: number; y: number; id: string }>;
        }) => layer.name === "floors"
      );

      if (floorsLayer && floorsLayer.tiles && floorsLayer.tiles.length > 0) {
        tileSize = mapData.tileSize;
        const floorsTiles = floorsLayer.tiles;

        // Convert floor tile coordinates to world coordinates
        floorTileWorldPositions = floorsTiles.map(
          (tile: { x: number; y: number; id: string }) => ({
            tileX: tile.x,
            tileY: tile.y,
            worldX:
              tile.x * tileSize * this.MAP_SCALE +
              (tileSize * this.MAP_SCALE) / 2,
            worldY:
              tile.y * tileSize * this.MAP_SCALE +
              (tileSize * this.MAP_SCALE) / 2,
          })
        );
      }
    }

    // Build binary tree structure using floor pathfinding (nodes stay at enemy positions)
    const tree = this.buildBinaryTreeStructure(
      [...enemyNodesOnly],
      floorTileWorldPositions,
      tileSize
    );
    if (!tree) return;

    // Assign traversal order numbers
    const orderCounter = { value: 1 };
    this.assignTraversalOrder(tree, orderCounter);

    // Calculate bounds of all nodes to fit the entire tree in view
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    const calculateBounds = (node: TreeNode | null) => {
      if (!node) return;
      const x = node.node.x;
      const y = node.node.y;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      calculateBounds(node.left);
      calculateBounds(node.right);
    };

    calculateBounds(tree);

    // Add padding around the tree
    const padding = 200;
    const treeWidth = maxX - minX + padding * 2;
    const treeHeight = maxY - minY + padding * 2;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    // Save original camera state
    this.originalCameraZoom = this.cameras.main.zoom;
    this.originalCameraX = this.cameras.main.scrollX;
    this.originalCameraY = this.cameras.main.scrollY;

    // Stop camera from following player
    this.cameras.main.stopFollow();

    // Calculate zoom level to fit entire tree
    const viewportWidth = width;
    const viewportHeight = height;
    const zoomX = viewportWidth / treeWidth;
    const zoomY = viewportHeight / treeHeight;
    const zoom = Math.min(zoomX, zoomY, 1.0); // Don't zoom in, only out

    // Set camera to center on tree and zoom out
    this.cameras.main.setZoom(zoom);
    this.cameras.main.centerOn(centerX, centerY);

    // Graphics for tree connections (use world coordinates, not screen)
    const graphics = this.add.graphics();
    graphics.setDepth(20001);

    // Draw tree structure recursively at actual world positions
    const drawTree = (
      node: TreeNode | null,
      parentX: number | null,
      parentY: number | null
    ) => {
      if (!node) return;

      const x = node.node.x;
      const y = node.node.y;

      // Draw connection to parent through floor tiles
      if (parentX !== null && parentY !== null) {
        graphics.lineStyle(3, 0x00ffcc, 0.8);
        const path = this.findPathThroughFloors(
          parentX,
          parentY,
          x,
          y,
          floorTileWorldPositions,
          tileSize
        );

        if (path && path.length > 0) {
          graphics.moveTo(path[0].x, path[0].y);
          for (let i = 1; i < path.length; i++) {
            graphics.lineTo(path[i].x, path[i].y);
          }
          graphics.strokePath();
        } else {
          // Fallback: draw direct line if no path found
          graphics.moveTo(parentX, parentY);
          graphics.lineTo(x, y);
          graphics.strokePath();
        }
      }

      // Draw left child
      if (node.left) {
        drawTree(node.left, x, y);
      }

      // Draw right child
      if (node.right) {
        drawTree(node.right, x, y);
      }

      // Draw node circle at actual world position
      const nodeCircle = this.add.circle(x, y, 25, 0x00ffcc, 0.9);
      nodeCircle.setDepth(20002);
      this.traversalDisplayObjects.push(nodeCircle);

      // Draw level number (large, in center)
      const levelText = this.add
        .text(x, y, node.node.level.toString(), {
          fontFamily: "'Pixelify Sans', monospace",
          fontSize: "20px",
          color: "#000000",
        })
        .setOrigin(0.5)
        .setDepth(20003);
      this.traversalDisplayObjects.push(levelText);

      // Draw traversal order number (small, top-left of circle)
      const orderText = this.add
        .text(x - 20, y - 20, (node.traversalOrder || 0).toString(), {
          fontFamily: "'Pixelify Sans', monospace",
          fontSize: "14px",
          color: "#ffffff",
          backgroundColor: "#000000",
          padding: { x: 4, y: 2 },
        })
        .setOrigin(0.5)
        .setDepth(20003);
      this.traversalDisplayObjects.push(orderText);
    };

    // Draw the tree at actual world positions
    drawTree(tree, null, null);
    this.traversalDisplayObjects.push(graphics);

    // Title (screen space)
    const title = this.add
      .text(width / 2, 80, "BINARY TREE - LEFT TO RIGHT TRAVERSAL", {
        fontFamily: "'Pixelify Sans', monospace",
        fontSize: "28px",
        color: "#00ffcc",
        align: "center",
        backgroundColor: "#000000",
        padding: { x: 15, y: 8 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(20001);
    this.traversalDisplayObjects.push(title);

    // Legend (screen space)
    const legendY = height - 120;
    const legendText = this.add
      .text(
        width / 2,
        legendY,
        "Numbers in circles = Enemy Levels | Small numbers = Traversal Order",
        {
          fontFamily: "'Pixelify Sans', monospace",
          fontSize: "14px",
          color: "#ffffff",
          align: "center",
          backgroundColor: "#000000",
          padding: { x: 10, y: 5 },
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(20001);
    this.traversalDisplayObjects.push(legendText);

    // Close button (screen space)
    const closeButton = this.add
      .text(width / 2, height - 60, "Press SPACE to Close", {
        fontFamily: "'Pixelify Sans', monospace",
        fontSize: "18px",
        color: "#00ffcc",
        backgroundColor: "#000000",
        padding: { x: 15, y: 8 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(20001)
      .setInteractive({ useHandCursor: true });

    closeButton.on("pointerdown", () => {
      this.hideTraversedMap();
    });
    this.traversalDisplayObjects.push(closeButton);

    // Also allow closing with space key
    const spaceKey = this.input.keyboard?.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE
    );
    if (spaceKey) {
      spaceKey.once("down", () => {
        this.hideTraversedMap();
      });
    }
  }

  hideTraversedMap() {
    this.traversalDisplayObjects.forEach((obj) => {
      if (obj && obj.active) {
        obj.destroy();
      }
    });
    this.traversalDisplayObjects = [];

    // Restore original camera state
    this.cameras.main.setZoom(this.originalCameraZoom);
    this.cameras.main.setScroll(this.originalCameraX, this.originalCameraY);

    // Resume camera following player
    if (this.player && this.player.active) {
      this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    }

    // Show buttons again
    if (this.debugButton) {
      this.debugButton.setVisible(true);
    }
    if (this.treeDisplayButton) {
      this.treeDisplayButton.setVisible(true);
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

    if (parsed.length < 10 || parsed.length > 12) {
      alert(
        "Please enter 10-12 integers between 1 and 100 (comma or space separated)"
      );
      return;
    }

    // Check for duplicates
    const uniqueLevels = new Set(parsed);
    if (uniqueLevels.size !== parsed.length) {
      const duplicates = parsed.filter(
        (value, index) => parsed.indexOf(value) !== index
      );
      const uniqueDuplicates = [...new Set(duplicates)];
      alert(
        `Duplicate levels detected: ${uniqueDuplicates.join(
          ", "
        )}\n\nPlease ensure all levels are unique.`
      );
      return;
    }

    // All checks passed
    setEnemyLevels(parsed);
    setShowLevelInput(false);
  };

  const generateRandomLevels = () => {
    // Randomly choose between 10, 11, or 12 enemies
    const count = Math.floor(Math.random() * 3) + 10; // Generates 10, 11, or 12

    // Generate unique random levels between 1 and 100
    const usedLevels = new Set<number>();
    const randomLevels: number[] = [];

    // Generate unique random levels
    while (randomLevels.length < count) {
      const randomLevel = Math.floor(Math.random() * 100) + 1; // 1-100
      if (!usedLevels.has(randomLevel)) {
        usedLevels.add(randomLevel);
        randomLevels.push(randomLevel);
      }

      // Safety check: if we can't generate enough unique numbers in reasonable range,
      // expand the range or use sequential numbers
      if (randomLevels.length < count && usedLevels.size >= 100) {
        // If we've used all numbers 1-100, start using numbers beyond 100
        let nextLevel = 101;
        while (randomLevels.length < count) {
          randomLevels.push(nextLevel);
          nextLevel++;
        }
        break;
      }
    }

    // Shuffle the array for randomness
    for (let i = randomLevels.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [randomLevels[i], randomLevels[j]] = [randomLevels[j], randomLevels[i]];
    }

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
