import Phaser from "phaser";
import type { EnemyUnit } from "./types";

export class LevelController {
  private scene: Phaser.Scene;
  private playerController: any; // PlayerController type
  private enemyController: any; // EnemyController type
  private uiController: any; // UIController type
  private playerLevel: number;
  private sortedEnemyLevels: number[] = [];
  private currentLevelIndex: number = 0;

  constructor(
    scene: Phaser.Scene,
    playerController: any,
    enemyController: any,
    uiController: any,
    initialLevel: number,
    enemyLevels: number[]
  ) {
    this.scene = scene;
    this.playerController = playerController;
    this.enemyController = enemyController;
    this.uiController = uiController;
    this.playerLevel = initialLevel;
    this.sortedEnemyLevels = [...enemyLevels].sort((a, b) => a - b);
    this.currentLevelIndex = 0;
  }

  handleEnemyDefeat(enemy: EnemyUnit, onAllDefeated: () => void) {
    // Level up the player when defeating an enemy
    if (enemy.level === this.playerLevel && this.sortedEnemyLevels.length > 0) {
      if (this.currentLevelIndex < this.sortedEnemyLevels.length - 1) {
        this.currentLevelIndex++;
        const nextLevel = this.sortedEnemyLevels[this.currentLevelIndex];
        const levelDifference = nextLevel - this.playerLevel;

        this.playerLevel = nextLevel;
        this.enemyController.setPlayerLevel(this.playerLevel);
        this.uiController.updateLevel(this.playerLevel);

        // Increase max health by 10 per level difference
        const newMaxHealth =
          this.playerController.getMaxHealth() + 10 * levelDifference;
        const healAmount = Math.floor(newMaxHealth * 0.5);
        const newHealth = Math.min(
          newMaxHealth,
          this.playerController.getHealth() + healAmount
        );
        this.playerController.setHealth(newHealth, newMaxHealth);
        this.uiController.updateHealthBar();

        // Show level up text
        this.showLevelUpText(healAmount);
      }
    }

    // Check if all enemies are defeated
    if (this.enemyController.areAllDefeated()) {
      this.scene.time.delayedCall(2000, onAllDefeated);
    }
  }

  private showLevelUpText(healAmount: number) {
    const player = this.playerController.getPlayer();
    const levelUpText = this.scene.add.text(
      player.x,
      player.y - 70,
      `LEVEL UP! +${healAmount} HP`,
      {
        fontFamily: "'Pixelify Sans', monospace",
        fontSize: "20px",
        color: "#00ffcc",
      }
    );
    levelUpText.setDepth(1300);

    this.scene.tweens.add({
      targets: levelUpText,
      y: levelUpText.y - 40,
      alpha: 0,
      duration: 1500,
      onComplete: () => levelUpText.destroy(),
    });
  }

  getPlayerLevel(): number {
    return this.playerLevel;
  }

  setPlayerLevel(level: number) {
    this.playerLevel = level;
    this.uiController.updateLevel(level);
  }
}
