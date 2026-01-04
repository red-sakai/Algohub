import Phaser from "phaser";
import { Pathfinding } from "./pathfinding";
import { TreeBuilder } from "./treeBuilder";
import { GAME_CONSTANTS } from "./constants";
import type { TreeNode } from "./types";

export class TreeTraversalController {
  private scene: Phaser.Scene;
  private player: Phaser.Physics.Arcade.Sprite;
  private playerSpawnX: number;
  private playerSpawnY: number;
  private traversalDisplayObjects: Phaser.GameObjects.GameObject[] = [];
  private originalCameraZoom: number = 1;
  private originalCameraX: number = 0;
  private originalCameraY: number = 0;
  private hideButtons: () => void;
  private showButtons: () => void;

  constructor(
    scene: Phaser.Scene,
    player: Phaser.Physics.Arcade.Sprite,
    playerSpawnX: number,
    playerSpawnY: number,
    hideButtons: () => void,
    showButtons: () => void
  ) {
    this.scene = scene;
    this.player = player;
    this.playerSpawnX = playerSpawnX;
    this.playerSpawnY = playerSpawnY;
    this.hideButtons = hideButtons;
    this.showButtons = showButtons;
  }

  displayTraversedMap(
    enemyTraversalData: Array<{
      x: number;
      y: number;
      level: number;
      index: number;
    }>
  ) {
    try {
      if (!enemyTraversalData || enemyTraversalData.length === 0) {
        console.warn("No enemy traversal data available");
        return;
      }

      const { width, height } = this.scene.cameras.main;
      if (!width || !height) {
        console.error("Camera dimensions not available");
        return;
      }

      // Clear any existing display
      this.hideTraversedMap();

      // Hide buttons while map is displayed
      this.hideButtons();

      // Filter out player spawn position (Door location)
      const enemyNodesOnly = enemyTraversalData.filter((node) => {
        if (!node || typeof node.x !== 'number' || typeof node.y !== 'number') {
          return false;
        }
        const distance = Math.sqrt(
          Math.pow(node.x - this.playerSpawnX, 2) +
            Math.pow(node.y - this.playerSpawnY, 2)
        );
        return distance > 10;
      });

      if (enemyNodesOnly.length === 0) {
        console.warn("No valid enemy nodes found after filtering");
        this.showButtons(); // Restore buttons if we can't display
        return;
      }

    // Get map data to access floors layer for tree building and branch pathfinding
    const mapData = this.scene.cache.json.get("tilemap");
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
              tile.x * tileSize * GAME_CONSTANTS.MAP_SCALE +
              (tileSize * GAME_CONSTANTS.MAP_SCALE) / 2,
            worldY:
              tile.y * tileSize * GAME_CONSTANTS.MAP_SCALE +
              (tileSize * GAME_CONSTANTS.MAP_SCALE) / 2,
          })
        );
      }
    }

      // Build binary tree structure using floor pathfinding (nodes stay at enemy positions)
      const tree = TreeBuilder.buildBinaryTreeStructure(
        [...enemyNodesOnly],
        floorTileWorldPositions,
        tileSize,
        GAME_CONSTANTS.MAP_SCALE
      );
      if (!tree) {
        console.warn("Failed to build binary tree structure");
        this.showButtons(); // Restore buttons if tree building fails
        return;
      }

    // Assign traversal order numbers
    const orderCounter = { value: 1 };
    TreeBuilder.assignTraversalOrder(tree, orderCounter);

      // Calculate bounds of all nodes to fit the entire tree in view
      const bounds = this.calculateTreeBounds(tree);
      if (!bounds) {
        console.warn("Failed to calculate tree bounds");
        this.showButtons(); // Restore buttons if bounds calculation fails
        return;
      }

      // Save original camera state
      this.originalCameraZoom = this.scene.cameras.main.zoom || 1;
      this.originalCameraX = this.scene.cameras.main.scrollX || 0;
      this.originalCameraY = this.scene.cameras.main.scrollY || 0;

      // Stop camera from following player
      this.scene.cameras.main.stopFollow();

      // Calculate zoom level to fit entire tree
      const viewportWidth = width;
      const viewportHeight = height;
      const zoomX = viewportWidth / bounds.treeWidth;
      const zoomY = viewportHeight / bounds.treeHeight;
      const zoom = Math.min(zoomX, zoomY, 1.0); // Don't zoom in, only out

      // Set camera to center on tree and zoom out
      this.scene.cameras.main.setZoom(zoom);
      this.scene.cameras.main.centerOn(bounds.centerX, bounds.centerY);

      // Draw tree structure
      try {
        const graphics = this.scene.add.graphics();
        graphics.setDepth(20001);
        this.drawTree(tree, graphics, floorTileWorldPositions, tileSize, null, null);
        this.traversalDisplayObjects.push(graphics);

        // Add UI elements
        this.addTreeUI(width, height);
      } catch (e) {
        console.error("Error drawing tree structure:", e);
        this.showButtons(); // Restore buttons on error
        throw e; // Re-throw to be caught by outer try-catch
      }
    } catch (error) {
      console.error("Error displaying traversed map:", error);
      this.showButtons(); // Restore buttons on error
    }
  }

  private calculateTreeBounds(tree: TreeNode | null): {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    treeWidth: number;
    treeHeight: number;
    centerX: number;
    centerY: number;
  } | null {
    if (!tree) return null;

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

    return {
      minX,
      maxX,
      minY,
      maxY,
      treeWidth,
      treeHeight,
      centerX,
      centerY,
    };
  }

  private drawTree(
    node: TreeNode | null,
    graphics: Phaser.GameObjects.Graphics,
    floorTileWorldPositions: Array<{
      tileX: number;
      tileY: number;
      worldX: number;
      worldY: number;
    }>,
    tileSize: number,
    parentX: number | null = null,
    parentY: number | null = null
  ) {
    if (!node || !node.node) return;

    try {
      const x = node.node.x;
      const y = node.node.y;

      if (typeof x !== 'number' || typeof y !== 'number' || !isFinite(x) || !isFinite(y)) {
        console.warn("Invalid node coordinates:", node.node);
        return;
      }

      // Draw connection to parent through floor tiles
      if (parentX !== null && parentY !== null && isFinite(parentX) && isFinite(parentY)) {
        try {
          graphics.lineStyle(3, 0x00ffcc, 0.8);
          const path = Pathfinding.findPathThroughFloors(
            parentX,
            parentY,
            x,
            y,
            floorTileWorldPositions,
            tileSize,
            GAME_CONSTANTS.MAP_SCALE
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
        } catch (e) {
          console.warn("Error drawing tree connection:", e);
        }
      }

      // Draw left child
      if (node.left) {
        this.drawTree(node.left, graphics, floorTileWorldPositions, tileSize, x, y);
      }

      // Draw right child
      if (node.right) {
        this.drawTree(node.right, graphics, floorTileWorldPositions, tileSize, x, y);
      }

      // Draw node circle at actual world position
      try {
        const nodeCircle = this.scene.add.circle(x, y, 25, 0x00ffcc, 0.9);
        nodeCircle.setDepth(20002);
        this.traversalDisplayObjects.push(nodeCircle);

        // Draw level number (large, in center)
        const levelText = this.scene.add
          .text(x, y, (node.node.level || 0).toString(), {
            fontFamily: "'Pixelify Sans', monospace",
            fontSize: "20px",
            color: "#000000",
          })
          .setOrigin(0.5)
          .setDepth(20003);
        this.traversalDisplayObjects.push(levelText);

        // Draw traversal order number (small, top-left of circle)
        const orderText = this.scene.add
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
      } catch (e) {
        console.warn("Error drawing tree node:", e);
      }
    } catch (error) {
      console.error("Error in drawTree:", error);
    }
  }

  private addTreeUI(width: number, height: number) {
    // Title (screen space)
    const title = this.scene.add
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
    const legendText = this.scene.add
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
    const closeButton = this.scene.add
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
    const spaceKey = this.scene.input.keyboard?.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE
    );
    if (spaceKey) {
      spaceKey.once("down", () => {
        this.hideTraversedMap();
      });
    }
  }

  hideTraversedMap() {
    try {
      this.traversalDisplayObjects.forEach((obj) => {
        if (obj && obj.active) {
          try {
            obj.destroy();
          } catch (e) {
            console.warn("Error destroying traversal object:", e);
          }
        }
      });
      this.traversalDisplayObjects = [];

      // Restore camera
      if (this.originalCameraZoom !== undefined && this.scene.cameras.main) {
        try {
          this.scene.cameras.main.setZoom(this.originalCameraZoom);
          if (this.player && this.player.active) {
            this.scene.cameras.main.startFollow(this.player);
          }
          this.scene.cameras.main.setScroll(
            this.originalCameraX,
            this.originalCameraY
          );
        } catch (e) {
          console.warn("Error restoring camera:", e);
        }
      }

      // Show buttons again
      this.showButtons();
    } catch (error) {
      console.error("Error hiding traversed map:", error);
      // Try to show buttons anyway
      try {
        this.showButtons();
      } catch (e) {
        console.error("Error showing buttons:", e);
      }
    }
  }
}
