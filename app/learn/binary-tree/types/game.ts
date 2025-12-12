/**
 * Type definitions for Binary Skill Tree Roguelike
 */

export type GameState = 'CHARACTER' | 'COMBAT' | 'CHOICE' | 'TRAVERSAL_SELECT' | 'RESULTS';

export type Rarity = 'common' | 'rare' | 'legendary';

export type TraversalType = 'preorder' | 'inorder' | 'postorder';

export interface GeneratedNode {
    value: number;
    rarity: Rarity;
}

export interface NodeChoice {
    value: number;
    rarity: Rarity;
    description: string;
}

export interface SlotInfo {
    parentIndex: number;
    side: 'left' | 'right';
    level: number;
}

export interface Enemy {
    name: string;
    maxHealth: number;
    currentHealth: number;
    sprite?: string;
}

export interface RunStats {
    wavesDefeated: number;
    nodesEarned: number;
    leftChoices: number;
    rightChoices: number;
    finalPower: number;
}
