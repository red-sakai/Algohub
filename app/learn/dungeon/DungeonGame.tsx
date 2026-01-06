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
import type { EnemyUnit } from "./modules/types";
import { MobileControls, type VirtualInput } from "./modules/mobileControls";
import { AudioController } from "./modules/audioController";
import { LoadingScreen } from "./components/LoadingScreen";
import { GameModal } from "./components/GameModal";
import { PhysicsHelper } from "./modules/physicsHelper";
import { MagicEffectsController } from "./modules/magicEffectsController";
import {
  pauseGlobalAudio,
  resumeGlobalAudio,
} from "./modules/globalAudioHelper";
import { TitleScreen } from "./components/TitleScreen";
import { LevelSelectionScreen } from "./components/LevelSelectionScreen";
import { CharacterSelectionScreen } from "./components/CharacterSelectionScreen";
import { TutorialContent } from "./components/TutorialContent";
import {
  validateLevelInput,
  generateRandomLevels as generateLevels,
} from "./utils/levelUtils";

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
  private audioController!: AudioController;
  private magicEffectsController!: MagicEffectsController;
  private lastScreenWidth: number = 0;

  // Core game objects
  private player!: Phaser.Physics.Arcade.Sprite;
  private playerShadow!: Phaser.GameObjects.Ellipse;
  private mapWidth!: number;
  private mapHeight!: number;
  private wallColliders!: Phaser.Physics.Arcade.StaticGroup;
  private debugKey!: Phaser.Input.Keyboard.Key;
  private lightingToggleKey!: Phaser.Input.Keyboard.Key;
  private godModeKey!: Phaser.Input.Keyboard.Key;
  private speedBoostKey!: Phaser.Input.Keyboard.Key;
  private selectedCharacter: string = "gojo";
  private enemyLevels: number[] = [];
  private mapName: string = "map.json";
  private isAdmin: boolean = false;
  private initData: {
    character: string;
    enemyLevels?: number[];
    mapName?: string;
  } = { character: "gojo" };

  // Game state
  private nodes: Array<{ x: number; y: number }> = [];
  private torches!: Phaser.Physics.Arcade.Group;
  private collectibles!: Phaser.Physics.Arcade.Group;
  public gameStarted: boolean = false;

  constructor() {
    super({ key: "DungeonScene" });
  }

  init(data: { character: string; enemyLevels?: number[]; mapName?: string }) {
    // Store init data for restart
    this.initData = data;

    if (data.character) {
      this.selectedCharacter = data.character;
    }
    // Set admin flag if character is gojo
    this.isAdmin = this.selectedCharacter === "gojo";
    if (data.enemyLevels && data.enemyLevels.length > 0) {
      this.enemyLevels = data.enemyLevels;
    } else {
      // Fallback: use default levels
      this.enemyLevels = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    }
    this.mapName = data.mapName || "map.json";
  }

  preload() {
    // Initialize audio controller and load audio
    this.audioController = new AudioController(this);
    this.audioController.preload();

    // Load menu button image
    this.load.image("menu-button", "/sprite/menu.png");

    // Load the custom tilemap JSON and tileset spritesheet
    this.load.json("tilemap", `/sprite/map/${this.mapName}`);
    this.load.spritesheet("tiles", "/sprite/map/spritesheet.png", {
      frameWidth: 16,
      frameHeight: 16,
    });

    // Load player sprites from players folder
    this.load.spritesheet(
      "player-idle",
      `/sprite/characters/players/${this.selectedCharacter}/idle.png`,
      {
        frameWidth: GAME_CONSTANTS.FRAME_WIDTH,
        frameHeight: GAME_CONSTANTS.FRAME_HEIGHT,
      }
    );

    this.load.spritesheet(
      "player-run",
      `/sprite/characters/players/${this.selectedCharacter}/run.png`,
      {
        frameWidth: GAME_CONSTANTS.FRAME_WIDTH,
        frameHeight: GAME_CONSTANTS.FRAME_HEIGHT,
      }
    );

    // Load character attack/skill sprite
    // Note: Most characters use 192x192 frames, but warrior uses 128x128 frames
    const attackFrameWidth =
      this.selectedCharacter === "warrior"
        ? 128
        : GAME_CONSTANTS.SLASH_FRAME_WIDTH;
    const attackFrameHeight =
      this.selectedCharacter === "warrior"
        ? 128
        : GAME_CONSTANTS.SLASH_FRAME_HEIGHT;

    this.load.spritesheet(
      "player-skill",
      `/sprite/characters/players/${this.selectedCharacter}/attack.png`,
      {
        frameWidth: attackFrameWidth,
        frameHeight: attackFrameHeight,
      }
    );

    this.load.spritesheet(
      "player-jump",
      `/sprite/characters/players/${this.selectedCharacter}/jump.png`,
      {
        frameWidth: GAME_CONSTANTS.FRAME_WIDTH,
        frameHeight: GAME_CONSTANTS.FRAME_HEIGHT,
      }
    );

    // Load all enemy types from enemies folder
    GAME_CONSTANTS.ENEMY_TYPES.forEach((enemyType) => {
      this.load.spritesheet(
        `enemy-${enemyType}-idle`,
        `/sprite/characters/enemies/${enemyType}/idle.png`,
        {
          frameWidth: GAME_CONSTANTS.FRAME_WIDTH,
          frameHeight: GAME_CONSTANTS.FRAME_HEIGHT,
        }
      );

      this.load.spritesheet(
        `enemy-${enemyType}-run`,
        `/sprite/characters/enemies/${enemyType}/run.png`,
        {
          frameWidth: GAME_CONSTANTS.FRAME_WIDTH,
          frameHeight: GAME_CONSTANTS.FRAME_HEIGHT,
        }
      );

      this.load.spritesheet(
        `enemy-${enemyType}-attack`,
        `/sprite/characters/enemies/${enemyType}/attack.png`,
        {
          frameWidth: GAME_CONSTANTS.SLASH_FRAME_WIDTH,
          frameHeight: GAME_CONSTANTS.SLASH_FRAME_HEIGHT,
        }
      );

      this.load.spritesheet(
        `enemy-${enemyType}-hurt`,
        `/sprite/characters/enemies/${enemyType}/hurt.png`,
        {
          frameWidth: GAME_CONSTANTS.FRAME_WIDTH,
          frameHeight: GAME_CONSTANTS.FRAME_HEIGHT,
        }
      );
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

    // Explicitly enable keyboard input
    if (this.input.keyboard) {
      this.input.keyboard.enabled = true;
      console.log("Keyboard input explicitly enabled");
    } else {
      console.error("Keyboard plugin not available!");
    }

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

    // Set default zoom level
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
    this.torchController.createTorches(
      mapData,
      this.nodes,
      GAME_CONSTANTS.MAP_SCALE
    );
    this.physics.add.overlap(
      this.player,
      this.torches,
      (player, torch) => {
        this.torchController.collectTorch(torch);
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
    AnimationManager.createAllEnemyAnimations(this);

    // Initialize magic effects controller
    this.magicEffectsController = new MagicEffectsController(this);

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
      this.mapHeight,
      this.audioController,
      this.magicEffectsController
    );

    // Initialize UI controller
    this.uiController = new UIController(
      this,
      this.playerController,
      initialLevel,
      this.audioController
    );
    this.uiController.createUI(
      this.mapWidth,
      this.mapHeight,
      () => this.handleDebugClick(),
      () => this.handleTreeDisplayClick(),
      () => this.toggleLighting(),
      () => this.toggleGodMode(),
      () => this.increaseSpeed(),
      this.isAdmin
    );
    this.uiController.createDebugOverlays(this.player.x, this.player.y);

    // Initialize mobile controls
    this.mobileControls = new MobileControls(this);
    const hasUlt = false; // Ult skill disabled for all characters
    this.mobileControls.createControls(width, height, hasUlt);

    // Initialize audio controller
    this.audioController.create();

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

      // Create blood particle effect
      this.createBloodEffect(enemy.sprite.x, enemy.sprite.y);

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
          // Duck music when enemy is defeated
          if (this.audioController) {
            this.audioController.duckForDuration(400);
          }
          this.enemyController.defeatEnemy(enemy);
          this.levelController.handleEnemyDefeat(enemy, () => {
            if (this.treeTraversalController) {
              this.treeTraversalController.displayTraversedMap(
                this.enemyTraversalData
              );
            }
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
        // Duck music for critical hit
        if (this.audioController) {
          this.audioController.duckForDuration(500);
        }
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
        // Duck music when enemy is defeated
        if (this.audioController) {
          this.audioController.duckForDuration(400);
        }
        this.enemyController.defeatEnemy(enemy);
        this.levelController.handleEnemyDefeat(enemy, () => {
          if (this.treeTraversalController) {
            this.treeTraversalController.displayTraversedMap(
              this.enemyTraversalData
            );
          }
        });
      }
    });

    // UI is now handled by UIController

    // Torch controller initialized above

    // Keyboard controls moved to PlayerController (except debug keys for admin)
    if (this.isAdmin) {
      this.debugKey = this.input.keyboard!.addKey(
        Phaser.Input.Keyboard.KeyCodes.F
      );
      this.lightingToggleKey = this.input.keyboard!.addKey(
        Phaser.Input.Keyboard.KeyCodes.L
      );
      this.godModeKey = this.input.keyboard!.addKey(
        Phaser.Input.Keyboard.KeyCodes.G
      );
      this.speedBoostKey = this.input.keyboard!.addKey(
        Phaser.Input.Keyboard.KeyCodes.B
      );
    }

    // Dispatch scene ready event to React component
    window.dispatchEvent(new Event("scene-ready"));
  }

  private handleDebugClick() {
    try {
      if (this.enemyTraversalData && this.enemyTraversalData.length > 0) {
        if (!this.treeTraversalController) {
          console.warn("Tree traversal controller not yet initialized");
          return;
        }
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
          if (this.treeTraversalController) {
            this.treeTraversalController.displayTraversedMap(
              this.enemyTraversalData
            );
          }
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
        if (!this.treeTraversalController) {
          console.warn("Tree traversal controller not yet initialized");
          return;
        }
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

      // Update camera zoom based on new screen size
      let zoomLevel = 1;
      if (width < 640) {
        zoomLevel = 0.65;
      } else if (width < 768) {
        zoomLevel = 0.75;
      } else if (width < 1024) {
        zoomLevel = 0.85;
      }
      this.cameras.main.setZoom(zoomLevel);
    }

    // Update controllers
    // Get virtual input from mobile controls if on mobile
    let virtualInput: VirtualInput | undefined = undefined;
    if (this.mobileControls && this.mobileControls.isMobileDevice()) {
      virtualInput = this.mobileControls.getVirtualInput();
      // Reset justPressed flags after processing
      this.mobileControls.resetJustPressedFlags();
    }
    this.playerController.update(
      delta,
      this.enemyController.getEnemies(),
      virtualInput
    );
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

    // Update magic effects (projectiles)
    if (this.magicEffectsController) {
      this.magicEffectsController.update(delta);
    }

    // Admin-only debug controls
    if (this.isAdmin) {
      // Check for F key press to toggle debug mode
      if (Phaser.Input.Keyboard.JustDown(this.debugKey)) {
        this.uiController.toggleDebugMode(this.wallColliders, this.player);
      }

      // Check for L key press to toggle lighting
      if (Phaser.Input.Keyboard.JustDown(this.lightingToggleKey)) {
        this.toggleLighting();
      }

      // Check for G key press to toggle god mode
      if (Phaser.Input.Keyboard.JustDown(this.godModeKey)) {
        this.toggleGodMode();
      }

      // Check for B key press to boost speed
      if (Phaser.Input.Keyboard.JustDown(this.speedBoostKey)) {
        this.increaseSpeed();
      }

      // Update debug overlay positions
      this.uiController.updateDebugOverlays(this.player);
    }

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
    // God mode prevents damage
    if (this.isAdmin && this.godMode) {
      return;
    }

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

  // Admin debug methods
  private toggleLighting() {
    if (!this.isAdmin) return;
    this.lightingController.toggleLighting();
    const isEnabled = this.lightingController.isLightingEnabled();
    this.showAdminMessage(
      `Lighting: ${isEnabled ? "ON" : "OFF"}`,
      isEnabled ? "#ffaa00" : "#ff0000"
    );
  }

  private godMode: boolean = false;
  private toggleGodMode() {
    if (!this.isAdmin) return;
    this.godMode = !this.godMode;
    if (this.godMode) {
      // Set health to max and make invincible
      this.playerController.setHealth(this.playerController.getMaxHealth());
      this.uiController.updateHealthBar();
    }
    this.showAdminMessage(
      `God Mode: ${this.godMode ? "ON" : "OFF"}`,
      this.godMode ? "#00ff00" : "#ff0000"
    );
  }

  private increaseSpeed() {
    if (!this.isAdmin) return;
    const currentMultiplier = this.playerController.getSpeedBoost();
    const newMultiplier = currentMultiplier + 0.5;
    this.playerController.setSpeedBoost(newMultiplier);
    this.showAdminMessage(`Speed: ${newMultiplier.toFixed(1)}x`, "#00aaff");
  }

  private showAdminMessage(text: string, color: string) {
    const message = this.add
      .text(
        this.cameras.main.scrollX + this.cameras.main.width / 2,
        this.cameras.main.scrollY + 100,
        text,
        {
          fontFamily: "'Pixelify Sans', monospace",
          fontSize: "18px",
          color: color,
          backgroundColor: "#000000",
          padding: { x: 12, y: 6 },
          stroke: "#000000",
          strokeThickness: 2,
        }
      )
      .setOrigin(0.5)
      .setDepth(10002);

    this.tweens.add({
      targets: message,
      alpha: 0,
      duration: 1500,
      onComplete: () => message.destroy(),
    });
  }

  private createBloodEffect(x: number, y: number) {
    // Create multiple blood particles
    const particleCount = 8;
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount;
      const distance = 30 + Math.random() * 20;

      // Create blood particle as a circle
      const particle = this.add.circle(x, y, 3 + Math.random() * 3, 0xff0000);
      particle.setDepth(1500);

      const targetX = x + Math.cos(angle) * distance;
      const targetY = y + Math.sin(angle) * distance;

      // Animate particle outward with gravity
      this.tweens.add({
        targets: particle,
        x: targetX,
        y: targetY + 20, // Add gravity effect
        alpha: 0,
        scale: 0.3,
        duration: 400 + Math.random() * 200,
        ease: "Cubic.easeOut",
        onComplete: () => particle.destroy(),
      });
    }

    // Add blood splatter effect at hit point
    const splatter = this.add.circle(x, y, 15, 0xff0000, 0.6);
    splatter.setDepth(1499);
    this.tweens.add({
      targets: splatter,
      scale: 1.5,
      alpha: 0,
      duration: 300,
      onComplete: () => splatter.destroy(),
    });
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
  const [showGameTutorial, setShowGameTutorial] = useState(false);
  const [showWisdom, setShowWisdom] = useState(false);
  const [wisdomFact, setWisdomFact] = useState<{
    title: string;
    content: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGameActive, setIsGameActive] = useState(false);
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
    const result = validateLevelInput(levelInput);

    if (!result.success) {
      alert(result.error);
      return;
    }

    // All checks passed
    setEnemyLevels(result.levels!);
    setShowLevelInput(false);
    // Set loading state immediately when game is about to start
    setIsLoading(true);
    setIsGameActive(true);
    pauseGlobalAudio();
  };

  const generateRandomLevels = () => {
    setLevelInput(generateLevels());
  };

  useEffect(() => {
    if (!parentRef.current || !selectedCharacter || enemyLevels.length === 0)
      return;

    // Get window dimensions helper
    const getWindowSize = () => ({
      width: window.innerWidth,
      height: window.innerHeight,
    });

    // Define event handlers at the top level of useEffect
    const handleWisdomEvent = (event: Event) => {
      const customEvent = event as CustomEvent<{
        title: string;
        content: string;
      }>;
      if (customEvent.detail) {
        console.log("Wisdom event received:", customEvent.detail);
        setWisdomFact(customEvent.detail);
        setShowWisdom(true);
        // Pause game physics when showing wisdom
        const scene = PhysicsHelper.getScene(gameRef.current, "DungeonScene");
        PhysicsHelper.pausePhysics(scene, "Wisdom Modal");
      }
    };

    const handleTutorialEvent = () => {
      setShowGameTutorial(true);
    };

    const handleTutorialCloseEvent = () => {
      // Resume game physics when tutorial closes
      const scene = PhysicsHelper.getScene(gameRef.current, "DungeonScene");
      PhysicsHelper.resumePhysics(scene, "Tutorial Close");
    };

    const handleExitEvent = () => {
      // Reset game state to go back to title screen
      setSelectedCharacter(null);
      setEnemyLevels([]);
      setLevelInput("");
      setShowLevelInput(false);
      setShowPicker(false);
      setShowTitleScreen(true);
      setIsLoading(false);
      setIsGameActive(false);

      // Resume global audio when exiting
      resumeGlobalAudio();
    };

    const handleSceneReady = () => {
      setIsLoading(false);
      setIsGameActive(true);
      // Show tutorial after loading screen is hidden
      setTimeout(() => {
        const scene = PhysicsHelper.getScene(
          gameRef.current,
          "DungeonScene"
        ) as DungeonScene | null;
        if (scene && !scene.gameStarted) {
          scene.gameStarted = true;
          PhysicsHelper.pausePhysics(scene, "Initial Tutorial");
          setShowGameTutorial(true);
        }
      }, 500);
    };

    const handleResize = () => {
      if (gameRef.current) {
        const newSize = getWindowSize();
        gameRef.current.scale.resize(newSize.width, newSize.height);
      }
    };

    // Initialize game setup in a separate function
    const initializeGame = () => {
      // Get window dimensions
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
        input: {
          keyboard: {
            target: window,
          },
          mouse: true,
          touch: true,
        },
        loader: {
          maxParallelDownloads: 10, // Load multiple assets in parallel
          timeout: 30000,
        },
        dom: {
          createContainer: true,
        },
      };

      gameRef.current = new Phaser.Game(config);

      // Ensure the canvas gets focus for keyboard input
      setTimeout(() => {
        const canvas = parentRef.current?.querySelector("canvas");
        if (canvas) {
          canvas.setAttribute("tabindex", "0");
          canvas.focus();
          canvas.style.outline = "none";
          console.log("Canvas focused for keyboard input");
        }
      }, 200);

      // Register event listeners
      window.addEventListener("resize", handleResize);
      window.addEventListener("show-wisdom", handleWisdomEvent);
      window.addEventListener("show-tutorial", handleTutorialEvent);
      window.addEventListener("close-tutorial", handleTutorialCloseEvent);
      window.addEventListener("exit-game", handleExitEvent);
      window.addEventListener("scene-ready", handleSceneReady);

      console.log("Event listeners registered");

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
    };

    // Initialize game with a small delay
    const loadingTimer = setTimeout(initializeGame, 100);

    return () => {
      clearTimeout(loadingTimer);
      if (gameRef.current) {
        gameRef.current.destroy(true);
      }
      // Clean up event listeners properly
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("show-wisdom", handleWisdomEvent);
      window.removeEventListener("show-tutorial", handleTutorialEvent);
      window.removeEventListener("close-tutorial", handleTutorialCloseEvent);
      window.removeEventListener("exit-game", handleExitEvent);
      window.removeEventListener("scene-ready", handleSceneReady);
    };
  }, [selectedCharacter, enemyLevels]);

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
      {/* Loading Screen */}
      {isLoading && selectedCharacter && (
        <LoadingScreen character={selectedCharacter} />
      )}

      {!isGameActive && (
        <>
          {/* Dark overlay for better text readability */}
          <div
            className={`fixed inset-0 -z-10 ${
              showTitleScreen ? "bg-black/70" : "bg-black/60 backdrop-blur-sm"
            }`}
          />

          {showTitleScreen && <TitleScreen onClick={handleTitleClick} />}

          {showTitleScreen ? null : ( // Title Screen component handles all rendering
            <>
              {showPicker ? (
                <CharacterSelectionScreen
                  onSelect={handleCharacterSelect}
                  currentCharacter={selectedCharacter}
                />
              ) : showLevelInput ? (
                <LevelSelectionScreen
                  levelInput={levelInput}
                  onLevelInputChange={setLevelInput}
                  onSubmit={handleLevelInputSubmit}
                  onGenerateRandom={generateRandomLevels}
                  onBack={() => {
                    setShowLevelInput(false);
                    setShowPicker(true);
                  }}
                  onShowTutorial={() => setShowTutorial(true)}
                />
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
          style={{
            visibility: isLoading ? "hidden" : "visible",
          }}
          onClick={(e) => {
            // Ensure canvas gets focus when clicked
            const canvas = (e.currentTarget as HTMLElement).querySelector(
              "canvas"
            );
            if (canvas) {
              canvas.focus();
            }
          }}
        />
      )}

      {/* Wisdom Modal - Available during gameplay */}
      {showWisdom && wisdomFact && (
        <GameModal
          isOpen={showWisdom}
          onClose={() => {
            setShowWisdom(false);
            // Resume game physics
            const scene = PhysicsHelper.getScene(
              gameRef.current,
              "DungeonScene"
            );
            PhysicsHelper.resumePhysics(scene, "Wisdom Modal Close");
          }}
          title={wisdomFact.title}
        >
          <p>{wisdomFact.content}</p>
        </GameModal>
      )}

      {/* Tutorial Modal - For level selection screen (no physics) */}
      {showTutorial && !isGameActive && (
        <GameModal
          isOpen={showTutorial}
          onClose={() => setShowTutorial(false)}
          title="How to Play"
        >
          <TutorialContent variant="pre-game" />
        </GameModal>
      )}

      {/* Game Tutorial Modal - During gameplay (with physics handling) */}
      {showGameTutorial && isGameActive && (
        <GameModal
          isOpen={showGameTutorial}
          onClose={() => {
            setShowGameTutorial(false);
            const event = new Event("close-tutorial");
            window.dispatchEvent(event);
          }}
          title="How to Play"
        >
          <TutorialContent variant="in-game" />
        </GameModal>
      )}
    </div>
  );
}
