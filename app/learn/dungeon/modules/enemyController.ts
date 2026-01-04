import Phaser from "phaser";
import { GAME_CONSTANTS } from "./constants";
import type { EnemyUnit, TreeNode } from "./types";
import { TreeBuilder } from "./treeBuilder";

export class EnemyController {
  private scene: Phaser.Scene;
  private enemies: EnemyUnit[] = [];
  private wallColliders: Phaser.Physics.Arcade.StaticGroup;
  private enemyVsEnemyColliders: Phaser.Physics.Arcade.Collider[] = [];
  private enemyVsPlayerColliders: Phaser.Physics.Arcade.Collider[] = [];
  private player: Phaser.Physics.Arcade.Sprite;
  private playerLevel: number;

  constructor(
    scene: Phaser.Scene,
    wallColliders: Phaser.Physics.Arcade.StaticGroup,
    player: Phaser.Physics.Arcade.Sprite,
    playerLevel: number
  ) {
    this.scene = scene;
    this.wallColliders = wallColliders;
    this.player = player;
    this.playerLevel = playerLevel;
  }

  getEnemies(): EnemyUnit[] {
    return this.enemies;
  }

  setPlayerLevel(level: number) {
    this.playerLevel = level;
  }

  createEnemiesAtNodes(
    nodes: Array<{ x: number; y: number }>,
    enemyLevels: number[],
    mapData: {
      tileSize?: number;
      layers?: Array<{
        name: string;
        tiles?: Array<{ x: number; y: number; id: string }>;
      }>;
    } | null,
    mapScale: number
  ): Array<{ x: number; y: number; level: number; index: number }> {
    if (!nodes.length) return [];

    const shadowOffset =
      (GAME_CONSTANTS.FRAME_HEIGHT * GAME_CONSTANTS.SPRITE_SCALE) / 2 - 10;
    const numEnemies = nodes.length;

    // Use provided enemy levels or fallback
    const enemyLevelsByOrder =
      enemyLevels.length > 0
        ? [...enemyLevels]
        : [1, 6, 5, 2, 7, 4, 3, 8, 9, 10, 11, 12];

    // Ensure unique levels
    const usedLevels = new Set<number>();
    const uniqueLevels: number[] = [];

    for (const level of enemyLevelsByOrder) {
      if (!usedLevels.has(level)) {
        uniqueLevels.push(level);
        usedLevels.add(level);
      }
    }

    if (uniqueLevels.length < numEnemies) {
      let nextLevel = 1;
      while (uniqueLevels.length < numEnemies) {
        if (!usedLevels.has(nextLevel)) {
          uniqueLevels.push(nextLevel);
          usedLevels.add(nextLevel);
        }
        nextLevel++;
        if (nextLevel > 100) break;
      }
    }

    // Sort levels so lowest is first (will be assigned to root in pre-order traversal)
    uniqueLevels.sort((a, b) => a - b);

    // Add index to nodes
    const nodesWithIndex = nodes.map((node, index) => ({
      x: node.x,
      y: node.y,
      level: 0,
      index: index,
    }));

    // Get floor tiles for tree building
    const tileSize = mapData?.tileSize || 64;
    let floorTileWorldPositions: Array<{
      tileX: number;
      tileY: number;
      worldX: number;
      worldY: number;
    }> = [];

    if (mapData && mapData.layers) {
      const nodesLayer = mapData.layers.find(
        (layer: { name: string; tiles?: Array<{ x: number; y: number; id: string }> }) =>
          layer.name === "nodes"
      );

      if (nodesLayer?.tiles) {
        const nodeFloorTiles = nodesLayer.tiles.filter(
          (tile: { x: number; y: number; id: string }) => tile.id === "33"
        );

        floorTileWorldPositions = nodeFloorTiles.map(
          (tile: { x: number; y: number; id: string }) => ({
            tileX: tile.x,
            tileY: tile.y,
            worldX: tile.x * tileSize * mapScale + (tileSize * mapScale) / 2,
            worldY: tile.y * tileSize * mapScale + (tileSize * mapScale) / 2,
          })
        );
      }
    }

    // Build binary tree structure
    const tree = TreeBuilder.buildBinaryTreeStructure(
      nodesWithIndex,
      floorTileWorldPositions,
      tileSize,
      mapScale
    );

    if (!tree) return [];

    // Build parent-child maps and collect pre-order nodes
    const enemyParentChildMap = new Map<number, number[]>();
    const enemyParentMap = new Map<number, number | null>();
    const preOrderNodes: Array<{ x: number; y: number; index: number }> = [];

    const buildParentChildMap = (
      node: TreeNode | null,
      parentIndex: number | null
    ) => {
      if (!node) return;

      const nodeIndex = node.node.index;
      enemyParentMap.set(nodeIndex, parentIndex);
      preOrderNodes.push({
        x: node.node.x,
        y: node.node.y,
        index: nodeIndex,
      });

      const children: number[] = [];

      if (node.left) {
        const leftIndex = node.left.node.index;
        children.push(leftIndex);
        buildParentChildMap(node.left, nodeIndex);
      }

      if (node.right) {
        const rightIndex = node.right.node.index;
        children.push(rightIndex);
        buildParentChildMap(node.right, nodeIndex);
      }

      if (children.length > 0) {
        enemyParentChildMap.set(nodeIndex, children);
      }
    };

    buildParentChildMap(tree, null);

    // Assign levels in pre-order traversal order using the provided enemy levels
    const nodeToLevelMap = new Map<number, number>();
    preOrderNodes.forEach((node, index) => {
      // Use the uniqueLevels array in pre-order traversal order
      const assignedLevel = uniqueLevels[index] || (index + 1);
      nodeToLevelMap.set(node.index, assignedLevel);
    });

    // Create enemies in pre-order order
    const traversalData: Array<{ x: number; y: number; level: number; index: number }> = [];
    preOrderNodes.forEach((preOrderNode) => {
      const nodeIndex = preOrderNode.index;
      const enemyLevel = nodeToLevelMap.get(nodeIndex) || 1;
      this.createEnemyAtNode(
        nodes[nodeIndex],
        nodeIndex,
        enemyLevel,
        enemyParentMap.get(nodeIndex) ?? null,
        enemyParentChildMap.get(nodeIndex) ?? [],
        shadowOffset
      );
      // Add to traversal data for return
      traversalData.push({
        x: preOrderNode.x,
        y: preOrderNode.y,
        level: enemyLevel,
        index: nodeIndex,
      });
    });

    this.setupEnemyColliders();
    return traversalData;
  }

  private createEnemyAtNode(
    node: { x: number; y: number },
    nodeIndex: number,
    enemyLevel: number,
    parentNodeIndex: number | null,
    childrenNodeIndices: number[],
    shadowOffset: number
  ) {
    const shadow = this.scene.add.ellipse(
      node.x,
      node.y + shadowOffset,
      50,
      20,
      0x000000,
      0.3
    );
    shadow.setDepth(1000);

    const sprite = this.scene.physics.add.sprite(node.x, node.y, "enemy-idle");
    sprite.setScale(GAME_CONSTANTS.SPRITE_SCALE);
    sprite.setOrigin(0.5, 0.5);
    sprite.setDepth(1001);
    sprite.setTint(0xff8888);

    const bodyWidth =
      (GAME_CONSTANTS.FRAME_WIDTH -
        GAME_CONSTANTS.FRAME_OFFSET_LEFT -
        GAME_CONSTANTS.FRAME_OFFSET_RIGHT) *
      GAME_CONSTANTS.SPRITE_SCALE;
    const bodyHeight =
      (GAME_CONSTANTS.FRAME_HEIGHT -
        GAME_CONSTANTS.FRAME_OFFSET_TOP -
        GAME_CONSTANTS.FRAME_OFFSET_BOTTOM) *
      GAME_CONSTANTS.SPRITE_SCALE;
    const body = sprite.body as Phaser.Physics.Arcade.Body;
    body.setSize(
      bodyWidth / GAME_CONSTANTS.SPRITE_SCALE,
      bodyHeight / GAME_CONSTANTS.SPRITE_SCALE
    );
    const bodyOffsetY =
      (GAME_CONSTANTS.FRAME_OFFSET_BOTTOM - GAME_CONSTANTS.FRAME_OFFSET_TOP) /
      2;
    body.setOffset(
      (GAME_CONSTANTS.FRAME_WIDTH - bodyWidth / GAME_CONSTANTS.SPRITE_SCALE) /
        2,
      (GAME_CONSTANTS.FRAME_HEIGHT -
        bodyHeight / GAME_CONSTANTS.SPRITE_SCALE) /
        2 +
        bodyOffsetY
    );
    body.setMaxVelocity(GAME_CONSTANTS.ENEMY_SPEED, GAME_CONSTANTS.ENEMY_SPEED);
    body.setDrag(600, 600);
    body.setAllowGravity(false);

    this.scene.physics.add.collider(sprite, this.wallColliders);

    const healthBarBg = this.scene.add.graphics().setDepth(1200);
    const healthBar = this.scene.add.graphics().setDepth(1201);

    const levelText = this.scene.add
      .text(node.x, node.y - 70, `Lv ${enemyLevel}`, {
        fontFamily: "'Pixelify Sans', monospace",
        fontSize: "12px",
        color: "#ffffff",
        backgroundColor: "#000000",
        padding: { x: 6, y: 3 },
      })
      .setOrigin(0.5, 0.5)
      .setDepth(1202);

    const maxHealth = 100; // Fixed enemy health

    const enemy: EnemyUnit = {
      sprite,
      shadow,
      health: maxHealth,
      maxHealth,
      level: enemyLevel,
      levelText,
      lastDirection: "down",
      defeated: false,
      healthBarBg,
      healthBar,
      homeX: node.x,
      homeY: node.y,
      attackCooldownMs: GAME_CONSTANTS.ENEMY_ATTACK_COOLDOWN_MS,
      attackCooldownRemaining: 0,
      attacking: false,
      nodeIndex,
      parentNodeIndex,
      unlocked: true,
      childrenNodeIndices,
    };

    try {
      sprite.play("enemy-idle-down");
    } catch (e) {
      console.warn("Error playing enemy idle animation:", e);
    }
    this.enemies.push(enemy);
  }

  setupEnemyColliders() {
    this.enemyVsEnemyColliders.forEach((c) => c.destroy());
    this.enemyVsPlayerColliders.forEach((c) => c.destroy());
    this.enemyVsEnemyColliders = [];
    this.enemyVsPlayerColliders = [];

    this.enemies.forEach((enemy) => {
      if (enemy.defeated) return;
      const col = this.scene.physics.add.collider(
        enemy.sprite,
        this.player,
        (enemySprite, playerSprite) => {
          // Push enemy away from player if they overlap
          const enemyGameObject = enemySprite as Phaser.Physics.Arcade.Sprite;
          const playerGameObject = playerSprite as Phaser.Physics.Arcade.Sprite;
          const enemyBody = enemyGameObject.body as Phaser.Physics.Arcade.Body;
          const playerBody = playerGameObject.body as Phaser.Physics.Arcade.Body;
          if (!enemyBody || !playerBody) return;

          const dx = enemyGameObject.x - playerGameObject.x;
          const dy = enemyGameObject.y - playerGameObject.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const minDistance = 80;

          if (distance < minDistance && distance > 0) {
            const pushDistance = minDistance - distance;
            const norm = Math.max(1, distance);
            const pushX = (dx / norm) * pushDistance;
            const pushY = (dy / norm) * pushDistance;
            enemyGameObject.x += pushX;
            enemyGameObject.y += pushY;
          }
        }
      );
      this.enemyVsPlayerColliders.push(col);
    });

    for (let i = 0; i < this.enemies.length; i++) {
      if (this.enemies[i].defeated) continue;
      for (let j = i + 1; j < this.enemies.length; j++) {
        if (this.enemies[j].defeated) continue;
        const col = this.scene.physics.add.collider(
          this.enemies[i].sprite,
          this.enemies[j].sprite
        );
        this.enemyVsEnemyColliders.push(col);
      }
    }
  }

  update(delta: number, onEnemyAttack: (enemy: EnemyUnit, damage: number) => void) {
    if (!this.enemies.length) return;

    this.enemies = this.enemies.filter((enemyUnit) => {
      return enemyUnit.sprite && enemyUnit.sprite.active;
    });

    this.enemies.forEach((enemyUnit) => {
      const { sprite, shadow, defeated } = enemyUnit;
      if (defeated) return;
      if (!sprite || !sprite.active || !sprite.body) return;

      const body = sprite.body as Phaser.Physics.Arcade.Body;
      if (!body) return;

      body.enable = true;
      body.checkCollision.none = false;
      body.immovable = false;

      if (enemyUnit.attackCooldownRemaining > 0) {
        enemyUnit.attackCooldownRemaining = Math.max(
          0,
          enemyUnit.attackCooldownRemaining - delta
        );
      }

      const shadowOffset =
        (GAME_CONSTANTS.FRAME_HEIGHT * GAME_CONSTANTS.SPRITE_SCALE) / 2 - 10;
      if (shadow && shadow.active) {
        shadow.x = sprite.x;
        shadow.y = sprite.y + shadowOffset;
      }
      if (enemyUnit.levelText && enemyUnit.levelText.active) {
        enemyUnit.levelText.x = sprite.x;
        enemyUnit.levelText.y = sprite.y - 70;
      }

      const dx = this.player.x - sprite.x;
      const dy = this.player.y - sprite.y;
      const distanceToPlayer = Math.sqrt(dx * dx + dy * dy);

      if (
        !enemyUnit.attacking &&
        enemyUnit.attackCooldownRemaining <= 0 &&
        distanceToPlayer <= GAME_CONSTANTS.ENEMY_ATTACK_RANGE
      ) {
        enemyUnit.attacking = true;
        sprite.setVelocity(0, 0);

        // Push enemy back slightly to prevent overlap with player
        const minDistance = 80; // Minimum distance to maintain
        if (distanceToPlayer < minDistance && distanceToPlayer > 0) {
          const pushBackDistance = minDistance - distanceToPlayer;
          const norm = Math.max(1, distanceToPlayer);
          const pushX = (-dx / norm) * pushBackDistance;
          const pushY = (-dy / norm) * pushBackDistance;
          sprite.x += pushX;
          sprite.y += pushY;
        }

        const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
        let dir: "up" | "down" | "left" | "right" = "down";
        if (angleDeg > -45 && angleDeg < 45) dir = "right";
        else if (angleDeg > 135 || angleDeg < -135) dir = "left";
        else if (angleDeg >= 45 && angleDeg <= 135) dir = "down";
        else dir = "up";
        enemyUnit.lastDirection = dir;
        try {
          sprite.play(`enemy-attack-${dir}`);
        } catch (e) {
          console.warn("Error playing enemy attack animation:", e);
        }

        this.scene.time.delayedCall(220, () => {
          const baseDamage = GAME_CONSTANTS.ENEMY_BASE_DAMAGE;
          const damage = this.getDamageAfterLevels(
            baseDamage,
            enemyUnit.level,
            this.playerLevel
          );
          onEnemyAttack(enemyUnit, damage);

          const kbForce = GAME_CONSTANTS.KNOCKBACK_FORCE;
          const norm = Math.max(1, Math.sqrt(dx * dx + dy * dy));
          const kbX = (dx / norm) * kbForce;
          const kbY = (dy / norm) * kbForce;
          this.player.setVelocity(kbX, kbY);
        });

        sprite.once("animationcomplete", () => {
          enemyUnit.attacking = false;
          enemyUnit.attackCooldownRemaining = enemyUnit.attackCooldownMs;
          try {
            sprite.play(`enemy-idle-${enemyUnit.lastDirection}`, true);
          } catch (e) {
            console.warn("Error playing enemy idle animation:", e);
          }
        });
      } else if (
        !enemyUnit.attacking &&
        distanceToPlayer <= GAME_CONSTANTS.ENEMY_AGGRO_RANGE
      ) {
        // Stop moving if too close to player (within attack range but not attacking yet)
        const minApproachDistance = 85; // Minimum distance to maintain
        if (distanceToPlayer < minApproachDistance) {
          sprite.setVelocity(0, 0);
          // Push back if overlapping
          if (distanceToPlayer < 80 && distanceToPlayer > 0) {
            const pushBackDistance = 80 - distanceToPlayer;
            const norm = Math.max(1, distanceToPlayer);
            const pushX = (-dx / norm) * pushBackDistance;
            const pushY = (-dy / norm) * pushBackDistance;
            sprite.x += pushX;
            sprite.y += pushY;
          }
          // Play idle animation when stopped
          try {
            sprite.play(`enemy-idle-${enemyUnit.lastDirection}`, true);
          } catch (e) {
            console.warn("Error playing enemy idle animation:", e);
          }
        } else {
          const angle = Math.atan2(dy, dx);
          const vx = Math.cos(angle) * GAME_CONSTANTS.ENEMY_SPEED;
          const vy = Math.sin(angle) * GAME_CONSTANTS.ENEMY_SPEED;
          sprite.setVelocity(vx, vy);

          // Update animation based on movement direction
          if (Math.abs(vx) > Math.abs(vy)) {
            if (vx < 0) {
              enemyUnit.lastDirection = "left";
              try {
                sprite.play("enemy-run-left", true);
              } catch (e) {
                console.warn("Error playing enemy run animation:", e);
              }
            } else {
              enemyUnit.lastDirection = "right";
              try {
                sprite.play("enemy-run-right", true);
              } catch (e) {
                console.warn("Error playing enemy run animation:", e);
              }
            }
          } else {
            if (vy < 0) {
              enemyUnit.lastDirection = "up";
              try {
                sprite.play("enemy-run-up", true);
              } catch (e) {
                console.warn("Error playing enemy run animation:", e);
              }
            } else {
              enemyUnit.lastDirection = "down";
              try {
                sprite.play("enemy-run-down", true);
              } catch (e) {
                console.warn("Error playing enemy run animation:", e);
              }
            }
          }
        }
      } else if (!enemyUnit.attacking) {
        sprite.setVelocity(0, 0);
        const idleAnim = `enemy-idle-${enemyUnit.lastDirection}`;
        if (
          !sprite.anims.isPlaying ||
          !sprite.anims.currentAnim?.key.startsWith("enemy-idle")
        ) {
          try {
            sprite.play(idleAnim, true);
          } catch (e) {
            console.warn("Error playing enemy idle animation:", e);
          }
        }
      }

      this.updateEnemyHealthBar(enemyUnit);
    });
  }

  private updateEnemyHealthBar(enemy: EnemyUnit) {
    if (!enemy.sprite || !enemy.sprite.active) return;

    const barWidth = 40;
    const barHeight = 6;
    const barX = enemy.sprite.x - barWidth / 2;
    const barY = enemy.sprite.y - 50;

    if (enemy.healthBarBg && enemy.healthBarBg.active) {
      enemy.healthBarBg.clear();
    }
    if (enemy.healthBar && enemy.healthBar.active) {
      enemy.healthBar.clear();
    }

    if (enemy.defeated) return;

    if (enemy.healthBarBg && enemy.healthBarBg.active) {
      enemy.healthBarBg.fillStyle(0x000000, 0.8);
      enemy.healthBarBg.fillRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4);
      enemy.healthBarBg.fillStyle(0x550000, 1);
      enemy.healthBarBg.fillRect(barX, barY, barWidth, barHeight);
    }

    const pct = Phaser.Math.Clamp(enemy.health / enemy.maxHealth, 0, 1);
    let color = 0x00ff00;
    if (pct < 0.3) color = 0xff0000;
    else if (pct < 0.6) color = 0xffaa00;

    if (enemy.healthBar && enemy.healthBar.active) {
      enemy.healthBar.fillStyle(color, 1);
      enemy.healthBar.fillRect(barX, barY, barWidth * pct, barHeight);
    }
  }

  private getDamageAfterLevels(
    baseDamage: number,
    attackerLevel: number,
    defenderLevel: number
  ): number {
    const levelDiff = defenderLevel - attackerLevel;
    let multiplier = 1;

    if (levelDiff <= 0) {
      const bonus = Math.abs(levelDiff) * 0.2;
      multiplier = 1 + bonus;
    } else {
      const reduction = Math.min(0.8, levelDiff * 0.15);
      multiplier = 1 - reduction;
    }

    multiplier = Phaser.Math.Clamp(multiplier, 0.2, 3.0);
    return Math.max(1, Math.floor(baseDamage * multiplier));
  }

  damageEnemy(enemy: EnemyUnit, damage: number, playerLevel: number) {
    if (enemy.defeated) return;

    const adjustedDamage = this.getDamageAfterLevels(
      damage,
      playerLevel,
      enemy.level
    );
    enemy.health -= adjustedDamage;

    const damageText = this.scene.add.text(
      enemy.sprite.x,
      enemy.sprite.y - 50,
      `-${adjustedDamage}`,
      {
        fontFamily: "'Pixelify Sans', monospace",
        fontSize: "16px",
        color: "#ff0000",
      }
    );
    damageText.setDepth(1300);

    this.scene.tweens.add({
      targets: damageText,
      y: damageText.y - 30,
      alpha: 0,
      duration: 800,
      onComplete: () => damageText.destroy(),
    });

    enemy.sprite.setTint(0xff0000);
    this.scene.time.delayedCall(120, () => {
      if (!enemy.defeated) {
        enemy.sprite.setTint(0xff8888);
      }
    });

    if (enemy.health <= 0) {
      enemy.health = 0;
      return true; // Enemy defeated
    }
    return false;
  }

  defeatEnemy(enemy: EnemyUnit) {
    if (enemy.defeated) return;
    enemy.defeated = true;
    enemy.sprite.setVelocity(0, 0);
    enemy.levelText.setVisible(false);

    try {
      enemy.sprite.play("enemy-hurt");
    } catch (e) {
      console.warn("Error playing enemy hurt animation:", e);
    }
    enemy.sprite.once("animationcomplete", () => {
      enemy.sprite.setTint(0x666666);
      this.scene.tweens.add({
        targets: [
          enemy.sprite,
          enemy.shadow,
          enemy.healthBar,
          enemy.healthBarBg,
          enemy.levelText,
        ],
        alpha: 0,
        duration: 800,
        onComplete: () => {
          enemy.sprite.destroy();
          enemy.shadow.destroy();
          enemy.healthBar.destroy();
          enemy.healthBarBg.destroy();
          enemy.levelText.destroy();
        },
      });
    });
  }

  areAllDefeated(): boolean {
    return this.enemies.length > 0 && this.enemies.every((e) => e.defeated);
  }
}
