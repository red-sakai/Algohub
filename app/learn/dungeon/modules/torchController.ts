import Phaser from "phaser";
import { GAME_CONSTANTS } from "./constants";

export class TorchController {
  private scene: Phaser.Scene;
  private torches: Phaser.Physics.Arcade.Group;
  private torchGlowSprites: Phaser.GameObjects.Sprite[] = [];
  private torchCount: number = 0;
  private torchTimeRemaining: number = 0;
  private torchText: Phaser.GameObjects.Text;
  private torchTimerText: Phaser.GameObjects.Text;
  private player: Phaser.Physics.Arcade.Sprite;

  constructor(
    scene: Phaser.Scene,
    torches: Phaser.Physics.Arcade.Group,
    player: Phaser.Physics.Arcade.Sprite
  ) {
    this.scene = scene;
    this.torches = torches;
    this.player = player;

    const { width } = scene.cameras.main;
    this.torchText = scene.add
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

    this.torchTimerText = scene.add
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
  }

  createTorches(nodes: Array<{ x: number; y: number }>) {
    if (!nodes.length) return;

    for (let i = 3; i < nodes.length; i += 4) {
      const node = nodes[i];
      const offsetX = Phaser.Math.Between(-20, 20);
      const offsetY = Phaser.Math.Between(-20, 20);

      const torch = this.torches.create(
        node.x + offsetX,
        node.y + offsetY,
        "torch"
      ) as Phaser.Physics.Arcade.Sprite;
      torch.setScale(2);
      torch.setDepth(500);

      const glow = this.scene.add.sprite(node.x + offsetX, node.y + offsetY, "torch");
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
    }
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

    this.torchText.setText(`🔥 Torches: ${this.torchCount}`);

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

      const secondsRemaining = Math.ceil(this.torchTimeRemaining / 1000);
      this.torchTimerText.setText(`Light Time: ${secondsRemaining}s`);

      if (secondsRemaining <= 3) {
        this.torchTimerText.setColor("#ff0000");
      } else if (secondsRemaining <= 7) {
        this.torchTimerText.setColor("#ff8800");
      } else {
        this.torchTimerText.setColor("#ffff00");
      }
    } else {
      this.torchTimerText.setText("");
    }

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
