import Phaser from "phaser";

/**
 * Shared utility for managing Phaser physics pause/resume
 * Provides consistent error handling and logging
 */
export class PhysicsHelper {
  /**
   * Safely pause physics for a scene
   */
  static pausePhysics(
    scene: Phaser.Scene | null | undefined,
    context: string = "PhysicsHelper"
  ): boolean {
    try {
      if (scene && scene.physics && scene.physics.world) {
        scene.physics.pause();
        console.log(`[${context}] Physics paused successfully`);
        return true;
      } else {
        console.warn(
          `[${context}] Cannot pause physics - scene or physics world not available`
        );
        return false;
      }
    } catch (error) {
      console.error(`[${context}] Error pausing physics:`, error);
      return false;
    }
  }

  /**
   * Safely resume physics for a scene
   */
  static resumePhysics(
    scene: Phaser.Scene | null | undefined,
    context: string = "PhysicsHelper"
  ): boolean {
    try {
      if (scene && scene.physics && scene.physics.world) {
        scene.physics.resume();
        console.log(`[${context}] Physics resumed successfully`);
        return true;
      } else {
        console.warn(
          `[${context}] Cannot resume physics - scene or physics world not available`
        );
        return false;
      }
    } catch (error) {
      console.error(`[${context}] Error resuming physics:`, error);
      return false;
    }
  }

  /**
   * Get a scene from a Phaser game instance safely
   */
  static getScene(
    game: Phaser.Game | null | undefined,
    sceneKey: string
  ): Phaser.Scene | null {
    try {
      if (game && game.scene) {
        const scene = game.scene.getScene(sceneKey);
        return scene || null;
      }
      return null;
    } catch (error) {
      console.error(`Error getting scene "${sceneKey}":`, error);
      return null;
    }
  }
}
