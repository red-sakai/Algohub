import Phaser from "phaser";
import { GAME_CONSTANTS } from "./constants";

export class AnimationManager {
  /**
   * Create all player animations
   */
  static createPlayerAnimations(
    scene: Phaser.Scene,
    selectedCharacter: string
  ) {
    // Idle animations
    const idleFrames = [
      { key: "idle-up", start: 0, end: 1 },
      { key: "idle-left", start: 2, end: 3 },
      { key: "idle-down", start: 4, end: 5 },
      { key: "idle-right", start: 6, end: 7 },
    ];

    idleFrames.forEach(({ key, start, end }) => {
      scene.anims.create({
        key,
        frames: scene.anims.generateFrameNumbers("player-idle", {
          start,
          end,
        }),
        frameRate: 4,
        repeat: -1,
      });
    });

    // Run animations
    const runFrames = [
      { key: "run-up", start: 0, end: 7 },
      { key: "run-left", start: 8, end: 15 },
      { key: "run-down", start: 16, end: 23 },
      { key: "run-right", start: 24, end: 31 },
    ];

    runFrames.forEach(({ key, start, end }) => {
      scene.anims.create({
        key,
        frames: scene.anims.generateFrameNumbers("player-run", {
          start,
          end,
        }),
        frameRate: 12,
        repeat: -1,
      });
    });

    // Attack/Skill animations (standard 64x64 frames for all new characters)
    const skillFrames = [
      { key: "skill-up", start: 0, end: 5 },
      { key: "skill-left", start: 6, end: 11 },
      { key: "skill-down", start: 12, end: 17 },
      { key: "skill-right", start: 18, end: 23 },
    ];

    skillFrames.forEach(({ key, start, end }) => {
      scene.anims.create({
        key,
        frames: scene.anims.generateFrameNumbers("player-skill", {
          start,
          end,
        }),
        frameRate: 15,
        repeat: 0,
      });
    });

    // Jump animations
    const jumpFrames = [
      { key: "jump-up", start: 0, end: 4 },
      { key: "jump-left", start: 5, end: 9 },
      { key: "jump-down", start: 10, end: 14 },
      { key: "jump-right", start: 15, end: 19 },
    ];

    jumpFrames.forEach(({ key, start, end }) => {
      scene.anims.create({
        key,
        frames: scene.anims.generateFrameNumbers("player-jump", {
          start,
          end,
        }),
        frameRate: 12,
        repeat: 0,
      });
    });
  }

  /**
   * Create all enemy animations for a specific enemy type
   */
  static createEnemyAnimations(scene: Phaser.Scene, enemyType: string) {
    // Enemy idle animations
    const idleFrames = [
      { key: `enemy-${enemyType}-idle-up`, start: 0, end: 1 },
      { key: `enemy-${enemyType}-idle-left`, start: 2, end: 3 },
      { key: `enemy-${enemyType}-idle-down`, start: 4, end: 5 },
      { key: `enemy-${enemyType}-idle-right`, start: 6, end: 7 },
    ];

    idleFrames.forEach(({ key, start, end }) => {
      if (!scene.anims.exists(key)) {
        scene.anims.create({
          key,
          frames: scene.anims.generateFrameNumbers(`enemy-${enemyType}-idle`, {
            start,
            end,
          }),
          frameRate: 4,
          repeat: -1,
        });
      }
    });

    // Enemy run animations
    const runFrames = [
      { key: `enemy-${enemyType}-run-up`, start: 0, end: 7 },
      { key: `enemy-${enemyType}-run-left`, start: 8, end: 15 },
      { key: `enemy-${enemyType}-run-down`, start: 16, end: 23 },
      { key: `enemy-${enemyType}-run-right`, start: 24, end: 31 },
    ];

    runFrames.forEach(({ key, start, end }) => {
      if (!scene.anims.exists(key)) {
        scene.anims.create({
          key,
          frames: scene.anims.generateFrameNumbers(`enemy-${enemyType}-run`, {
            start,
            end,
          }),
          frameRate: 12,
          repeat: -1,
        });
      }
    });

    // Enemy attack animations
    const attackFrames = [
      { key: `enemy-${enemyType}-attack-up`, start: 0, end: 5 },
      { key: `enemy-${enemyType}-attack-left`, start: 6, end: 11 },
      { key: `enemy-${enemyType}-attack-down`, start: 12, end: 17 },
      { key: `enemy-${enemyType}-attack-right`, start: 18, end: 23 },
    ];

    attackFrames.forEach(({ key, start, end }) => {
      if (!scene.anims.exists(key)) {
        scene.anims.create({
          key,
          frames: scene.anims.generateFrameNumbers(
            `enemy-${enemyType}-attack`,
            {
              start,
              end,
            }
          ),
          frameRate: 15,
          repeat: 0,
        });
      }
    });

    // Enemy hurt animation
    const hurtKey = `enemy-${enemyType}-hurt`;
    if (!scene.anims.exists(hurtKey)) {
      scene.anims.create({
        key: hurtKey,
        frames: scene.anims.generateFrameNumbers(`enemy-${enemyType}-hurt`, {
          start: 0,
          end: 5,
        }),
        frameRate: 12,
        repeat: 0,
      });
    }
  }

  /**
   * Create animations for all enemy types
   */
  static createAllEnemyAnimations(scene: Phaser.Scene) {
    GAME_CONSTANTS.ENEMY_TYPES.forEach((enemyType) => {
      AnimationManager.createEnemyAnimations(scene, enemyType);
    });
  }
}
