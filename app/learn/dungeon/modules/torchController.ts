import Phaser from "phaser";
import { GAME_CONSTANTS } from "./constants";

export class TorchController {
  private scene: Phaser.Scene;
  private torches: Phaser.Physics.Arcade.Group;
  private torchGlowSprites: Phaser.GameObjects.Sprite[] = [];
  private torchCount: number = 0;
  private torchTimeRemaining: number = 0;
  private player: Phaser.Physics.Arcade.Sprite;

  constructor(
    scene: Phaser.Scene,
    torches: Phaser.Physics.Arcade.Group,
    player: Phaser.Physics.Arcade.Sprite
  ) {
    this.scene = scene;
    this.torches = torches;
    this.player = player;
  }

  createTorches(mapData: any, nodes: Array<{ x: number; y: number }>, mapScale: number) {
    if (!mapData) return;

    const tileSize = mapData.tileSize;

    // Create torches on floors layer (scattered across the map like collectibles)
    const floorsLayer = mapData.layers.find(
      (layer: {
        name: string;
        tiles: Array<{ x: number; y: number; id: string }>;
      }) => layer.name === "floors"
    );

    let floorsTiles: Array<{ x: number; y: number; id: string }> = [];

    if (floorsLayer?.tiles?.length > 0) {
      floorsTiles = floorsLayer.tiles;
    } else {
      console.warn("Floors layer not found, using nodes as fallback");
      if (!nodes.length) return;
      floorsTiles = nodes.map((node, index) => ({
        x: Math.floor(node.x / (tileSize * mapScale)),
        y: Math.floor(node.y / (tileSize * mapScale)),
        id: `node-${index}`,
      }));
    }

    // Reduced torch spawn rate
    const torchCount = Math.min(
      Math.floor(floorsTiles.length / 30), // Reduced spawn rate
      15 // Max 15 torches
    );

    const usedFloorTiles = new Set<string>();
    let attempts = 0;
    const maxAttempts = floorsTiles.length * 2;
    let created = 0;

    while (created < torchCount && attempts < maxAttempts) {
      attempts++;

      const randomTileIndex = Phaser.Math.Between(0, floorsTiles.length - 1);
      const floorTile = floorsTiles[randomTileIndex];
      const tileKey = `${floorTile.x}-${floorTile.y}`;

      if (usedFloorTiles.has(tileKey)) continue;
      usedFloorTiles.add(tileKey);

      const torchX = (floorTile.x + 0.5) * tileSize * mapScale;
      const torchY = (floorTile.y + 0.5) * tileSize * mapScale;

      const torch = this.torches.create(torchX, torchY, "torch") as Phaser.Physics.Arcade.Sprite;
      torch.setScale(2);
      torch.setDepth(500);

      const glow = this.scene.add.sprite(torchX, torchY, "torch");
      glow.setScale(3);
      glow.setDepth(499);
      glow.setAlpha(0.3);
      glow.setTint(0xffaa00);
      this.torchGlowSprites.push(glow);

      this.scene.tweens.add({
        targets: glow,
        scale: { from: 3, to: 3.5 },
        alpha: { from: 0.3, to: 0.5 },
        duration: 1000,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });

      created++;
    }

    console.log(`Created ${created} torches scattered across the map`);
  }

  collectTorch(torch: Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile): number {
    const torchSprite = torch as Phaser.Physics.Arcade.Sprite;

    const torchIndex = this.torches.getChildren().indexOf(torchSprite);
    if (torchIndex !== -1 && torchIndex < this.torchGlowSprites.length) {
      this.torchGlowSprites[torchIndex].destroy();
      this.torchGlowSprites.splice(torchIndex, 1);
    }

    torchSprite.destroy();

    this.torchCount++;
    this.torchTimeRemaining += GAME_CONSTANTS.TORCH_DURATION;

    if (
      this.torchTimeRemaining >
      GAME_CONSTANTS.TORCH_DURATION * GAME_CONSTANTS.MAX_TORCHES
    ) {
    this.torchTimeRemaining =
      GAME_CONSTANTS.TORCH_DURATION * GAME_CONSTANTS.MAX_TORCHES;
    }

    const collectText = this.scene.add.text(
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

    this.scene.tweens.add({
      targets: collectText,
      y: collectText.y - 30,
      alpha: 0,
      duration: 1000,
      onComplete: () => collectText.destroy(),
    });

    return this.torchTimeRemaining;
  }

  update(delta: number): number {
    if (this.torchTimeRemaining > 0) {
      this.torchTimeRemaining -= delta;
      if (this.torchTimeRemaining < 0) {
        this.torchTimeRemaining = 0;
      }
    }

    return this.torchTimeRemaining;
  }
  
  getTorchTimeRemaining(): number {
    return this.torchTimeRemaining;
  }

  getVisionRadius(): number {
    if (this.torchTimeRemaining > 0) {
      return (
        GAME_CONSTANTS.BASE_VISION_RADIUS + GAME_CONSTANTS.TORCH_VISION_BONUS
      );
    }
    return GAME_CONSTANTS.BASE_VISION_RADIUS;
  }
}
