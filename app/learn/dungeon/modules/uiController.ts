import Phaser from "phaser";
import { GAME_CONSTANTS } from "./constants";
import type { AudioController } from "./audioController";

export class UIController {
  private scene: Phaser.Scene;
  private playerController: any; // PlayerController type
  private playerLevel: number;
  private audioController?: AudioController;
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
  private menuButton!: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle;
  private menuButtonText?: Phaser.GameObjects.Text;
  private menuPopupObjects: Phaser.GameObjects.GameObject[] = [];
  private isMenuOpen: boolean = false;

  // Buff timers at top of screen
  private buffTimerTexts: Map<string, Phaser.GameObjects.Text> = new Map();

  constructor(
    scene: Phaser.Scene,
    playerController: any,
    initialLevel: number,
    audioController?: AudioController
  ) {
    this.scene = scene;
    this.playerController = playerController;
    this.playerLevel = initialLevel;
    this.audioController = audioController;
  }

  createUI(
    mapWidth: number,
    mapHeight: number,
    onDebugClick: () => void,
    onTreeDisplayClick: () => void
  ) {
    const { width, height } = this.scene.cameras.main;
    const isMobile = width < 768;

    // Player level UI - top center for mobile, bottom center for desktop
    const levelY = isMobile ? 20 : height - 100;
    this.playerLevelText = this.scene.add
      .text(width / 2, levelY, `LV. ${this.playerLevel}`, {
        fontFamily: "'Pixelify Sans', monospace",
        fontSize: "18px",
        color: "#00ffcc",
        backgroundColor: "#000000",
        padding: {
          x: 12,
          y: 6,
        },
        stroke: "#00aacc",
        strokeThickness: 2,
      })
      .setOrigin(0.5, 0.5)
      .setScrollFactor(0)
      .setDepth(10000);

    // Player health bar - top center below level for mobile, bottom center for desktop
    this.playerHealthBarBg = this.scene.add
      .graphics()
      .setDepth(10000)
      .setScrollFactor(0);
    this.playerHealthBar = this.scene.add
      .graphics()
      .setDepth(10001)
      .setScrollFactor(0);

    const healthTextY = isMobile ? 50 : height - 30;
    this.playerHealthText = this.scene.add
      .text(width / 2, healthTextY, `HP: 100/100`, {
        fontFamily: "'Pixelify Sans', monospace",
        fontSize: "14px",
        color: "#ffffff",
        backgroundColor: "#000000",
        padding: {
          x: 8,
          y: 4,
        },
        stroke: "#333333",
        strokeThickness: 1,
      })
      .setOrigin(0.5, 0.5)
      .setScrollFactor(0)
      .setDepth(10000);

    // Debug button - top-left corner with improved styling
    const buttonPadding = 16;
    this.debugButton = this.scene.add
      .text(buttonPadding, buttonPadding, "DEBUG: Show Map", {
        fontFamily: "'Pixelify Sans', monospace",
        fontSize: "13px",
        color: "#ffaa00",
        backgroundColor: "#000000",
        padding: {
          x: 10,
          y: 6,
        },
        stroke: "#664400",
        strokeThickness: 1,
      })
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(10000)
      .setInteractive({ useHandCursor: true });

    this.debugButton.on("pointerdown", () => {
      if (this.audioController) {
        this.audioController.playButtonClick();
      }
      onDebugClick();
    });
    this.debugButton.on("pointerover", () => {
      this.debugButton.setStyle({
        backgroundColor: "#333333",
        color: "#ffcc00",
      });
    });
    this.debugButton.on("pointerout", () => {
      this.debugButton.setStyle({
        backgroundColor: "#000000",
        color: "#ffaa00",
      });
    });

    // Menu button - top right corner
    this.createMenuButton(width, height);

    // Tree display button - below debug button
    const treeButtonY = 50;
    this.treeDisplayButton = this.scene.add
      .text(buttonPadding, treeButtonY, "Show Tree", {
        fontFamily: "'Pixelify Sans', monospace",
        fontSize: "13px",
        color: "#00ffcc",
        backgroundColor: "#000000",
        padding: {
          x: 10,
          y: 6,
        },
        stroke: "#006666",
        strokeThickness: 1,
      })
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(10000)
      .setInteractive({ useHandCursor: true });

    this.treeDisplayButton.on("pointerdown", () => {
      if (this.audioController) {
        this.audioController.playButtonClick();
      }
      onTreeDisplayClick();
    });
    this.treeDisplayButton.on("pointerover", () => {
      this.treeDisplayButton.setStyle({
        backgroundColor: "#333333",
        color: "#00ffff",
      });
    });
    this.treeDisplayButton.on("pointerout", () => {
      this.treeDisplayButton.setStyle({
        backgroundColor: "#000000",
        color: "#00ffcc",
      });
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
        `Map: ${Math.round(mapWidth)}x${Math.round(mapHeight)} (Scale: ${
          GAME_CONSTANTS.MAP_SCALE
        }x) | Viewport: ${width}x${height}\nSprite - Visual: ${
          GAME_CONSTANTS.FRAME_WIDTH
        }x${
          GAME_CONSTANTS.FRAME_HEIGHT
        } | Collision: ${collisionWidth}x${collisionHeight} | Scale: ${
          GAME_CONSTANTS.SPRITE_SCALE
        }x\nOffsets - T:${GAME_CONSTANTS.FRAME_OFFSET_TOP} B:${
          GAME_CONSTANTS.FRAME_OFFSET_BOTTOM
        } L:${GAME_CONSTANTS.FRAME_OFFSET_LEFT} R:${
          GAME_CONSTANTS.FRAME_OFFSET_RIGHT
        }`,
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

    // Create buff timer texts at top-right with improved styling (including torch)
    const buffConfigs = [
      {
        type: "torch",
        label: "🔥",
        name: "LIGHT",
        color: "#ffaa00",
        yOffset: 0,
      },
      {
        type: "attack_speed",
        label: "⚡",
        name: "ATK SPD",
        color: "#ff0000",
        yOffset: 35,
      },
      {
        type: "speed_boost",
        label: "💨",
        name: "SPD",
        color: "#00aaff",
        yOffset: 70,
      },
      {
        type: "attack_boost",
        label: "⚔️",
        name: "ATK",
        color: "#ffaa00",
        yOffset: 105,
      },
      {
        type: "special_buff",
        label: "✨",
        name: "SPECIAL",
        color: "#9d00ff",
        yOffset: 140,
      },
    ];

    const buffYOffset = isMobile ? 60 : 100;
    const buffSpacing = isMobile ? 25 : 35;
    buffConfigs.forEach((config, index) => {
      const text = this.scene.add
        .text(
          width - buttonPadding,
          buffYOffset + (config.yOffset / 35) * buffSpacing,
          "",
          {
            fontFamily: "'Pixelify Sans', monospace",
            fontSize: "13px",
            color: config.color,
            backgroundColor: "#000000",
            padding: {
              x: 10,
              y: 5,
            },
            stroke: "#333333",
            strokeThickness: 1,
          }
        )
        .setOrigin(1, 0)
        .setScrollFactor(0)
        .setDepth(10000)
        .setVisible(false);
      this.buffTimerTexts.set(config.type, text);
    });
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
      ((GAME_CONSTANTS.FRAME_OFFSET_RIGHT - GAME_CONSTANTS.FRAME_OFFSET_LEFT) /
        2) *
      GAME_CONSTANTS.SPRITE_SCALE;
    const offsetY =
      ((GAME_CONSTANTS.FRAME_OFFSET_BOTTOM - GAME_CONSTANTS.FRAME_OFFSET_TOP) /
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
    const { width, height } = this.scene.cameras.main;
    const isMobile = width < 768;
    const barWidth = 200;
    const barHeight = 24;
    const barX = width / 2 - barWidth / 2;
    const barY = isMobile ? 75 : height - 60;

    this.playerHealthBarBg.clear();
    this.playerHealthBar.clear();

    const health = this.playerController.getHealth();
    const maxHealth = this.playerController.getMaxHealth();

    // Outer border (dark)
    this.playerHealthBarBg.fillStyle(0x000000, 1);
    this.playerHealthBarBg.fillRect(
      barX - 4,
      barY - 4,
      barWidth + 8,
      barHeight + 8
    );

    // Middle border (lighter)
    this.playerHealthBarBg.fillStyle(0x333333, 1);
    this.playerHealthBarBg.fillRect(
      barX - 2,
      barY - 2,
      barWidth + 4,
      barHeight + 4
    );

    // Red background for missing health
    this.playerHealthBarBg.fillStyle(0x550000, 1);
    this.playerHealthBarBg.fillRect(barX, barY, barWidth, barHeight);

    // Health bar with color based on percentage and gradient effect
    const pct = Phaser.Math.Clamp(health / maxHealth, 0, 1);
    let color = 0x00ff00;
    let glowColor = 0x00cc00;
    if (pct < 0.3) {
      color = 0xff0000;
      glowColor = 0xcc0000;
    } else if (pct < 0.6) {
      color = 0xffaa00;
      glowColor = 0xcc8800;
    }

    // Health bar fill
    this.playerHealthBar.fillStyle(color, 1);
    this.playerHealthBar.fillRect(barX, barY, barWidth * pct, barHeight);

    // Add a subtle highlight on top of the health bar
    if (pct > 0) {
      this.playerHealthBar.fillStyle(0xffffff, 0.3);
      this.playerHealthBar.fillRect(
        barX,
        barY,
        barWidth * pct,
        barHeight * 0.3
      );
    }

    // Update text with color based on health
    const healthPct = health / maxHealth;
    let textColor = "#ffffff";
    if (healthPct < 0.3) textColor = "#ff5555";
    else if (healthPct < 0.6) textColor = "#ffaa55";

    this.playerHealthText.setColor(textColor);
    this.playerHealthText.setText(
      `HP: ${Math.max(0, Math.floor(health))}/${maxHealth}`
    );
  }

  updateBuffTimers(
    buffTimers: {
      attackSpeed: number;
      speedBoost: number;
      attackBoost: number;
      specialBuff: number;
    },
    torchTime: number = 0
  ) {
    const buffConfigs = [
      {
        type: "attack_speed",
        key: "attackSpeed" as keyof typeof buffTimers,
        label: "⚡",
        name: "ATK SPD",
        color: "#ff0000",
      },
      {
        type: "speed_boost",
        key: "speedBoost" as keyof typeof buffTimers,
        label: "💨",
        name: "SPD",
        color: "#00aaff",
      },
      {
        type: "attack_boost",
        key: "attackBoost" as keyof typeof buffTimers,
        label: "⚔️",
        name: "ATK",
        color: "#ffaa00",
      },
      {
        type: "special_buff",
        key: "specialBuff" as keyof typeof buffTimers,
        label: "✨",
        name: "SPECIAL",
        color: "#9d00ff",
      },
      {
        type: "torch",
        key: "torch" as any,
        label: "🔥",
        name: "LIGHT",
        color: "#ffaa00",
      },
    ];

    buffConfigs.forEach((config) => {
      const text = this.buffTimerTexts.get(config.type);
      if (!text) return;

      // Handle torch separately
      let timer = 0;
      if (config.type === "torch") {
        timer = torchTime;
      } else {
        timer = buffTimers[config.key as keyof typeof buffTimers] || 0;
      }

      if (timer > 0) {
        const seconds = Math.ceil(timer / 1000);
        text.setText(`${config.label} ${config.name}: ${seconds}s`);
        text.setVisible(true);

        // Change color based on remaining time with smooth transitions
        if (seconds <= 3) {
          text.setColor("#ff0000");
          text.setStroke("#cc0000", 2);
        } else if (seconds <= 7) {
          text.setColor("#ff8800");
          text.setStroke("#cc6600", 1);
        } else {
          text.setColor(config.color);
          text.setStroke("#333333", 1);
        }
      } else {
        text.setVisible(false);
      }
    });
  }

  updateLevel(level: number) {
    this.playerLevel = level;
    if (this.playerLevelText) {
      this.playerLevelText.setText(`LV. ${level}`);
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

  hideHUD() {
    if (this.playerLevelText) this.playerLevelText.setVisible(false);
    if (this.playerHealthBar) this.playerHealthBar.setVisible(false);
    if (this.playerHealthBarBg) this.playerHealthBarBg.setVisible(false);
    if (this.playerHealthText) this.playerHealthText.setVisible(false);
    // Hide buff timers
    this.buffTimerTexts.forEach((text) => {
      if (text) text.setVisible(false);
    });
  }

  showHUD() {
    if (this.playerLevelText) this.playerLevelText.setVisible(true);
    if (this.playerHealthBar) this.playerHealthBar.setVisible(true);
    if (this.playerHealthBarBg) this.playerHealthBarBg.setVisible(true);
    if (this.playerHealthText) this.playerHealthText.setVisible(true);
    // Buff timers will be shown/hidden by updateBuffTimers based on active state
  }

  private debugMode: boolean = false;

  toggleDebugMode(
    wallColliders: Phaser.Physics.Arcade.StaticGroup,
    player: Phaser.Physics.Arcade.Sprite
  ) {
    this.debugMode = !this.debugMode;
    this.toggleDebugOverlays(this.debugMode);

    wallColliders
      .getChildren()
      .forEach((collider: Phaser.GameObjects.GameObject) => {
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

  private createMenuButton(width: number, height: number) {
    // Position button with proper padding from edges (responsive)
    const isMobile = width < 768;
    const buttonSize = 80;
    const padding = isMobile ? 15 : 20;
    const buttonX = width - buttonSize / 2 - padding;
    const buttonY = buttonSize / 2 + padding;

    // Try to use menu image if available, otherwise use fallback
    if (this.scene.textures.exists("menu-button")) {
      this.menuButton = this.scene.add.image(buttonX, buttonY, "menu-button");
      // Calculate scale to fit within buttonSize
      const texture = this.scene.textures.get("menu-button");
      const scale =
        Math.min(
          buttonSize / texture.source[0].width,
          buttonSize / texture.source[0].height
        ) * 0.8;
      (this.menuButton as Phaser.GameObjects.Image).setScale(scale);
      (this.menuButton as Phaser.GameObjects.Image).setOrigin(0.5, 0.5);
    } else {
      // Fallback: create a simple button
      this.menuButton = this.scene.add.rectangle(
        buttonX,
        buttonY,
        buttonSize,
        buttonSize,
        0x666666,
        0.8
      );
      (this.menuButton as Phaser.GameObjects.Rectangle).setStrokeStyle(
        2,
        0xffffff
      );
      this.menuButtonText = this.scene.add
        .text(buttonX, buttonY, "☰", {
          fontFamily: "'Pixelify Sans', monospace",
          fontSize: "18px",
          color: "#ffffff",
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(10002);
    }

    this.menuButton.setScrollFactor(0);
    this.menuButton.setDepth(10001);
    this.menuButton.setOrigin(0.5, 0.5);
    this.menuButton.setInteractive({ useHandCursor: true });

    this.menuButton.on("pointerdown", () => {
      if (this.audioController) {
        this.audioController.playButtonClick();
      }
      if (this.isMenuOpen) {
        this.closeMenuPopup();
      } else {
        this.showMenuPopup(width, height);
      }
    });
  }

  private showMenuPopup(width: number, height: number) {
    if (this.isMenuOpen) return;
    this.isMenuOpen = true;

    const isMobile = width < 768;

    // Dark overlay for popup
    const popupOverlay = this.scene.add.rectangle(
      0,
      0,
      width,
      height,
      0x000000,
      0.5
    );
    popupOverlay.setOrigin(0, 0);
    popupOverlay.setScrollFactor(0);
    popupOverlay.setDepth(20010);
    popupOverlay.setInteractive({ useHandCursor: false });
    popupOverlay.on("pointerdown", () => {
      this.closeMenuPopup();
    });
    this.menuPopupObjects.push(popupOverlay);

    // Popup background (responsive)
    const popupWidth = 400;
    const popupHeight = 300;
    const popupBg = this.scene.add.rectangle(
      width / 2,
      height / 2,
      popupWidth,
      popupHeight,
      0x1a1a2e,
      0.95
    );
    popupBg.setScrollFactor(0);
    popupBg.setDepth(20011);
    popupBg.setStrokeStyle(4, 0x00ffcc);
    this.menuPopupObjects.push(popupBg);

    // Popup title (responsive)
    const popupTitle = this.scene.add
      .text(width / 2, height / 2 - 100, "MENU", {
        fontFamily: "'Pixelify Sans', monospace",
        fontSize: "32px",
        color: "#00ffcc",
        align: "center",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(20012);
    this.menuPopupObjects.push(popupTitle);

    // Return to Game button (responsive)
    const returnButton = this.scene.add
      .text(width / 2, height / 2 - 30, "Return to Game", {
        fontFamily: "'Pixelify Sans', monospace",
        fontSize: "24px",
        color: "#ffffff",
        backgroundColor: "#000000",
        padding: {
          x: 20,
          y: 10,
        },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(20012)
      .setInteractive({ useHandCursor: true });
    returnButton.on("pointerdown", () => {
      if (this.audioController) {
        this.audioController.playButtonClick();
      }
      this.closeMenuPopup();
    });
    this.menuPopupObjects.push(returnButton);

    // Tutorial button (responsive)
    const tutorialButton = this.scene.add
      .text(width / 2, height / 2 + 30, "Tutorial", {
        fontFamily: "'Pixelify Sans', monospace",
        fontSize: "24px",
        color: "#ffffff",
        backgroundColor: "#000000",
        padding: {
          x: 20,
          y: 10,
        },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(20012)
      .setInteractive({ useHandCursor: true });
    tutorialButton.on("pointerdown", () => {
      if (this.audioController) {
        this.audioController.playButtonClick();
      }
      // Dispatch custom event to show tutorial
      const event = new CustomEvent("show-tutorial");
      window.dispatchEvent(event);
      this.closeMenuPopup();
    });
    this.menuPopupObjects.push(tutorialButton);

    // Exit button (responsive)
    const exitButton = this.scene.add
      .text(width / 2, height / 2 + 90, "Exit", {
        fontFamily: "'Pixelify Sans', monospace",
        fontSize: "24px",
        color: "#ff0000",
        backgroundColor: "#000000",
        padding: {
          x: 20,
          y: 10,
        },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(20012)
      .setInteractive({ useHandCursor: true });
    exitButton.on("pointerdown", () => {
      if (this.audioController) {
        this.audioController.playButtonClick();
      }
      // Dispatch custom event to exit
      const event = new CustomEvent("exit-game");
      window.dispatchEvent(event);
      this.closeMenuPopup();
    });
    this.menuPopupObjects.push(exitButton);
  }

  private closeMenuPopup() {
    this.menuPopupObjects.forEach((obj) => {
      if (obj && obj.active) {
        try {
          obj.destroy();
        } catch (e) {
          console.warn("Error destroying menu popup object:", e);
        }
      }
    });
    this.menuPopupObjects = [];
    this.isMenuOpen = false;
  }
}
