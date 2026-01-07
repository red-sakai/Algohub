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
  private specialBuffActive: boolean = false;
  private specialBuffTimer: number = 0;
  private critRate: number = 0;
  private critDamageMultiplier: number = 1;

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

  getSpecialBuffActive(): boolean {
    return this.specialBuffActive;
  }

  getCritRate(): number {
    return this.critRate;
  }

  getCritDamageMultiplier(): number {
    return this.critDamageMultiplier;
  }

  getBuffTimers(): {
    attackSpeed: number;
    speedBoost: number;
    attackBoost: number;
    specialBuff: number;
  } {
    return {
      attackSpeed: this.attackSpeedBuffTimer,
      speedBoost: this.speedBoostTimer,
      attackBoost: this.attackBoostTimer,
      specialBuff: this.specialBuffTimer,
    };
  }

  createCollectibles(mapData: any, nodes: Array<{ x: number; y: number }>, mapScale: number) {
    if (!mapData) return;

    const tileSize = mapData.tileSize;

    // Create special buffs in chests (chest layer) only
    const chestsLayer = mapData.layers?.find(
      (layer: {
        name: string;
        tiles?: Array<{ x: number; y: number; id: string }>;
      }) => layer.name === "chest" || layer.name === "Chest"
    );

    console.log("Looking for chest layer for special buffs...");
    if (chestsLayer) {
      console.log(`Found chest layer (${chestsLayer.name}) with ${chestsLayer.tiles?.length || 0} tiles`);
    } else {
      console.warn("Chest layer not found in map data. Available layers:", mapData.layers?.map((l: { name: string }) => l.name));
    }

    if (chestsLayer?.tiles && chestsLayer.tiles.length > 0) {
      // Create special buffs at ALL chest locations (100% spawn rate)
      const usedChestTiles = new Set<string>();
      let created = 0;

      for (const chestTile of chestsLayer.tiles) {
        const tileKey = `${chestTile.x}-${chestTile.y}`;
        if (usedChestTiles.has(tileKey)) continue;
        usedChestTiles.add(tileKey);

        const collectibleX = (chestTile.x + 0.5) * tileSize * mapScale;
        const collectibleY = (chestTile.y + 0.5) * tileSize * mapScale;

        const specialBuffType = GAME_CONSTANTS.COLLECTIBLE_TYPES.find(
          (t) => t.type === "special_buff"
        )!;

        if (!specialBuffType) {
          console.error("Special buff type not found in COLLECTIBLE_TYPES");
          continue;
        }

        const textureKey = `collectible-special-${created}`;
        const graphics = this.scene.add.graphics();
        graphics.fillStyle(specialBuffType.color, 1);
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
        collectible.setData("type", specialBuffType.type);
        collectible.setData("label", specialBuffType.label);
        collectible.setData("color", specialBuffType.color);

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
          duration: 2000,
          repeat: -1,
          ease: "Linear",
        });

        created++;
        console.log(`Created special buff at chest tile (${chestTile.x}, ${chestTile.y}) -> world (${collectibleX}, ${collectibleY})`);
      }
      
      console.log(`Total special buffs created: ${created}`);
    } else {
      console.warn("No chest tiles found in chest layer or layer has no tiles");
    }

    // Create regular collectibles on floors (excluding special_buff and speed_boost)
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

    // Reduced collectible count
    const collectibleCount = Math.min(
      Math.floor(floorsTiles.length / 50), // Further reduced spawn rate
      8 // Reduced max count
    );

    const usedTextureKeys = new Set<string>();
    const usedFloorTiles = new Set<string>();
    let attempts = 0;
    const maxAttempts = floorsTiles.length * 2;

    // Filter out special_buff and speed_boost from floor spawns
    const floorCollectibleTypes = GAME_CONSTANTS.COLLECTIBLE_TYPES.filter(
      (t) => t.type !== "special_buff" && t.type !== "speed_boost"
    );

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
        floorCollectibleTypes[
          Phaser.Math.Between(0, floorCollectibleTypes.length - 1)
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

    // Create speed boost collectibles separately with reduced spawn rate
    const speedBoostType = GAME_CONSTANTS.COLLECTIBLE_TYPES.find(
      (t) => t.type === "speed_boost"
    )!;
    const speedBoostCount = Math.min(
      Math.floor(floorsTiles.length / 80), // Further reduced spawn rate
      2 // Max 2 speed boosts
    );

    let speedBoostCreated = 0;
    attempts = 0;
    const speedBoostMaxAttempts = floorsTiles.length * 3;

    while (speedBoostCreated < speedBoostCount && attempts < speedBoostMaxAttempts) {
      attempts++;

      const randomTileIndex = Phaser.Math.Between(0, floorsTiles.length - 1);
      const floorTile = floorsTiles[randomTileIndex];
      const tileKey = `speed-${floorTile.x}-${floorTile.y}`;

      if (usedFloorTiles.has(tileKey)) continue;
      usedFloorTiles.add(tileKey);

      // Only 3% chance to actually create (reduced from 5%)
      if (Phaser.Math.Between(0, 100) >= 3) continue;

      const collectibleX = (floorTile.x + 0.5) * tileSize * mapScale;
      const collectibleY = (floorTile.y + 0.5) * tileSize * mapScale;

      const textureKey = `collectible-speed-${speedBoostCreated}`;
      const graphics = this.scene.add.graphics();
      graphics.fillStyle(speedBoostType.color, 1);
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
      collectible.setData("type", speedBoostType.type);
      collectible.setData("label", speedBoostType.label);
      collectible.setData("color", speedBoostType.color);

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

      speedBoostCreated++;
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
        effectText = "+50% Movement Speed (20s)";
        textColor = "#00aaff";
        break;

      case "attack_boost":
        this.attackBoostMultiplier = GAME_CONSTANTS.ATTACK_BOOST_MULTIPLIER;
        this.attackBoostTimer = GAME_CONSTANTS.ATTACK_BOOST_DURATION;
        effectText = "+50% Attack Damage (15s)";
        textColor = "#ffaa00";
        break;

      case "special_buff":
        this.specialBuffActive = true;
        this.specialBuffTimer = GAME_CONSTANTS.SPECIAL_BUFF_DURATION;
        this.attackBoostMultiplier = GAME_CONSTANTS.SPECIAL_BUFF_ATTACK_MULTIPLIER;
        this.critRate = GAME_CONSTANTS.SPECIAL_BUFF_CRIT_RATE;
        this.critDamageMultiplier = GAME_CONSTANTS.SPECIAL_BUFF_CRIT_DAMAGE;
        effectText = "SPECIAL BUFF! +100% ATK, 30% Crit (25s)";
        textColor = "#9d00ff";
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

    if (this.specialBuffTimer > 0) {
      this.specialBuffTimer -= delta;
      if (this.specialBuffTimer <= 0) {
        this.specialBuffTimer = 0;
        this.specialBuffActive = false;
        this.critRate = 0;
        this.critDamageMultiplier = 1;
        // Reset attack boost if special buff was active
        if (this.attackBoostMultiplier === GAME_CONSTANTS.SPECIAL_BUFF_ATTACK_MULTIPLIER) {
          this.attackBoostMultiplier = 1;
        }
        onBuffEnd("special_buff");
      }
    }
  }
}
