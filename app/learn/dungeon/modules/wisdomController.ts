import Phaser from "phaser";
import { GAME_CONSTANTS } from "./constants";

// Wisdom facts about binary search trees, algorithms, and traversal
const WISDOM_FACTS = [
  {
    title: "Binary Search Tree (BST)",
    content:
      "A Binary Search Tree is a data structure where each node has at most two children. The left child contains values less than the parent, and the right child contains values greater than the parent. This property enables efficient searching, insertion, and deletion operations.",
  },
  {
    title: "Tree Traversal Methods",
    content:
      "There are three main ways to traverse a binary tree: Pre-order (root, left, right), In-order (left, root, right), and Post-order (left, right, root). Each method visits nodes in a different order, useful for different algorithms and problem-solving scenarios.",
  },
  {
    title: "Pre-order Traversal",
    content:
      "Pre-order traversal visits the root node first, then recursively traverses the left subtree, and finally the right subtree. This is useful for creating a copy of the tree or getting prefix expressions. In this game, enemies are assigned levels using pre-order traversal!",
  },
  {
    title: "In-order Traversal",
    content:
      "In-order traversal visits the left subtree first, then the root, and finally the right subtree. For a BST, this visits nodes in sorted order (ascending). This is why in-order traversal is commonly used for printing BST values in sorted order.",
  },
  {
    title: "Post-order Traversal",
    content:
      "Post-order traversal visits the left subtree, then the right subtree, and finally the root. This is useful for deleting a tree or evaluating postfix expressions. The root is always processed last.",
  },
  {
    title: "Tree Height and Depth",
    content:
      "The height of a tree is the length of the longest path from the root to a leaf node. The depth of a node is the number of edges from the root to that node. Understanding these concepts helps analyze algorithm complexity.",
  },
  {
    title: "Map Navigation Strategy",
    content:
      "To traverse the dungeon efficiently, think like a tree traversal! Start at the root (spawn point), explore the left subtree first, then move to the right. This systematic approach ensures you don't miss any enemies and can plan your path strategically.",
  },
  {
    title: "Level-Based Combat",
    content:
      "In this dungeon, enemies are organized in a binary tree structure. The root has the lowest level, and levels increase as you traverse deeper. Defeat enemies in order to level up and become stronger, just like traversing a tree from root to leaves!",
  },
  {
    title: "Binary Tree Properties",
    content:
      "A binary tree with n nodes has exactly n-1 edges. A full binary tree has every node with either 0 or 2 children. A complete binary tree is filled from left to right at each level. Understanding these properties helps in algorithm design.",
  },
  {
    title: "Search Efficiency",
    content:
      "In a balanced BST, search operations take O(log n) time. However, in the worst case (unbalanced tree), it can degrade to O(n). This is why maintaining tree balance is important for efficient algorithms.",
  },
];

export class WisdomController {
  private scene: Phaser.Scene;
  private player: Phaser.Physics.Arcade.Sprite;
  private wisdomTiles: Array<{ x: number; y: number; worldX: number; worldY: number }> = [];
  private viewWisdomButton: Phaser.GameObjects.Text | null = null;
  private currentNearbyTile: { x: number; y: number; worldX: number; worldY: number } | null = null;
  private onShowWisdom: (fact: { title: string; content: string }) => void;
  private readonly PROXIMITY_DISTANCE = 100; // Distance in pixels to show button

  constructor(
    scene: Phaser.Scene,
    player: Phaser.Physics.Arcade.Sprite,
    onShowWisdom: (fact: { title: string; content: string }) => void
  ) {
    this.scene = scene;
    this.player = player;
    this.onShowWisdom = onShowWisdom;
  }

  initializeWisdomTiles(
    mapData: {
      tileSize?: number;
      layers?: Array<{
        name: string;
        tiles?: Array<{ x: number; y: number; id: string }>;
      }>;
    } | null,
    mapScale: number
  ) {
    if (!mapData || !mapData.layers) {
      console.warn("No map data or layers found for wisdom tiles");
      return;
    }

    const wisdomLayer = mapData.layers.find(
      (layer: { name: string; tiles?: Array<{ x: number; y: number; id: string }> }) =>
        layer.name === "wisdom"
    );

    if (!wisdomLayer) {
      console.warn("Wisdom layer not found in map data");
      return;
    }

    if (!wisdomLayer.tiles || wisdomLayer.tiles.length === 0) {
      console.warn("Wisdom layer has no tiles");
      return;
    }

    const tileSize = mapData.tileSize || 64;

    this.wisdomTiles = wisdomLayer.tiles.map(
      (tile: { x: number; y: number; id: string }) => ({
        x: tile.x,
        y: tile.y,
        worldX: (tile.x + 0.5) * tileSize * mapScale,
        worldY: (tile.y + 0.5) * tileSize * mapScale,
      })
    );

    console.log(`Found ${this.wisdomTiles.length} wisdom tiles`);
  }

  update() {
    if (!this.player || !this.player.active) {
      if (this.viewWisdomButton) {
        this.viewWisdomButton.setVisible(false);
      }
      return;
    }

    if (this.wisdomTiles.length === 0) {
      // No wisdom tiles, hide button if visible
      if (this.viewWisdomButton && this.viewWisdomButton.visible) {
        this.hideViewWisdomButton();
      }
      return;
    }

    // Check if player is near any wisdom tile
    let nearestTile: { x: number; y: number; worldX: number; worldY: number } | null = null;
    let minDistance = this.PROXIMITY_DISTANCE;

    for (const tile of this.wisdomTiles) {
      const dx = this.player.x - tile.worldX;
      const dy = this.player.y - tile.worldY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < minDistance) {
        minDistance = distance;
        nearestTile = tile;
      }
    }

    // Show or hide button based on proximity
    if (nearestTile && nearestTile !== this.currentNearbyTile) {
      this.currentNearbyTile = nearestTile;
      this.showViewWisdomButton(nearestTile);
    } else if (!nearestTile && this.currentNearbyTile) {
      this.currentNearbyTile = null;
      this.hideViewWisdomButton();
    }

    // Update button position if visible (button has scrollFactor 0, so use screen coords)
    if (this.viewWisdomButton && this.currentNearbyTile && this.viewWisdomButton.visible) {
      const screenX = this.currentNearbyTile.worldX - this.scene.cameras.main.scrollX;
      const screenY = this.currentNearbyTile.worldY - this.scene.cameras.main.scrollY - 60;
      
      // Clamp to screen bounds
      const { width, height } = this.scene.cameras.main;
      const clampedX = Phaser.Math.Clamp(screenX, 50, width - 50);
      const clampedY = Phaser.Math.Clamp(screenY, 50, height - 50);
      
      this.viewWisdomButton.setPosition(clampedX, clampedY);
    }
  }

  private showViewWisdomButton(tile: { x: number; y: number; worldX: number; worldY: number }) {
    if (this.viewWisdomButton) {
      this.viewWisdomButton.setVisible(true);
      return;
    }

    const screenX = tile.worldX - this.scene.cameras.main.scrollX;
    const screenY = tile.worldY - this.scene.cameras.main.scrollY - 60;

    this.viewWisdomButton = this.scene.add
      .text(screenX, screenY, "View Wisdom", {
        fontFamily: "'Pixelify Sans', monospace",
        fontSize: "14px",
        color: "#ffff00",
        backgroundColor: "#000000",
        padding: { x: 10, y: 6 },
      })
      .setOrigin(0.5, 0.5)
      .setScrollFactor(0)
      .setDepth(10002)
      .setInteractive({ useHandCursor: true });

    this.viewWisdomButton.on("pointerdown", () => {
      const randomFact = WISDOM_FACTS[Math.floor(Math.random() * WISDOM_FACTS.length)];
      console.log("View Wisdom button clicked, showing fact:", randomFact.title);
      this.onShowWisdom(randomFact);
    });

    this.viewWisdomButton.on("pointerover", () => {
      if (this.viewWisdomButton) {
        this.viewWisdomButton.setStyle({ backgroundColor: "#333333" });
      }
    });

    this.viewWisdomButton.on("pointerout", () => {
      if (this.viewWisdomButton) {
        this.viewWisdomButton.setStyle({ backgroundColor: "#000000" });
      }
    });
  }

  private hideViewWisdomButton() {
    if (this.viewWisdomButton) {
      this.viewWisdomButton.setVisible(false);
    }
  }

  destroy() {
    if (this.viewWisdomButton) {
      this.viewWisdomButton.destroy();
      this.viewWisdomButton = null;
    }
  }
}
