/**
 * Node Generation System
 * Generates good (upgrade) and bad (downgrade) skill nodes with rarity tiers
 */

import type { GeneratedNode, Rarity } from '../types/game';

/**
 * Generate a random integer between min and max (inclusive)
 */
function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate a "good" node (LEFT choice)
 * - Common (70%): +3 to +6
 * - Rare (25%): +7 to +12
 * - Legendary (5%): +15 to +25
 */
export function generateGoodNode(level: number): GeneratedNode {
    const roll = Math.random();

    if (roll < 0.70) {
        // Common (70%)
        return {
            value: randomInt(3, 6),
            rarity: 'common'
        };
    } else if (roll < 0.95) {
        // Rare (25%)
        return {
            value: randomInt(7, 12),
            rarity: 'rare'
        };
    } else {
        // Legendary (5%)
        return {
            value: randomInt(15, 25),
            rarity: 'legendary'
        };
    }
}

/**
 * Generate a "bad" node (RIGHT choice)
 * - Common negative (60%): -6 to -2
 * - Mild negative (30%): -1 to 0
 * - Small positive (10%): +1 to +3
 */
export function generateBadNode(level: number): GeneratedNode {
    const roll = Math.random();

    if (roll < 0.60) {
        // Common negative (60%)
        return {
            value: randomInt(-6, -2),
            rarity: 'common'
        };
    } else if (roll < 0.90) {
        // Mild negative (30%)
        return {
            value: randomInt(-1, 0),
            rarity: 'common'
        };
    } else {
        // Small positive (10%)
        return {
            value: randomInt(1, 3),
            rarity: 'common'
        };
    }
}

/**
 * Get color for rarity display
 */
export function getRarityColor(rarity: Rarity): string {
    switch (rarity) {
        case 'legendary':
            return 'text-amber-400 border-amber-500 bg-amber-500/20';
        case 'rare':
            return 'text-purple-400 border-purple-500 bg-purple-500/20';
        case 'common':
        default:
            return 'text-slate-400 border-slate-500 bg-slate-500/20';
    }
}

/**
 * Get description text for node choice
 */
export function getNodeDescription(value: number, rarity: Rarity): string {
    const prefix = value > 0 ? '+' : '';
    const rarityLabel = rarity.charAt(0).toUpperCase() + rarity.slice(1);
    return `${prefix}${value} Power (${rarityLabel})`;
}
