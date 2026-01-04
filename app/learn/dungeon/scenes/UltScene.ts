import Phaser from "phaser";

export class UltScene extends Phaser.Scene {
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
    this.createUltAnimations();

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

  private createUltAnimations() {
    if (this.anims.exists("ult-up")) return;

    const directions = [
      { key: "ult-up", start: 0, end: 7 },
      { key: "ult-left", start: 8, end: 15 },
      { key: "ult-down", start: 16, end: 23 },
      { key: "ult-right", start: 24, end: 31 },
    ];

    directions.forEach(({ key, start, end }) => {
      this.anims.create({
        key,
        frames: this.anims.generateFrameNumbers("player-ult", {
          start,
          end,
        }),
        frameRate: 12,
        repeat: 0,
      });
    });
  }
}
