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

    // Skill animations (character-specific)
    if (selectedCharacter === "goku") {
      // Spellcast animations for Goku
      const skillFrames = [
        { key: "skill-up", start: 0, end: 6 },
        { key: "skill-left", start: 7, end: 13 },
        { key: "skill-down", start: 14, end: 20 },
        { key: "skill-right", start: 21, end: 27 },
      ];

      skillFrames.forEach(({ key, start, end }) => {
        scene.anims.create({
          key,
          frames: scene.anims.generateFrameNumbers("player-skill", {
            start,
            end,
          }),
          frameRate: 12,
          repeat: 0,
        });
      });
    } else {
      // Slash animations for other characters
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
    }

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
   * Create all enemy animations
   */
  static createEnemyAnimations(scene: Phaser.Scene) {
    // Enemy idle animations
    const idleFrames = [
      { key: "enemy-idle-up", start: 0, end: 1 },
      { key: "enemy-idle-left", start: 2, end: 3 },
      { key: "enemy-idle-down", start: 4, end: 5 },
      { key: "enemy-idle-right", start: 6, end: 7 },
    ];

    idleFrames.forEach(({ key, start, end }) => {
      scene.anims.create({
        key,
        frames: scene.anims.generateFrameNumbers("enemy-idle", {
          start,
          end,
        }),
        frameRate: 4,
        repeat: -1,
      });
    });

    // Enemy run animations
    const runFrames = [
      { key: "enemy-run-up", start: 0, end: 7 },
      { key: "enemy-run-left", start: 8, end: 15 },
      { key: "enemy-run-down", start: 16, end: 23 },
      { key: "enemy-run-right", start: 24, end: 31 },
    ];

    runFrames.forEach(({ key, start, end }) => {
      scene.anims.create({
        key,
        frames: scene.anims.generateFrameNumbers("enemy-run", {
          start,
          end,
        }),
        frameRate: 12,
        repeat: -1,
      });
    });

    // Enemy attack animations
    const attackFrames = [
      { key: "enemy-attack-up", start: 0, end: 5 },
      { key: "enemy-attack-left", start: 6, end: 11 },
      { key: "enemy-attack-down", start: 12, end: 17 },
      { key: "enemy-attack-right", start: 18, end: 23 },
    ];

    attackFrames.forEach(({ key, start, end }) => {
      scene.anims.create({
        key,
        frames: scene.anims.generateFrameNumbers("enemy-attack", {
          start,
          end,
        }),
        frameRate: 15,
        repeat: 0,
      });
    });

    // Enemy hurt animation
    scene.anims.create({
      key: "enemy-hurt",
      frames: scene.anims.generateFrameNumbers("enemy-hurt", {
        start: 0,
        end: 5,
      }),
      frameRate: 12,
      repeat: 0,
    });
  }
}
