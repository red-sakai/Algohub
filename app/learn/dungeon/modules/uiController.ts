import Phaser from "phaser";
import { GAME_CONSTANTS } from "./constants";

export class UIController {
  private scene: Phaser.Scene;
  private playerController: any; // PlayerController type
  private playerLevel: number;
  private playerLevelText!: Phaser.GameObjects.Text;
  private playerHealthBar!: Phaser.GameObjects.Graphics;
  private playerHealthBarBg!: Phaser.GameObjects.Graphics;
  private playerHealthText!: Phaser.GameObjects.Text;
  private debugButton!: Phaser.GameObjects.Text;
  private treeDisplayButton!: Phaser.GameObjects.Text;
  private debugBg!: Phaser.GameObjects.Rectangle;
  private debugInnerBg!: Phaser.GameObjects.Rectangle;
  private debugInfoText!: Phaser.GameObjects.Text;
  private debugLegendText!: Phaser.GameObjects.Text;

  constructor(
    scene: Phaser.Scene,
    playerController: any,
    initialLevel: number
  ) {
    this.scene = scene;
    this.playerController = playerController;
    this.playerLevel = initialLevel;
  }

  createUI(
    mapWidth: number,
    mapHeight: number,
    onDebugClick: () => void,
    onTreeDisplayClick: () => void
  ) {
    const { width, height } = this.scene.cameras.main;

    // Player level UI - top-left
    this.playerLevelText = this.scene.add
      .text(16, 90, `Level: ${this.playerLevel}`, {
        fontFamily: "'Pixelify Sans', monospace",
        fontSize: "16px",
        color: "#00ffcc",
        backgroundColor: "#000000",
        padding: { x: 10, y: 6 },
      })
      .setScrollFactor(0)
      .setDepth(10000);

    // Player health bar - top-left below level
    this.playerHealthBarBg = this.scene.add
      .graphics()
      .setDepth(10000)
      .setScrollFactor(0);
    this.playerHealthBar = this.scene.add
      .graphics()
      .setDepth(10001)
      .setScrollFactor(0);

    this.playerHealthText = this.scene.add
      .text(16, 130, `HP: 100/100`, {
        fontFamily: "'Pixelify Sans', monospace",
        fontSize: "14px",
        color: "#ff5555",
        backgroundColor: "#000000",
        padding: { x: 8, y: 4 },
      })
      .setScrollFactor(0)
      .setDepth(10000);

    // Debug button - top-right corner
    const screenWidth = this.scene.cameras.main.width;
    this.debugButton = this.scene.add
      .text(screenWidth - 16, 16, "DEBUG: Show Map", {
        fontFamily: "'Pixelify Sans', monospace",
        fontSize: "14px",
        color: "#ffaa00",
        backgroundColor: "#000000",
        padding: { x: 10, y: 6 },
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(10000)
      .setInteractive({ useHandCursor: true });

    this.debugButton.on("pointerdown", onDebugClick);
    this.debugButton.on("pointerover", () => {
      this.debugButton.setStyle({ backgroundColor: "#333333" });
    });
    this.debugButton.on("pointerout", () => {
      this.debugButton.setStyle({ backgroundColor: "#000000" });
    });

    // Tree display button - below debug button
    this.treeDisplayButton = this.scene.add
      .text(screenWidth - 16, 50, "Show Tree", {
        fontFamily: "'Pixelify Sans', monospace",
        fontSize: "14px",
        color: "#00ffcc",
        backgroundColor: "#000000",
        padding: { x: 10, y: 6 },
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(10000)
      .setInteractive({ useHandCursor: true });

    this.treeDisplayButton.on("pointerdown", onTreeDisplayClick);
    this.treeDisplayButton.on("pointerover", () => {
      this.treeDisplayButton.setStyle({ backgroundColor: "#333333" });
    });
    this.treeDisplayButton.on("pointerout", () => {
      this.treeDisplayButton.setStyle({ backgroundColor: "#000000" });
    });

    // Debug info text
    const collisionWidth =
      GAME_CONSTANTS.FRAME_WIDTH -
      GAME_CONSTANTS.FRAME_OFFSET_LEFT -
      GAME_CONSTANTS.FRAME_OFFSET_RIGHT;
    const collisionHeight =
      GAME_CONSTANTS.FRAME_HEIGHT -
      GAME_CONSTANTS.FRAME_OFFSET_TOP -
      GAME_CONSTANTS.FRAME_OFFSET_BOTTOM;

    this.debugInfoText = this.scene.add
      .text(
        16,
        520,
        `Map: ${Math.round(mapWidth)}x${Math.round(
          mapHeight
        )} (Scale: ${GAME_CONSTANTS.MAP_SCALE}x) | Viewport: ${width}x${height}\nSprite - Visual: ${GAME_CONSTANTS.FRAME_WIDTH}x${GAME_CONSTANTS.FRAME_HEIGHT} | Collision: ${collisionWidth}x${collisionHeight} | Scale: ${GAME_CONSTANTS.SPRITE_SCALE}x\nOffsets - T:${GAME_CONSTANTS.FRAME_OFFSET_TOP} B:${GAME_CONSTANTS.FRAME_OFFSET_BOTTOM} L:${GAME_CONSTANTS.FRAME_OFFSET_LEFT} R:${GAME_CONSTANTS.FRAME_OFFSET_RIGHT}`,
        {
          fontFamily: "'Pixelify Sans', monospace",
          fontSize: "10px",
          color: "#ffffff",
          backgroundColor: "#000000",
          padding: { x: 8, y: 4 },
        }
      )
      .setScrollFactor(0)
      .setDepth(1000);

    // Debug legend
    this.debugLegendText = this.scene.add
      .text(16, 16, "Red = Visual Frame\nGreen = Collision/Hitbox", {
        fontFamily: "'Pixelify Sans', monospace",
        fontSize: "12px",
        color: "#ffffff",
        backgroundColor: "#000000",
        padding: { x: 8, y: 4 },
      })
      .setScrollFactor(0)
      .setDepth(1000);

    this.updateHealthBar();
  }

  createDebugOverlays(playerX: number, playerY: number) {
    // Debug: Add red background to show original frame boundaries
    this.debugBg = this.scene.add.rectangle(
      playerX,
      playerY,
      GAME_CONSTANTS.FRAME_WIDTH * GAME_CONSTANTS.SPRITE_SCALE,
      GAME_CONSTANTS.FRAME_HEIGHT * GAME_CONSTANTS.SPRITE_SCALE,
      0xff0000,
      0.3
    );
    this.debugBg.setStrokeStyle(2, 0xff0000);
    this.debugBg.setDepth(900);

    // Debug: Add green rectangle to show adjusted frame with offsets
    const adjustedWidth =
      (GAME_CONSTANTS.FRAME_WIDTH -
        GAME_CONSTANTS.FRAME_OFFSET_LEFT -
        GAME_CONSTANTS.FRAME_OFFSET_RIGHT) *
      GAME_CONSTANTS.SPRITE_SCALE;
    const adjustedHeight =
      (GAME_CONSTANTS.FRAME_HEIGHT -
        GAME_CONSTANTS.FRAME_OFFSET_TOP -
        GAME_CONSTANTS.FRAME_OFFSET_BOTTOM) *
      GAME_CONSTANTS.SPRITE_SCALE;
    const offsetX =
      ((GAME_CONSTANTS.FRAME_OFFSET_RIGHT -
        GAME_CONSTANTS.FRAME_OFFSET_LEFT) /
        2) *
      GAME_CONSTANTS.SPRITE_SCALE;
    const offsetY =
      ((GAME_CONSTANTS.FRAME_OFFSET_BOTTOM -
        GAME_CONSTANTS.FRAME_OFFSET_TOP) /
        2) *
      GAME_CONSTANTS.SPRITE_SCALE;

    this.debugInnerBg = this.scene.add.rectangle(
      playerX + offsetX,
      playerY + offsetY,
      adjustedWidth,
      adjustedHeight,
      0x00ff00,
      0.3
    );
    this.debugInnerBg.setStrokeStyle(3, 0x00ff00);
    this.debugInnerBg.setDepth(950);

    this.debugBg.setVisible(false);
    this.debugInnerBg.setVisible(false);
  }

  updateHealthBar() {
    const barWidth = 150;
    const barHeight = 20;
    const barX = 16;
    const barY = 160;

    this.playerHealthBarBg.clear();
    this.playerHealthBar.clear();

    const health = this.playerController.getHealth();
    const maxHealth = this.playerController.getMaxHealth();

    // Background
    this.playerHealthBarBg.fillStyle(0x000000, 0.8);
    this.playerHealthBarBg.fillRect(
      barX - 2,
      barY - 2,
      barWidth + 4,
      barHeight + 4
    );

    // Red background for missing health
    this.playerHealthBarBg.fillStyle(0x550000, 1);
    this.playerHealthBarBg.fillRect(barX, barY, barWidth, barHeight);

    // Health bar with color based on percentage
    const pct = Phaser.Math.Clamp(health / maxHealth, 0, 1);
    let color = 0x00ff00;
    if (pct < 0.3) color = 0xff0000;
    else if (pct < 0.6) color = 0xffaa00;

    this.playerHealthBar.fillStyle(color, 1);
    this.playerHealthBar.fillRect(barX, barY, barWidth * pct, barHeight);

    // Update text
    this.playerHealthText.setText(
      `HP: ${Math.max(0, Math.floor(health))}/${maxHealth}`
    );
  }

  updateLevel(level: number) {
    this.playerLevel = level;
    if (this.playerLevelText) {
      this.playerLevelText.setText(`Level: ${level}`);
    }
  }

  toggleDebugOverlays(visible: boolean) {
    if (this.debugBg) this.debugBg.setVisible(visible);
    if (this.debugInnerBg) this.debugInnerBg.setVisible(visible);
  }

  hideButtons() {
    if (this.debugButton) this.debugButton.setVisible(false);
    if (this.treeDisplayButton) this.treeDisplayButton.setVisible(false);
  }

  showButtons() {
    if (this.debugButton) this.debugButton.setVisible(true);
    if (this.treeDisplayButton) this.treeDisplayButton.setVisible(true);
  }

  private debugMode: boolean = false;

  toggleDebugMode(
    wallColliders: Phaser.Physics.Arcade.StaticGroup,
    player: Phaser.Physics.Arcade.Sprite
  ) {
    this.debugMode = !this.debugMode;
    this.toggleDebugOverlays(this.debugMode);

    wallColliders.getChildren().forEach((collider: Phaser.GameObjects.GameObject) => {
      const rect = collider as Phaser.GameObjects.Rectangle;
      if (this.debugMode) {
        rect.setAlpha(0.5);
        rect.setFillStyle(0xff0000, 0.5);
        rect.setStrokeStyle(2, 0xff0000, 1);
        rect.setVisible(true);
      } else {
        rect.setVisible(false);
      }
    });

    console.log(`Debug mode: ${this.debugMode ? "ON" : "OFF"}`);
  }

  updateDebugOverlays(player: Phaser.Physics.Arcade.Sprite) {
    if (!this.debugBg || !this.debugInnerBg) return;

    // Update debug background position to follow player
    this.debugBg.x = player.x;
    this.debugBg.y = player.y;

    // Update inner debug frame position
    const debugOffsetX =
      ((GAME_CONSTANTS.FRAME_OFFSET_RIGHT - GAME_CONSTANTS.FRAME_OFFSET_LEFT) /
        2) *
      GAME_CONSTANTS.SPRITE_SCALE;
    const debugOffsetY =
      ((GAME_CONSTANTS.FRAME_OFFSET_BOTTOM - GAME_CONSTANTS.FRAME_OFFSET_TOP) /
        2) *
      GAME_CONSTANTS.SPRITE_SCALE;
    this.debugInnerBg.x = player.x + debugOffsetX;
    this.debugInnerBg.y = player.y + debugOffsetY;
  }
}
