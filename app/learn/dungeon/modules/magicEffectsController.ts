import Phaser from "phaser";
import type { EnemyUnit } from "./types";

/**
 * Magic projectile for mage character
 */
export class MagicProjectile extends Phaser.GameObjects.Graphics {
  public velocity: Phaser.Math.Vector2;
  public damage: number;
  public traveled: number = 0;
  public maxRange: number;
  public active: boolean = true;
  private target: EnemyUnit | null;
  private homingStrength: number = 0.08; // How quickly projectile turns toward target
  private speed: number = 400;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    direction: string,
    damage: number,
    maxRange: number,
    target?: EnemyUnit
  ) {
    super(scene);
    this.scene.add.existing(this);

    this.damage = damage;
    this.maxRange = maxRange;
    this.target = target || null;

    // Set position
    this.setPosition(x, y);

    // Calculate initial velocity based on direction
    this.velocity = new Phaser.Math.Vector2(0, 0);

    switch (direction) {
      case "up":
        this.velocity.y = -this.speed;
        break;
      case "down":
        this.velocity.y = this.speed;
        break;
      case "left":
        this.velocity.x = -this.speed;
        break;
      case "right":
        this.velocity.x = this.speed;
        break;
    }

    // Draw the magic projectile (glowing purple orb)
    this.drawProjectile();
    this.setDepth(1000); // Ensure projectile is drawn on top
  }

  private drawProjectile() {
    this.clear();

    // Outer glow
    this.fillStyle(0x9d00ff, 0.3);
    this.fillCircle(0, 0, 12);

    // Middle glow
    this.fillStyle(0xbb00ff, 0.6);
    this.fillCircle(0, 0, 8);

    // Inner core
    this.fillStyle(0xff00ff, 1);
    this.fillCircle(0, 0, 5);

    // Add sparkles around the orb
    this.fillStyle(0xffffff, 0.8);
    this.fillCircle(-3, 0, 1.5);
    this.fillCircle(3, 0, 1.5);
    this.fillCircle(0, -3, 1.5);
    this.fillCircle(0, 3, 1.5);
  }

  update(delta: number): boolean {
    if (!this.active) return false;

    // Apply homing behavior if target exists and is active
    if (
      this.target &&
      !this.target.defeated &&
      this.target.sprite &&
      this.target.sprite.active
    ) {
      // Calculate direction to target
      const dx = this.target.sprite.x - this.x;
      const dy = this.target.sprite.y - this.y;
      const distanceToTarget = Math.sqrt(dx * dx + dy * dy);

      if (distanceToTarget > 0) {
        // Normalize direction to target
        const targetDirX = dx / distanceToTarget;
        const targetDirY = dy / distanceToTarget;

        // Normalize current velocity
        const currentSpeed = this.velocity.length();
        if (currentSpeed > 0) {
          const currentDirX = this.velocity.x / currentSpeed;
          const currentDirY = this.velocity.y / currentSpeed;

          // Interpolate between current direction and target direction
          const newDirX =
            currentDirX + (targetDirX - currentDirX) * this.homingStrength;
          const newDirY =
            currentDirY + (targetDirY - currentDirY) * this.homingStrength;

          // Normalize the new direction and apply speed
          const newLength = Math.sqrt(newDirX * newDirX + newDirY * newDirY);
          if (newLength > 0) {
            this.velocity.x = (newDirX / newLength) * this.speed;
            this.velocity.y = (newDirY / newLength) * this.speed;
          }
        }
      }
    }

    const movement = this.velocity.clone().scale(delta / 1000);
    this.x += movement.x;
    this.y += movement.y;

    this.traveled += movement.length();

    // Check if projectile has exceeded max range
    if (this.traveled >= this.maxRange) {
      this.active = false;
      this.destroy();
      return false;
    }

    return true;
  }

  getBounds(): Phaser.Geom.Circle {
    return new Phaser.Geom.Circle(this.x, this.y, 8);
  }

  hit() {
    this.active = false;
    this.createHitEffect();
    this.destroy();
  }

  private createHitEffect() {
    // Create a small explosion effect
    const particles = 8;
    for (let i = 0; i < particles; i++) {
      const angle = (i / particles) * Math.PI * 2;
      const particle = this.scene.add.graphics();
      particle.fillStyle(0xff00ff, 1);
      particle.fillCircle(0, 0, 3);
      particle.setPosition(this.x, this.y);
      particle.setDepth(1001);

      const speed = 100;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;

      this.scene.tweens.add({
        targets: particle,
        x: particle.x + vx * 0.2,
        y: particle.y + vy * 0.2,
        alpha: 0,
        duration: 300,
        onComplete: () => particle.destroy(),
      });
    }
  }
}

/**
 * Controller for managing magic effects in the game
 */
export class MagicEffectsController {
  private scene: Phaser.Scene;
  private projectiles: MagicProjectile[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Create a magic projectile
   */
  createProjectile(
    x: number,
    y: number,
    direction: string,
    damage: number,
    maxRange: number = 150,
    target?: EnemyUnit
  ): MagicProjectile {
    const projectile = new MagicProjectile(
      this.scene,
      x,
      y,
      direction,
      damage,
      maxRange,
      target
    );
    this.projectiles.push(projectile);
    return projectile;
  }

  /**
   * Update all active projectiles
   */
  update(delta: number) {
    this.projectiles = this.projectiles.filter((projectile) =>
      projectile.update(delta)
    );
  }

  /**
   * Get all active projectiles
   */
  getProjectiles(): MagicProjectile[] {
    return this.projectiles.filter((p) => p.active);
  }

  /**
   * Clear all projectiles
   */
  clearAll() {
    this.projectiles.forEach((projectile) => {
      if (projectile.active) {
        projectile.destroy();
      }
    });
    this.projectiles = [];
  }

  /**
   * Destroy the controller and clean up
   */
  destroy() {
    this.clearAll();
  }
}
