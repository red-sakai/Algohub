import Phaser from "phaser";
import { GAME_CONSTANTS } from "./constants";

export class LightingController {
  private scene: Phaser.Scene;
  private darknessOverlay!: Phaser.GameObjects.Graphics;
  private lightMask!: Phaser.GameObjects.Graphics;
  private renderTexture!: Phaser.GameObjects.RenderTexture;
  private currentVisionRadius: number;
  private player: Phaser.Physics.Arcade.Sprite;
  private lightingEnabled: boolean = true;

  constructor(scene: Phaser.Scene, player: Phaser.Physics.Arcade.Sprite) {
    this.scene = scene;
    this.player = player;
    this.currentVisionRadius = GAME_CONSTANTS.BASE_VISION_RADIUS;
    this.setupLighting();
  }

  private setupLighting() {
    const { width, height } = this.scene.cameras.main;

    this.renderTexture = this.scene.add.renderTexture(0, 0, width, height);
    this.renderTexture.setDepth(10000);
    this.renderTexture.setScrollFactor(0);
    this.renderTexture.setOrigin(0, 0);

    this.darknessOverlay = this.scene.add.graphics();
    this.lightMask = this.scene.add.graphics();
  }

  setVisionRadius(radius: number) {
    this.currentVisionRadius = radius;
  }

  toggleLighting() {
    this.lightingEnabled = !this.lightingEnabled;
    if (!this.lightingEnabled) {
      // Clear the darkness when disabled
      this.renderTexture.clear();
    }
  }

  isLightingEnabled(): boolean {
    return this.lightingEnabled;
  }

  update() {
    // Skip rendering if lighting is disabled
    if (!this.lightingEnabled) {
      return;
    }

    const { width, height } = this.scene.cameras.main;

    this.renderTexture.clear();
    this.darknessOverlay.clear();
    this.darknessOverlay.fillStyle(0x000000, 1);
    this.darknessOverlay.fillRect(0, 0, width, height);

    const playerScreenX = this.player.x - this.scene.cameras.main.scrollX;
    const playerScreenY = this.player.y - this.scene.cameras.main.scrollY;

    this.renderTexture.draw(this.darknessOverlay, 0, 0);

    this.lightMask.clear();

    const steps = 20;
    for (let i = steps; i >= 0; i--) {
      const ratio = i / steps;
      const radius = this.currentVisionRadius * ratio;
      const alpha = 1 - ratio * 0.5;

      this.lightMask.fillStyle(0x000000, alpha);
      this.lightMask.fillCircle(playerScreenX, playerScreenY, radius);
    }

    this.renderTexture.erase(this.lightMask, 0, 0);
  }
}
