import Phaser from "phaser";
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
  private hideHUD: () => void;
  private showHUD: () => void;
  private hideMobileControls?: () => void;
  private showMobileControls?: () => void;
  private animationInProgress: boolean = false;
  private animationTimeline?: Phaser.Tweens.Timeline;

  constructor(
    scene: Phaser.Scene,
    player: Phaser.Physics.Arcade.Sprite,
    playerSpawnX: number,
    playerSpawnY: number,
    hideButtons: () => void,
    showButtons: () => void,
    hideHUD: () => void,
    showHUD: () => void,
    hideMobileControls?: () => void,
    showMobileControls?: () => void
  ) {
    this.scene = scene;
    this.player = player;
    this.playerSpawnX = playerSpawnX;
    this.playerSpawnY = playerSpawnY;
    this.hideButtons = hideButtons;
    this.showButtons = showButtons;
    this.hideHUD = hideHUD;
    this.showHUD = showHUD;
    this.hideMobileControls = hideMobileControls;
    this.showMobileControls = showMobileControls;
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

      // Hide buttons and HUD while map is displayed
      this.hideButtons();
      this.hideHUD();
      if (this.hideMobileControls) this.hideMobileControls();

      // Filter out player spawn position (spawn location)
      const enemyNodesOnly = enemyTraversalData.filter((node) => {
        if (!node || typeof node.x !== "number" || typeof node.y !== "number") {
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

      // Save original camera state (but don't change it)
      this.originalCameraZoom = this.scene.cameras.main.zoom || 1;
      this.originalCameraX = this.scene.cameras.main.scrollX || 0;
      this.originalCameraY = this.scene.cameras.main.scrollY || 0;

      // Stop camera from following player (but keep zoom the same)
      this.scene.cameras.main.stopFollow();

      // Draw tree structure in screen space (simple layout)
      try {
        // Add dimmed background overlay
        const overlay = this.scene.add.rectangle(
          0,
          0,
          width,
          height,
          0x000000,
          0.7
        );
        overlay.setOrigin(0, 0);
        overlay.setScrollFactor(0); // Screen space
        overlay.setDepth(20000);
        this.traversalDisplayObjects.push(overlay);

        // Count total nodes in tree
        const nodeCount = this.countTreeNodes(tree);

        // Collect enemy levels in traversal order
        const enemyLevels: number[] = [];
        const collectLevels = (node: TreeNode | null) => {
          if (!node) return;
          collectLevels(node.left);
          enemyLevels.push(node.node.level);
          collectLevels(node.right);
        };
        collectLevels(tree);

        this.drawSimpleTree(tree, width, height);
        this.addTreeUI(width, height, nodeCount, enemyLevels);
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

  private getTreeHeight(node: TreeNode | null): number {
    if (!node) return 0;
    return (
      1 +
      Math.max(this.getTreeHeight(node.left), this.getTreeHeight(node.right))
    );
  }

  private countTreeNodes(node: TreeNode | null): number {
    if (!node) return 0;
    return 1 + this.countTreeNodes(node.left) + this.countTreeNodes(node.right);
  }

  private drawSimpleTree(
    tree: TreeNode | null,
    screenWidth: number,
    screenHeight: number
  ) {
    if (!tree) return;

    const isMobile = screenWidth < 768;
    const treeHeight = this.getTreeHeight(tree);
    const nodeRadius = 22; // Fixed node radius

    // Calculate vertical spacing and centering (responsive)
    const topUIHeight = isMobile ? 80 : 120; // Title + tree size text
    const bottomUIHeight = isMobile ? 100 : 140; // Legend + close button
    const availableHeight = screenHeight - topUIHeight - bottomUIHeight;

    // Calculate vertical spacing based on tree height (scale down by 0.85)
    // Handle edge case where treeHeight is 1 (only root node)
    const verticalSpacing =
      treeHeight > 1 ? (availableHeight / (treeHeight - 1)) * 0.85 : 0; // -1 because we have treeHeight levels but treeHeight-1 gaps

    // Center the tree vertically
    const treeTotalHeight =
      treeHeight > 1 ? (treeHeight - 1) * verticalSpacing : 0;
    const startY = topUIHeight + (availableHeight - treeTotalHeight) / 2;

    // Use padding to center the tree - leave equal space on both sides (responsive)
    const horizontalPadding = isMobile ? 20 : 150; // Responsive padding
    const treeLeftBound = horizontalPadding;
    const treeRightBound = screenWidth - horizontalPadding;

    // Calculate positions for each node in screen space
    const nodePositions = new Map<TreeNode, { x: number; y: number }>();

    const calculatePositions = (
      node: TreeNode | null,
      level: number,
      leftBound: number,
      rightBound: number
    ) => {
      if (!node) return;

      const x = (leftBound + rightBound) / 2;
      const y = startY + level * verticalSpacing;
      nodePositions.set(node, { x, y });

      if (node.left) {
        const mid = (leftBound + rightBound) / 2;
        calculatePositions(node.left, level + 1, leftBound, mid);
      }
      if (node.right) {
        const mid = (leftBound + rightBound) / 2;
        calculatePositions(node.right, level + 1, mid, rightBound);
      }
    };

    calculatePositions(tree, 0, treeLeftBound, treeRightBound);

    // Draw connections
    const graphics = this.scene.add.graphics();
    graphics.setDepth(20001);
    graphics.setScrollFactor(0); // Screen space
    graphics.lineStyle(3, 0x00ffcc, 0.8);

    const drawConnections = (node: TreeNode | null) => {
      if (!node) return;
      const pos = nodePositions.get(node);
      if (!pos) return;

      if (node.left) {
        const leftPos = nodePositions.get(node.left);
        if (leftPos) {
          graphics.moveTo(pos.x, pos.y);
          graphics.lineTo(leftPos.x, leftPos.y);
          graphics.strokePath();
        }
        drawConnections(node.left);
      }

      if (node.right) {
        const rightPos = nodePositions.get(node.right);
        if (rightPos) {
          graphics.moveTo(pos.x, pos.y);
          graphics.lineTo(rightPos.x, rightPos.y);
          graphics.strokePath();
        }
        drawConnections(node.right);
      }
    };

    drawConnections(tree);
    this.traversalDisplayObjects.push(graphics);

    // Draw nodes
    nodePositions.forEach((pos, node) => {
      // Draw node circle
      const nodeCircle = this.scene.add.circle(
        pos.x,
        pos.y,
        nodeRadius,
        0x00ffcc,
        0.9
      );
      nodeCircle.setDepth(20002);
      nodeCircle.setScrollFactor(0); // Screen space
      this.traversalDisplayObjects.push(nodeCircle);

      // Draw level number (center) - full size
      const levelText = this.scene.add
        .text(pos.x, pos.y, (node.node.level || 0).toString(), {
          fontFamily: "'Pixelify Sans', monospace",
          fontSize: "18px",
          color: "#000000",
          stroke: "#ffffff",
          strokeThickness: 2,
        })
        .setOrigin(0.5)
        .setScrollFactor(0) // Screen space
        .setDepth(20003);
      this.traversalDisplayObjects.push(levelText);

      // Draw traversal order number (top-left) - full size
      const orderOffset = isMobile ? 15 : 20;
      const orderText = this.scene.add
        .text(
          pos.x - orderOffset,
          pos.y - orderOffset,
          (node.traversalOrder || 0).toString(),
          {
            fontFamily: "'Pixelify Sans', monospace",
            fontSize: "14px",
            color: "#ffffff",
            backgroundColor: "#000000",
            padding: { x: 4, y: 2 },
          }
        )
        .setOrigin(0.5)
        .setScrollFactor(0) // Screen space
        .setDepth(20003);
      this.traversalDisplayObjects.push(orderText);
    });

    // Start traversal animation after a short delay
    this.scene.time.delayedCall(500, () => {
      this.animateTraversal(tree, nodePositions, nodeRadius);
    });
  }

  private addTreeUI(
    width: number,
    height: number,
    nodeCount: number,
    enemyLevels: number[]
  ) {
    const isMobile = width < 768;

    // Title (screen space) - full size
    const titleY = isMobile ? 25 : 40;
    const title = this.scene.add
      .text(width / 2, titleY, "BINARY TREE - LEFT TO RIGHT TRAVERSAL", {
        fontFamily: "'Pixelify Sans', monospace",
        fontSize: "32px",
        color: "#00ffcc",
        align: "center",
        backgroundColor: "#000000",
        padding: { x: 20, y: 10 },
        stroke: "#00aacc",
        strokeThickness: 2,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(20001);
    this.traversalDisplayObjects.push(title);

    // Input numbers and length (screen space) - full size
    const legendY = isMobile ? height - 60 : height - 80;
    const inputNumbers = enemyLevels.join(",");
    const legendText = this.scene.add
      .text(
        width / 2,
        legendY,
        `Nodes: ${inputNumbers} | Length: ${nodeCount}`,
        {
          fontFamily: "'Pixelify Sans', monospace",
          fontSize: "18px",
          color: "#ffffff",
          align: "center",
          backgroundColor: "#000000",
          padding: { x: 15, y: 8 },
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(20001);
    this.traversalDisplayObjects.push(legendText);

    // Close button (screen space) - full size
    const closeButtonY = isMobile ? height - 25 : height - 40;
    const closeButton = this.scene.add
      .text(width / 2, closeButtonY, "Press SPACE to Close", {
        fontFamily: "'Pixelify Sans', monospace",
        fontSize: "24px",
        color: "#00ffcc",
        backgroundColor: "#000000",
        padding: { x: 20, y: 8 },
        stroke: "#00aacc",
        strokeThickness: 2,
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
      // Stop any ongoing animation
      if (this.animationTimeline) {
        this.animationTimeline.destroy();
        this.animationTimeline = undefined;
      }
      this.animationInProgress = false;

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

      // Restore camera (zoom should already be the same, but restore follow)
      if (this.scene.cameras.main) {
        try {
          if (this.player && this.player.active) {
            this.scene.cameras.main.startFollow(this.player);
          }
        } catch (e) {
          console.warn("Error restoring camera:", e);
        }
      }

      // Show buttons and HUD again
      this.showButtons();
      this.showHUD();
      if (this.showMobileControls) this.showMobileControls();
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

  /**
   * Animates the traversal path through the tree
   * Shows how the player traversed the dungeon in order
   */
  private animateTraversal(
    tree: TreeNode | null,
    nodePositions: Map<TreeNode, { x: number; y: number }>,
    nodeRadius: number
  ) {
    if (!tree) return;

    this.animationInProgress = true;

    // Collect nodes in traversal order
    const nodesInOrder: Array<{
      node: TreeNode;
      pos: { x: number; y: number };
    }> = [];
    const collectInOrder = (node: TreeNode | null) => {
      if (!node) return;
      collectInOrder(node.left);
      const pos = nodePositions.get(node);
      if (pos) {
        nodesInOrder.push({ node, pos });
      }
      collectInOrder(node.right);
    };
    collectInOrder(tree);

    if (nodesInOrder.length === 0) return;

    // Create graphics for the animated path
    const pathGraphics = this.scene.add.graphics();
    pathGraphics.setDepth(20004);
    pathGraphics.setScrollFactor(0);
    this.traversalDisplayObjects.push(pathGraphics);

    // Create a moving indicator (circle that travels along the path)
    const indicator = this.scene.add.circle(
      nodesInOrder[0].pos.x,
      nodesInOrder[0].pos.y,
      nodeRadius * 0.5,
      0xffaa00,
      0.8
    );
    indicator.setDepth(20005);
    indicator.setScrollFactor(0);
    this.traversalDisplayObjects.push(indicator);

    // Create highlight circles for visited nodes
    const visitedCircles = new Map<TreeNode, Phaser.GameObjects.Arc>();

    let currentIndex = 0;

    // Animation loop
    const animateNextStep = () => {
      if (currentIndex >= nodesInOrder.length) {
        this.animationInProgress = false;
        // Pulse the indicator at the last node
        this.scene.tweens.add({
          targets: indicator,
          alpha: 0.3,
          scale: 1.5,
          duration: 500,
          yoyo: true,
          repeat: -1,
        });
        return;
      }

      const currentNodeData = nodesInOrder[currentIndex];
      const { node, pos } = currentNodeData;

      // Highlight current node with a glow effect
      const highlightCircle = this.scene.add.circle(
        pos.x,
        pos.y,
        nodeRadius,
        0xffaa00,
        0.5
      );
      highlightCircle.setDepth(20004);
      highlightCircle.setScrollFactor(0);
      this.traversalDisplayObjects.push(highlightCircle);
      visitedCircles.set(node, highlightCircle);

      // Pulse effect for the highlighted node
      this.scene.tweens.add({
        targets: highlightCircle,
        alpha: { from: 0.7, to: 0.2 },
        scale: { from: 1.2, to: 1 },
        duration: 400,
        ease: "Sine.easeOut",
      });

      // Draw line from previous node to current node
      if (currentIndex > 0) {
        const prevPos = nodesInOrder[currentIndex - 1].pos;

        // Draw animated line
        pathGraphics.lineStyle(4, 0xffaa00, 0.8);
        pathGraphics.beginPath();
        pathGraphics.moveTo(prevPos.x, prevPos.y);
        pathGraphics.lineTo(pos.x, pos.y);
        pathGraphics.strokePath();
      }

      // Move indicator to current node
      this.scene.tweens.add({
        targets: indicator,
        x: pos.x,
        y: pos.y,
        duration: 400,
        ease: "Sine.easeInOut",
        onComplete: () => {
          currentIndex++;
          // Continue animation after a short pause
          this.scene.time.delayedCall(200, animateNextStep);
        },
      });
    };

    // Start the animation
    animateNextStep();
  }
}
