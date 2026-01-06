export type EnemyUnit = {
  sprite: Phaser.Physics.Arcade.Sprite;
  shadow: Phaser.GameObjects.Ellipse;
  health: number;
  maxHealth: number;
  level: number;
  levelText: Phaser.GameObjects.Text;
  lastDirection: string;
  defeated: boolean;
  healthBarBg: Phaser.GameObjects.Graphics;
  healthBar: Phaser.GameObjects.Graphics;
  homeX: number;
  homeY: number;
  attackCooldownMs: number;
  attackCooldownRemaining: number;
  attacking: boolean;
  nodeIndex: number;
  parentNodeIndex: number | null;
  unlocked: boolean;
  childrenNodeIndices: number[];
  enemyType: string; // Type of enemy (boar, orc, wartator, zombie)
};

export type TreeNode = {
  node: { x: number; y: number; level: number; index: number };
  left: TreeNode | null;
  right: TreeNode | null;
  traversalOrder?: number;
};

export type MapLayer = {
  name: string;
  tiles: Array<{ x: number; y: number; id: string }>;
  collider?: boolean;
};

export type FloorTile = {
  tileX: number;
  tileY: number;
  worldX: number;
  worldY: number;
};
