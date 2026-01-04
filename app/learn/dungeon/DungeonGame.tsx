"use client";

import { useEffect, useRef, useState } from "react";
import Phaser from "phaser";
import { Pixelify_Sans } from "next/font/google";
import { MapRenderer } from "./modules/mapRenderer";
import { AnimationManager } from "./modules/animationManager";
import { PlayerController } from "./modules/playerController";
import { EnemyController } from "./modules/enemyController";
import { CollectiblesController } from "./modules/collectiblesController";
import { LightingController } from "./modules/lightingController";
import { TorchController } from "./modules/torchController";
import { UIController } from "./modules/uiController";
import { LevelController } from "./modules/levelController";
import { TreeTraversalController } from "./modules/treeTraversalController";
import { WisdomController } from "./modules/wisdomController";
import { GAME_CONSTANTS } from "./modules/constants";
import { UltScene } from "./scenes/UltScene";
import { CharacterPicker } from "./components/CharacterPicker";
import type { EnemyUnit } from "./modules/types";
import { MobileControls, type VirtualInput } from "./modules/mobileControls";

const pixelFont = Pixelify_Sans({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

// UltScene moved to ./scenes/UltScene.ts

class DungeonScene extends Phaser.Scene {
  // Leveling - managed by LevelController

  // Traversal tracking
  private enemyTraversalData: Array<{
    x: number;
    y: number;
    level: number;
    index: number;
  }> = [];
  private playerSpawnX: number = 0;
  private playerSpawnY: number = 0;

  // Controllers
  private playerController!: PlayerController;
  private enemyController!: EnemyController;
  private collectiblesController!: CollectiblesController;
  private lightingController!: LightingController;
  private torchController!: TorchController;
  private uiController!: UIController;
  private levelController!: LevelController;
  private treeTraversalController!: TreeTraversalController;
  private wisdomController!: WisdomController;
  private mobileControls!: MobileControls;
  private lastScreenWidth: number = 0;

  // Core game objects
  private player!: Phaser.Physics.Arcade.Sprite;
  private playerShadow!: Phaser.GameObjects.Ellipse;
  private mapWidth!: number;
  private mapHeight!: number;
  private wallColliders!: Phaser.Physics.Arcade.StaticGroup;
  private debugKey!: Phaser.Input.Keyboard.Key;
  private selectedCharacter: string = "gojo";
  private enemyLevels: number[] = [];
  private mapName: string = "map.json";
  private initData: {
    character: string;
    enemyLevels?: number[];
    mapName?: string;
  } = { character: "gojo" };

  // Game state
  private nodes: Array<{ x: number; y: number }> = [];
  private torches!: Phaser.Physics.Arcade.Group;
  private collectibles!: Phaser.Physics.Arcade.Group;

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
    } else {
      // Fallback: use default levels
      this.enemyLevels = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    }
    this.mapName = data.mapName || "map.json";
  }

  preload() {
    // Load menu button image
    this.load.image("menu-button", "/sprite/menu.png");
    
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
        frameWidth: GAME_CONSTANTS.FRAME_WIDTH,
        frameHeight: GAME_CONSTANTS.FRAME_HEIGHT,
      }
    );

    this.load.spritesheet(
      "player-run",
      `/sprite/characters/${this.selectedCharacter}/run.png`,
      {
        frameWidth: GAME_CONSTANTS.FRAME_WIDTH,
        frameHeight: GAME_CONSTANTS.FRAME_HEIGHT,
      }
    );

    // Load character-specific skill sprite
    if (this.selectedCharacter === "goku") {
      this.load.spritesheet(
        "player-skill",
        `/sprite/characters/${this.selectedCharacter}/spellcast.png`,
        {
          frameWidth: GAME_CONSTANTS.FRAME_WIDTH,
          frameHeight: GAME_CONSTANTS.FRAME_HEIGHT,
        }
      );
    } else if (this.selectedCharacter === "ferd") {
      this.load.spritesheet(
        "player-skill",
        `/sprite/characters/${this.selectedCharacter}/thrust_oversize.png`,
        {
          frameWidth: GAME_CONSTANTS.SLASH_FRAME_WIDTH,
          frameHeight: GAME_CONSTANTS.SLASH_FRAME_HEIGHT,
        }
      );
    } else {
      this.load.spritesheet(
        "player-skill",
        `/sprite/characters/${this.selectedCharacter}/slash_oversize.png`,
        {
          frameWidth: GAME_CONSTANTS.SLASH_FRAME_WIDTH,
          frameHeight: GAME_CONSTANTS.SLASH_FRAME_HEIGHT,
        }
      );
    }

    this.load.spritesheet(
      "player-jump",
      `/sprite/characters/${this.selectedCharacter}/jump.png`,
      {
        frameWidth: GAME_CONSTANTS.FRAME_WIDTH,
        frameHeight: GAME_CONSTANTS.FRAME_HEIGHT,
      }
    );

    // Load Ferdinand as enemy
    this.load.spritesheet("enemy-idle", "/sprite/characters/ferd/idle.png", {
      frameWidth: GAME_CONSTANTS.FRAME_WIDTH,
      frameHeight: GAME_CONSTANTS.FRAME_HEIGHT,
    });

    this.load.spritesheet("enemy-run", "/sprite/characters/ferd/run.png", {
      frameWidth: GAME_CONSTANTS.FRAME_WIDTH,
      frameHeight: GAME_CONSTANTS.FRAME_HEIGHT,
    });

    this.load.spritesheet(
      "enemy-attack",
      "/sprite/characters/ferd/thrust_oversize.png",
      {
        frameWidth: GAME_CONSTANTS.SLASH_FRAME_WIDTH,
        frameHeight: GAME_CONSTANTS.SLASH_FRAME_HEIGHT,
      }
    );

    this.load.spritesheet("enemy-hurt", "/sprite/characters/ferd/hurt.png", {
      frameWidth: GAME_CONSTANTS.FRAME_WIDTH,
      frameHeight: GAME_CONSTANTS.FRAME_HEIGHT,
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
    this.lastScreenWidth = width;

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
    this.mapWidth = mapWidthInTiles * tileSize * GAME_CONSTANTS.MAP_SCALE;
    this.mapHeight = mapHeightInTiles * tileSize * GAME_CONSTANTS.MAP_SCALE;

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

    // Map rendering handled by MapRenderer

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
      "wisdom", // 11 - Wisdom tiles
      "Layer_9", // 12 - Empty layer
    ];

    // Use MapRenderer to render all layers (removes duplicate code)
    const mapRenderer = new MapRenderer(
      this,
      GAME_CONSTANTS.MAP_SCALE,
      this.wallColliders
    );
    const DEPTH_PER_LAYER = 10;
    mapRenderer.renderLayers(
      {
        tileSize,
        layers: mapData.layers,
      },
      layerRenderOrder,
      DEPTH_PER_LAYER
    );

    // Find the spawn layer to spawn the player
    const spawnLayer = mapData.layers.find(
      (layer: {
        name: string;
        tiles?: Array<{ x: number; y: number; id: string }>;
      }) => layer.name === "spawn"
    );

    // Find the nodes layer for enemy spawning
    const nodesLayer = mapData.layers.find(
      (layer: {
        name: string;
        tiles?: Array<{ x: number; y: number; id: string }>;
      }) => layer.name === "nodes"
    );

    let playerX = this.mapWidth * 0.5; // Default to center
    let playerY = this.mapHeight * 0.5;

    // Spawn player at spawn tile (prefer center of spawn structure)
    if (spawnLayer && spawnLayer.tiles && spawnLayer.tiles.length > 0) {
      // Group spawn tiles by Y position to find the middle row
      const tilesByY = new Map<
        number,
        Array<{ x: number; y: number; id: string }>
      >();
      spawnLayer.tiles.forEach((tile: { x: number; y: number; id: string }) => {
        if (!tilesByY.has(tile.y)) {
          tilesByY.set(tile.y, []);
        }
        tilesByY.get(tile.y)!.push(tile);
      });

      // Find the middle Y position (center row of spawn)
      const yPositions = Array.from(tilesByY.keys()).sort((a, b) => a - b);
      const middleY = yPositions[Math.floor(yPositions.length / 2)];
      const middleRowTiles = tilesByY.get(middleY) || [];

      // Pick the center tile from the middle row, or first tile if no middle row
      let selectedSpawn;
      if (middleRowTiles.length > 0) {
        middleRowTiles.sort((a, b) => a.x - b.x);
        const centerIndex = Math.floor(middleRowTiles.length / 2);
        selectedSpawn = middleRowTiles[centerIndex];
      } else {
        // Fallback: use first tile sorted by Y then X
        const sortedSpawns = [...spawnLayer.tiles].sort((a, b) => {
          if (a.y !== b.y) return a.y - b.y;
          return a.x - b.x;
        });
        selectedSpawn = sortedSpawns[0];
      }

      // Convert tile coordinates to world coordinates
      playerX = (selectedSpawn.x + 0.5) * tileSize * GAME_CONSTANTS.MAP_SCALE;
      playerY = (selectedSpawn.y + 0.5) * tileSize * GAME_CONSTANTS.MAP_SCALE;
      // Store player spawn position for filtering
      this.playerSpawnX = playerX;
      this.playerSpawnY = playerY;
      console.log(
        `Player spawning at spawn: tile (${selectedSpawn.x}, ${selectedSpawn.y}) -> world (${playerX}, ${playerY})`
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
        x: (node.x + 0.5) * tileSize * GAME_CONSTANTS.MAP_SCALE,
        y: (node.y + 0.5) * tileSize * GAME_CONSTANTS.MAP_SCALE,
      }));

      console.log(
        `Found ${this.nodes.length} enemy spawn nodes (skulls) in nodes layer`
      );
    }

    // Create shadow underneath the player
    const shadowOffset =
      (GAME_CONSTANTS.FRAME_HEIGHT * GAME_CONSTANTS.SPRITE_SCALE) / 2 - 10;
    this.playerShadow = this.add.ellipse(
      playerX,
      playerY + shadowOffset,
      50,
      20,
      0x000000,
      0.3
    );
    this.playerShadow.setDepth(1000);
    this.playerShadow.setVisible(true);

    // Create player as a physics sprite
    this.player = this.physics.add.sprite(playerX, playerY, "player-idle");
    this.player.setScale(GAME_CONSTANTS.SPRITE_SCALE);
    this.player.setOrigin(0.5, 0.5);
    this.player.setDepth(1001); // High depth to ensure it's visible on top of map
    this.player.setVisible(true); // Explicitly ensure visibility

    // Set up player physics body with adjusted collision box
    const bodyWidth =
      (GAME_CONSTANTS.FRAME_WIDTH -
        GAME_CONSTANTS.FRAME_OFFSET_LEFT -
        GAME_CONSTANTS.FRAME_OFFSET_RIGHT) *
      GAME_CONSTANTS.SPRITE_SCALE;
    const bodyHeight =
      (GAME_CONSTANTS.FRAME_HEIGHT -
        GAME_CONSTANTS.FRAME_OFFSET_TOP -
        GAME_CONSTANTS.FRAME_OFFSET_BOTTOM) *
      GAME_CONSTANTS.SPRITE_SCALE;
    const physicsBody = this.player.body as Phaser.Physics.Arcade.Body;

    physicsBody.setSize(
      bodyWidth / GAME_CONSTANTS.SPRITE_SCALE,
      bodyHeight / GAME_CONSTANTS.SPRITE_SCALE
    );

    const bodyOffsetY =
      (GAME_CONSTANTS.FRAME_OFFSET_BOTTOM - GAME_CONSTANTS.FRAME_OFFSET_TOP) /
      2;
    physicsBody.setOffset(
      (GAME_CONSTANTS.FRAME_WIDTH - bodyWidth / GAME_CONSTANTS.SPRITE_SCALE) /
        2,
      (GAME_CONSTANTS.FRAME_HEIGHT - bodyHeight / GAME_CONSTANTS.SPRITE_SCALE) /
        2 +
        bodyOffsetY
    );

    this.player.setCollideWorldBounds(false);
    physicsBody.setMaxVelocity(
      GAME_CONSTANTS.PLAYER_SPEED,
      GAME_CONSTANTS.PLAYER_SPEED
    );
    physicsBody.setDrag(600, 600);
    physicsBody.setAllowGravity(false);
    physicsBody.setImmovable(false);

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

    // Initialize controllers
    const initialLevelForEnemies =
      this.enemyLevels.length > 0 ? Math.min(...this.enemyLevels) : 1;
    this.enemyController = new EnemyController(
      this,
      this.wallColliders,
      this.player,
      initialLevelForEnemies
    );
    this.enemyTraversalData = this.enemyController.createEnemiesAtNodes(
      this.nodes,
      this.enemyLevels,
      mapData,
      GAME_CONSTANTS.MAP_SCALE
    );
    // Note: levelController needs to be initialized after enemyController

    // Create torches
    this.torches = this.physics.add.group();
    this.torchController = new TorchController(this, this.torches, this.player);
    this.torchController.createTorches(mapData, this.nodes, GAME_CONSTANTS.MAP_SCALE);
    this.physics.add.overlap(
      this.player,
      this.torches,
      (player, torch) => {
        const timeRemaining = this.torchController.collectTorch(torch);
        this.lightingController.setVisionRadius(
          this.torchController.getVisionRadius()
        );
      },
      undefined,
      this
    );

    // Create collectibles
    this.collectibles = this.physics.add.group();
    this.collectiblesController = new CollectiblesController(
      this,
      this.collectibles,
      this.player
    );
    this.collectiblesController.createCollectibles(
      mapData,
      this.nodes,
      GAME_CONSTANTS.MAP_SCALE
    );
    this.physics.add.overlap(
      this.player,
      this.collectibles,
      (player, item) => {
        const result = this.collectiblesController.collectItem(item);
        if (result?.healAmount) {
          const newHealth = Math.min(
            this.playerController.getMaxHealth(),
            this.playerController.getHealth() + result.healAmount
          );
          this.playerController.setHealth(newHealth);
          this.uiController.updateHealthBar();
        }
        this.playerController.setSpeedBoost(
          this.collectiblesController.getSpeedBoostMultiplier()
        );
        this.playerController.setAttackSpeedBoost(
          this.collectiblesController.getAttackSpeedMultiplier()
        );
        this.playerController.setAttackBoost(
          this.collectiblesController.getAttackBoostMultiplier()
        );
      },
      undefined,
      this
    );

    // Create lighting system
    this.lightingController = new LightingController(this, this.player);

    // Create animations using AnimationManager
    AnimationManager.createPlayerAnimations(this, this.selectedCharacter);
    AnimationManager.createEnemyAnimations(this);

    // Initialize player controller
    const initialLevel =
      this.enemyLevels.length > 0 ? Math.min(...this.enemyLevels) : 1;
    const playerMaxHealth = 100; // Fixed max health
    const playerHealth = playerMaxHealth;
    this.playerController = new PlayerController(
      this,
      this.player,
      this.playerShadow,
      this.selectedCharacter,
      playerHealth,
      playerMaxHealth,
      this.mapWidth,
      this.mapHeight
    );

    // Initialize UI controller
    this.uiController = new UIController(
      this,
      this.playerController,
      initialLevel
    );
    this.uiController.createUI(
      this.mapWidth,
      this.mapHeight,
      () => this.handleDebugClick(),
      () => this.handleTreeDisplayClick()
    );
    this.uiController.createDebugOverlays(this.player.x, this.player.y);

    // Initialize mobile controls
    this.mobileControls = new MobileControls(this);
    const hasUlt = this.selectedCharacter === "goku";
    this.mobileControls.createControls(width, height, hasUlt);

    // Initialize level controller (after enemyController is created)
    this.levelController = new LevelController(
      this,
      this.playerController,
      this.enemyController,
      this.uiController,
      initialLevel,
      this.enemyLevels
    );

    // Initialize tree traversal controller
    this.treeTraversalController = new TreeTraversalController(
      this,
      this.player,
      this.playerSpawnX,
      this.playerSpawnY,
      () => this.uiController.hideButtons(),
      () => this.uiController.showButtons(),
      () => this.uiController.hideHUD(),
      () => this.uiController.showHUD(),
      () => this.mobileControls.hideControls(),
      () => this.mobileControls.showControls()
    );

    // Initialize wisdom controller
    this.wisdomController = new WisdomController(this, this.player, (fact) => {
      // Dispatch custom event to React component
      const event = new CustomEvent("show-wisdom", { detail: fact });
      window.dispatchEvent(event);
    });
    this.wisdomController.initializeWisdomTiles(
      mapData,
      GAME_CONSTANTS.MAP_SCALE
    );

    console.log("Wisdom controller initialized");

    // Listen for player attack hits
    this.events.on("player-attack-hit", (enemy: EnemyUnit) => {
      const playerLevel = this.levelController.getPlayerLevel();
      
      // If facing an enemy higher level than player, reduce damage to 1
      // (The "player-attack-hit" event only fires when player is facing the enemy)
      if (enemy.level > playerLevel) {
        const damage = 1;
        const defeated = this.enemyController.damageEnemy(
          enemy,
          damage,
          playerLevel
        );
        if (defeated) {
          this.enemyController.defeatEnemy(enemy);
          this.levelController.handleEnemyDefeat(enemy, () => {
            this.treeTraversalController.displayTraversedMap(
              this.enemyTraversalData
            );
          });
        }
        return; // Early return, skip normal damage calculation
      }

      let damage =
        GAME_CONSTANTS.PLAYER_BASE_DAMAGE *
        this.collectiblesController.getAttackBoostMultiplier();

      // Apply crit if special buff is active
      const critRate = this.collectiblesController.getCritRate();
      if (critRate > 0 && Math.random() < critRate) {
        const critMultiplier =
          this.collectiblesController.getCritDamageMultiplier();
        damage *= critMultiplier;
        // Show crit text
        const critText = this.add.text(
          enemy.sprite.x,
          enemy.sprite.y - 80,
          "CRITICAL!",
          {
            fontFamily: "'Pixelify Sans', monospace",
            fontSize: "20px",
            color: "#ff00ff",
            stroke: "#000000",
            strokeThickness: 4,
          }
        );
        critText.setDepth(1300);
        this.tweens.add({
          targets: critText,
          y: critText.y - 30,
          alpha: 0,
          duration: 1000,
          onComplete: () => critText.destroy(),
        });
      }

      const defeated = this.enemyController.damageEnemy(
        enemy,
        damage,
        playerLevel
      );
      if (defeated) {
        this.enemyController.defeatEnemy(enemy);
        this.levelController.handleEnemyDefeat(enemy, () => {
          this.treeTraversalController.displayTraversedMap(
            this.enemyTraversalData
          );
        });
      }
    });

    // UI is now handled by UIController

    // Torch controller initialized above

    // Keyboard controls moved to PlayerController (except debug key)
    this.debugKey = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.F
    );
  }

  private handleDebugClick() {
    try {
      if (this.enemyTraversalData && this.enemyTraversalData.length > 0) {
        this.treeTraversalController.displayTraversedMap(
          this.enemyTraversalData
        );
      } else {
        // If no traversal data yet, create it from current enemies
        const enemies = this.enemyController.getEnemies();
        if (!enemies || enemies.length === 0) {
          console.warn("No enemies available to display tree");
          return;
        }
        const tempData = enemies
          .filter(
            (e) =>
              e &&
              !e.defeated &&
              e.sprite &&
              typeof e.sprite.x === "number" &&
              typeof e.sprite.y === "number"
          )
          .map((e, idx) => ({
            x: e.sprite.x,
            y: e.sprite.y,
            level: e.level || 1,
            index: idx + 1,
          }));
        if (tempData.length > 0) {
          this.enemyTraversalData = tempData;
          this.treeTraversalController.displayTraversedMap(
            this.enemyTraversalData
          );
        } else {
          console.warn("No valid enemy data found");
        }
      }
    } catch (error) {
      console.error("Error handling debug click:", error);
    }
  }

  private handleTreeDisplayClick() {
    try {
      // Create traversal data from current enemies if not available
      if (!this.enemyTraversalData || this.enemyTraversalData.length === 0) {
        const enemies = this.enemyController.getEnemies();
        if (!enemies || enemies.length === 0) {
          console.warn("No enemies available to display tree");
          return;
        }
        const tempData = enemies
          .filter(
            (e) =>
              e &&
              !e.defeated &&
              e.sprite &&
              typeof e.sprite.x === "number" &&
              typeof e.sprite.y === "number"
          )
          .map((e, idx) => ({
            x: e.sprite.x,
            y: e.sprite.y,
            level: e.level || 1,
            index: idx + 1,
          }));
        if (tempData.length > 0) {
          this.enemyTraversalData = tempData;
        } else {
          console.warn("No valid enemy data found");
          return;
        }
      }

      // Show tree display
      if (this.enemyTraversalData && this.enemyTraversalData.length > 0) {
        this.treeTraversalController.displayTraversedMap(
          this.enemyTraversalData
        );
      }
    } catch (error) {
      console.error("Error handling tree display click:", error);
    }
  }

  // getCollisionWidth/getCollisionHeight moved to PlayerController
  // createAnimations() moved to AnimationManager
  // Legacy animation code removed - use AnimationManager instead

  update(time: number, delta: number) {
    if (!this.player) return;

    // If player is dead, don't update gameplay
    if (this.playerController.getHealth() <= 0) return;

    // Check if screen size changed and update mobile controls visibility
    const { width } = this.cameras.main;
    if (Math.abs(width - this.lastScreenWidth) > 10) {
      // Screen size changed significantly, update controls visibility
      this.lastScreenWidth = width;
      if (this.mobileControls) {
        this.mobileControls.updateControlsVisibility();
      }
    }

    // Update controllers
    // Get virtual input from mobile controls if on mobile
    let virtualInput: VirtualInput | undefined = undefined;
    if (this.mobileControls && this.mobileControls.isMobileDevice()) {
      virtualInput = this.mobileControls.getVirtualInput();
      // Reset justPressed flags after processing
      this.mobileControls.resetJustPressedFlags();
    }
    this.playerController.update(delta, this.enemyController.getEnemies(), virtualInput);
    this.enemyController.update(delta, (enemy, damage) => {
      this.damagePlayer(damage, enemy.level);
    });

    // Update torch controller
    this.torchController.update(delta);
    this.lightingController.setVisionRadius(
      this.torchController.getVisionRadius()
    );

    // Update collectibles controller (buff timers)
    this.collectiblesController.update(delta, (type) => {
      const buffNames: Record<string, string> = {
        attack_speed: "Attack Speed Buff Ended",
        speed_boost: "Speed Boost Ended",
        attack_boost: "Attack Boost Ended",
        special_buff: "Special Buff Ended",
      };
      const buffColors: Record<string, string> = {
        attack_speed: "#ff0000",
        speed_boost: "#00aaff",
        attack_boost: "#ffaa00",
        special_buff: "#9d00ff",
      };

      const buffEndText = this.add
        .text(
          this.cameras.main.scrollX + this.cameras.main.width / 2,
          this.cameras.main.scrollY + 100,
          buffNames[type] || "Buff Ended",
          {
            fontFamily: "'Pixelify Sans', monospace",
            fontSize: "14px",
            color: buffColors[type] || "#ffffff",
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

      // Update player controller multipliers
      this.playerController.setSpeedBoost(
        this.collectiblesController.getSpeedBoostMultiplier()
      );
      this.playerController.setAttackSpeedBoost(
        this.collectiblesController.getAttackSpeedMultiplier()
      );
      this.playerController.setAttackBoost(
        this.collectiblesController.getAttackBoostMultiplier()
      );
    });

    // Update lighting
    this.lightingController.update();

    // Update wisdom controller
    this.wisdomController.update();

    // Check for F key press to toggle debug mode
    if (Phaser.Input.Keyboard.JustDown(this.debugKey)) {
      this.uiController.toggleDebugMode(this.wallColliders, this.player);
    }

    // Update debug overlay positions
    this.uiController.updateDebugOverlays(this.player);

    // Update buff timers (including torch)
    const buffTimers = this.collectiblesController.getBuffTimers();
    const torchTime = this.torchController.getTorchTimeRemaining();
    this.uiController.updateBuffTimers(buffTimers, torchTime);
  }

  // Player actions moved to PlayerController
  // Lighting, torches, and collectibles moved to controllers
  // Legacy collectibles code removed - use CollectiblesController instead

  // collectItem moved to CollectiblesController
  // traverseBinaryTreeLeftPriority removed - use TreeBuilder instead

  // createEnemiesAtNodes moved to EnemyController - removed legacy implementation

  // setupEnemyColliders, updateEnemies, updateEnemyHealthBar moved to EnemyController

  damagePlayer(damage: number, enemyLevel: number) {
    const newHealth = this.playerController.getHealth() - damage;
    this.playerController.setHealth(newHealth);
    this.uiController.updateHealthBar();

    // Shake the camera only if enemy is 2+ levels higher
    const levelDiff = enemyLevel - this.levelController.getPlayerLevel();
    if (levelDiff >= 2) {
      this.cameras.main.shake(150, 0.005);
    }

    // Check for game over
    if (newHealth <= 0) {
      this.playerController.setHealth(0);
      this.uiController.updateHealthBar();
      this.gameOver();
    }
  }

  // Methods moved to modules:
  // - findPathThroughFloors -> Pathfinding.findPathThroughFloors
  // - buildBinaryTreeStructure -> TreeBuilder.buildBinaryTreeStructure
  // - assignTraversalOrder -> TreeBuilder.assignTraversalOrder
  // - displayTraversedMap/hideTraversedMap -> TreeTraversalController

  gameOver() {
    // Stop all movement
    this.player.setVelocity(0, 0);

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

  // checkPlayerAttackHitsEnemy() moved to PlayerController

  // getDamageAfterLevels and damageEnemy moved to EnemyController

  // Methods moved to modules:
  // - findPathThroughFloors -> Pathfinding.findPathThroughFloors
  // - buildBinaryTreeStructure -> TreeBuilder.buildBinaryTreeStructure
  // - assignTraversalOrder -> TreeBuilder.assignTraversalOrder
  // - displayTraversedMap/hideTraversedMap -> TreeTraversalController

  // updateLighting() moved to LightingController
}

// AnimatedSprite and CharacterPicker moved to ./components/

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
  const [showWisdom, setShowWisdom] = useState(false);
  const [wisdomFact, setWisdomFact] = useState<{
    title: string;
    content: string;
  } | null>(null);
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

    // Listen for wisdom events from Phaser scene
    // Use a custom event system since Phaser game events might not work as expected
    const handleWisdomEvent = (event: Event) => {
      const customEvent = event as CustomEvent<{
        title: string;
        content: string;
      }>;
      if (customEvent.detail) {
        console.log("Wisdom event received:", customEvent.detail);
        setWisdomFact(customEvent.detail);
        setShowWisdom(true);
      }
    };

    window.addEventListener("show-wisdom", handleWisdomEvent);
    console.log("Wisdom event listener registered");

    // Listen for tutorial event
    const handleTutorialEvent = () => {
      setShowTutorial(true);
    };
    window.addEventListener("show-tutorial", handleTutorialEvent);

    // Listen for exit event
    const handleExitEvent = () => {
      // Reset game state to go back to title screen
      setSelectedCharacter(null);
      setEnemyLevels([]);
      setLevelInput("");
      setShowLevelInput(false);
      setShowPicker(false);
      setShowTitleScreen(true);
    };
    window.addEventListener("exit-game", handleExitEvent);

    // Pass character data, enemy levels, and map name to scene
    gameRef.current.scene.start("DungeonScene", {
      character: selectedCharacter,
      enemyLevels: enemyLevels,
      mapName: mapName,
    });

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("show-wisdom", handleWisdomEvent);
      window.removeEventListener("show-tutorial", handleTutorialEvent);
      window.removeEventListener("exit-game", handleExitEvent);
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
                                10-12 levels. Use &quot;Generate Random
                                Levels&quot; for a quick start.
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

      {/* Wisdom Modal - Available during gameplay */}
      {showWisdom && wisdomFact && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/80"
            onClick={() => setShowWisdom(false)}
          />
          {/* Wisdom Content */}
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
              onClick={() => setShowWisdom(false)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-amber-900 hover:text-amber-700 transition-colors font-bold text-2xl"
            >
              ×
            </button>

            {/* Wisdom Text Content */}
            <div className="px-8 py-6 text-amber-900">
              <h2 className="text-3xl font-bold mb-4 text-center">
                {wisdomFact.title}
              </h2>
              <div className="space-y-4 text-lg leading-relaxed">
                <p>{wisdomFact.content}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
