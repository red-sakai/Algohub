/**
 * Tree Insertion System (Breadth-First)
 * Manages slot queue for level-order tree building
 */

import type { SlotInfo } from '../types/game';

/**
 * Initialize available slots with root's children
 * Assumes root is at index 1
 */
export function initializeSlots(): SlotInfo[] {
    return [
        { parentIndex: 1, side: 'left', level: 2 },
        { parentIndex: 1, side: 'right', level: 2 }
    ];
}

/**
 * Get the next available slot (breadth-first order)
 */
export function getNextSlot(slots: SlotInfo[]): SlotInfo | null {
    return slots.length > 0 ? slots[0] : null;
}

/**
 * Calculate the actual node index from parent and side
 * Left child: parent * 2
 * Right child: parent * 2 + 1
 */
export function calculateNodeIndex(parentIndex: number, side: 'left' | 'right'): number {
    return side === 'left' ? parentIndex * 2 : parentIndex * 2 + 1;
}

/**
 * Process slot insertion: remove filled slot, add new slots for children
 */
export function processSlotInsertion(
    slots: SlotInfo[],
    insertedIndex: number,
    insertedLevel: number
): SlotInfo[] {
    const newSlots = [...slots];

    // Remove the slot we just filled (always the first one in breadth-first)
    newSlots.shift();

    // If the inserted node is not at max depth (5), add its children to the queue
    if (insertedLevel < 5) {
        newSlots.push({
            parentIndex: insertedIndex,
            side: 'left',
            level: insertedLevel + 1
        });
        newSlots.push({
            parentIndex: insertedIndex,
            side: 'right',
            level: insertedLevel + 1
        });
    }

    return newSlots;
}

/**
 * Check if tree is full (no more slots available)
 */
export function isTreeFull(slots: SlotInfo[]): boolean {
    return slots.length === 0;
}

/**
 * Get the level of a node by its index
 */
export function getNodeLevel(index: number): number {
    if (index <= 0) return 0;
    return Math.floor(Math.log2(index)) + 1;
}

/**
 * Count total nodes in tree
 */
export function countNodes(values: (number | null)[]): number {
    return values.slice(1).filter(v => v !== null).length;
}
