import Phaser from "phaser";
import { GAME_CONSTANTS } from "./constants";

export class CollectiblesController {
  private scene: Phaser.Scene;
  private collectibles: Phaser.Physics.Arcade.Group;
  private player: Phaser.Physics.Arcade.Sprite;

  // Buff state
  private attackSpeedMultiplier: number = 1;
  private attackSpeedBuffTimer: number = 0;
  private speedBoostMultiplier: number = 1;
  private speedBoostTimer: number = 0;
  private attackBoostMultiplier: number = 1;
  private attackBoostTimer: number = 0;

  constructor(
    scene: Phaser.Scene,
    collectibles: Phaser.Physics.Arcade.Group,
    player: Phaser.Physics.Arcade.Sprite
  ) {
    this.scene = scene;
    this.collectibles = collectibles;
    this.player = player;
  }

  getAttackSpeedMultiplier(): number {
    return this.attackSpeedMultiplier;
  }

  getSpeedBoostMultiplier(): number {
    return this.speedBoostMultiplier;
  }

  getAttackBoostMultiplier(): number {
    return this.attackBoostMultiplier;
  }

  createCollectibles(mapData: any, nodes: Array<{ x: number; y: number }>, mapScale: number) {
    if (!mapData) return;

    const floorsLayer = mapData.layers.find(
      (layer: {
        name: string;
        tiles: Array<{ x: number; y: number; id: string }>;
      }) => layer.name === "floors"
    );

    const tileSize = mapData.tileSize;
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

    const collectibleCount = Math.min(
      Math.floor(floorsTiles.length / 20),
      15
    );

    const usedTextureKeys = new Set<string>();
    const usedFloorTiles = new Set<string>();
    let attempts = 0;
    const maxAttempts = floorsTiles.length * 2;

    while (usedTextureKeys.size < collectibleCount && attempts < maxAttempts) {
      attempts++;

      const randomTileIndex = Phaser.Math.Between(0, floorsTiles.length - 1);
      const floorTile = floorsTiles[randomTileIndex];
      const tileKey = `${floorTile.x}-${floorTile.y}`;

      if (usedFloorTiles.has(tileKey)) continue;
      usedFloorTiles.add(tileKey);

      const collectibleX = (floorTile.x + 0.5) * tileSize * mapScale;
      const collectibleY = (floorTile.y + 0.5) * tileSize * mapScale;

      const collectibleType =
        GAME_CONSTANTS.COLLECTIBLE_TYPES[
          Phaser.Math.Between(0, GAME_CONSTANTS.COLLECTIBLE_TYPES.length - 1)
        ];

      const textureIndex = usedTextureKeys.size;
      let textureKey = `collectible-${collectibleType.type}-${textureIndex}`;
      let counter = 0;
      while (usedTextureKeys.has(textureKey)) {
        textureKey = `collectible-${collectibleType.type}-${textureIndex}-${counter}`;
        counter++;
      }
      usedTextureKeys.add(textureKey);

      const graphics = this.scene.add.graphics();
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

      this.scene.tweens.add({
        targets: collectible,
        y: collectible.y - 10,
        duration: 1000,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });

      this.scene.tweens.add({
        targets: collectible,
        angle: 360,
        duration: 3000,
        repeat: -1,
        ease: "Linear",
      });
    }
  }

  collectItem(
    item: Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile
  ): { type: string; healAmount?: number } | null {
    const itemSprite = item as Phaser.Physics.Arcade.Sprite;
    const type = itemSprite.getData("type");
    const color = itemSprite.getData("color");

    let effectText = "";
    let textColor = "#ffffff";
    let healAmount: number | undefined;

    switch (type) {
      case "health":
        healAmount = GAME_CONSTANTS.HEALTH_POTION_AMOUNT;
        effectText = `+${healAmount} HP`;
        textColor = "#00ff00";
        break;

      case "attack_speed":
        this.attackSpeedMultiplier = GAME_CONSTANTS.ATTACK_SPEED_MULTIPLIER;
        this.attackSpeedBuffTimer = GAME_CONSTANTS.ATTACK_SPEED_BUFF_DURATION;
        effectText = "+50% Attack Speed (10s)";
        textColor = "#ff0000";
        break;

      case "speed_boost":
        this.speedBoostMultiplier = GAME_CONSTANTS.SPEED_BOOST_MULTIPLIER;
        this.speedBoostTimer = GAME_CONSTANTS.SPEED_BOOST_DURATION;
        effectText = "+50% Movement Speed (10s)";
        textColor = "#00aaff";
        break;

      case "attack_boost":
        this.attackBoostMultiplier = GAME_CONSTANTS.ATTACK_BOOST_MULTIPLIER;
        this.attackBoostTimer = GAME_CONSTANTS.ATTACK_BOOST_DURATION;
        effectText = "+50% Attack Damage (15s)";
        textColor = "#ffaa00";
        break;
    }

    itemSprite.destroy();

    const collectText = this.scene.add.text(
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

    this.scene.tweens.add({
      targets: collectText,
      y: collectText.y - 40,
      alpha: 0,
      duration: 1500,
      onComplete: () => collectText.destroy(),
    });

    const sparkle = this.scene.add.circle(
      this.player.x,
      this.player.y,
      20,
      color,
      0.6
    );
    sparkle.setDepth(999);

    this.scene.tweens.add({
      targets: sparkle,
      scale: 3,
      alpha: 0,
      duration: 500,
      onComplete: () => sparkle.destroy(),
    });

    return { type, healAmount };
  }

  update(delta: number, onBuffEnd: (type: string) => void) {
    if (this.attackSpeedBuffTimer > 0) {
      this.attackSpeedBuffTimer -= delta;
      if (this.attackSpeedBuffTimer <= 0) {
        this.attackSpeedBuffTimer = 0;
        this.attackSpeedMultiplier = 1;
        onBuffEnd("attack_speed");
      }
    }

    if (this.speedBoostTimer > 0) {
      this.speedBoostTimer -= delta;
      if (this.speedBoostTimer <= 0) {
        this.speedBoostTimer = 0;
        this.speedBoostMultiplier = 1;
        onBuffEnd("speed_boost");
      }
    }

    if (this.attackBoostTimer > 0) {
      this.attackBoostTimer -= delta;
      if (this.attackBoostTimer <= 0) {
        this.attackBoostTimer = 0;
        this.attackBoostMultiplier = 1;
        onBuffEnd("attack_boost");
      }
    }
  }
}
