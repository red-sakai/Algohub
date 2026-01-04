/**
 * Game configuration constants
 */
export const GAME_CONSTANTS = {
  // Sprite dimensions
  FRAME_WIDTH: 64,
  FRAME_HEIGHT: 64,
  SPRITE_SCALE: 2,
  SLASH_FRAME_WIDTH: 192,
  SLASH_FRAME_HEIGHT: 192,

  // Map configuration
  MAP_SCALE: 4,

  // Frame offsets (inset from edges)
  FRAME_OFFSET_TOP: 0,
  FRAME_OFFSET_BOTTOM: 30,
  FRAME_OFFSET_LEFT: 20,
  FRAME_OFFSET_RIGHT: 20,

  // Lighting and torch system
  BASE_VISION_RADIUS: 120,
  TORCH_VISION_BONUS: 80,
  TORCH_DURATION: 15000, // 15 seconds per torch
  MAX_TORCHES: 5,

  // Player configuration
  PLAYER_SPEED: 200,
  PLAYER_BASE_HEALTH: 100,
  PLAYER_HEALTH_PER_LEVEL: 10,

  // Enemy configuration
  ENEMY_SPEED: 80,
  ENEMY_BASE_HEALTH: 60,
  ENEMY_HEALTH_PER_LEVEL: 12,
  ENEMY_ATTACK_COOLDOWN_MS: 900,
  ENEMY_AGGRO_RANGE: 260,
  ENEMY_ATTACK_RANGE: 90,

  // Combat configuration
  PLAYER_ATTACK_RANGE: 100,
  PLAYER_BASE_DAMAGE: 50,
  ENEMY_BASE_DAMAGE: 10,
  KNOCKBACK_FORCE: 250,

  // Layer rendering
  DEPTH_PER_LAYER: 10,
  LAYER_RENDER_ORDER: [
    "Floor",
    "floors",
    "Walls",
    "Walls sides",
    "Walls (Copy)",
    "Walls pillars",
    "Traps",
    "Gargoyles",
    "Pickups",
    "Miscs",
    "nodes",
    "Layer_9",
  ],

  // Collectibles configuration
  COLLECTIBLE_TYPES: [
    { type: "health", color: 0x00ff00, label: "HP" },
    { type: "attack_speed", color: 0xff0000, label: "ATK SPD" },
    { type: "speed_boost", color: 0x00aaff, label: "SPD" },
    { type: "attack_boost", color: 0xffaa00, label: "ATK" },
  ] as const,

  // Buff durations (ms)
  ATTACK_SPEED_BUFF_DURATION: 10000,
  SPEED_BOOST_DURATION: 10000,
  ATTACK_BOOST_DURATION: 15000,

  // Buff multipliers
  ATTACK_SPEED_MULTIPLIER: 1.5,
  SPEED_BOOST_MULTIPLIER: 1.5,
  ATTACK_BOOST_MULTIPLIER: 1.5,

  // Health potion
  HEALTH_POTION_AMOUNT: 30,
} as const;
