/**
 * Input Validation Utilities for Binary Tree
 */

/**
 * Parses tree input string into array of values
 * @param input - String with space or comma separated values
 * @returns Array of parsed values (1-indexed, index 0 is unused)
 */
export function parseTreeInput(input: string): (number | null)[] {
    const values: (number | null)[] = [null]; // Index 0 unused

    if (!input.trim()) {
        return values;
    }

    // Split by spaces or commas, filter empty strings
    const tokens = input.split(/[\s,]+/).filter(t => t.length > 0);

    // Parse each token
    for (const token of tokens) {
        const parsed = validateNodeInput(token);
        if (parsed === 'error') {
            values.push(null); // Treat errors as null
        } else {
            values.push(parsed);
        }
    }

    return values;
}

/**
 * Validates a single node input value
 * @param value - String input from user
 * @returns Parsed integer, null, or 'error'
 */
export function validateNodeInput(value: string): number | null | 'error' {
    const trimmed = value.trim();

    // Empty string or "NULL" (case-insensitive) → null
    if (trimmed === '' || trimmed.toUpperCase() === 'NULL') {
        return null;
    }

    // Try to parse as integer
    const num = parseInt(trimmed, 10);

    // Check if valid integer
    if (isNaN(num) || !isFinite(num)) {
        return 'error';
    }

    return num;
}

/**
 * Validates the entire tree structure
 * @param values - Array of parsed node values (1-indexed)
 * @returns Array of error messages (empty if valid)
 */
export function validateTree(values: (number | null)[]): string[] {
    const errors: string[] = [];

    // Check if root exists
    if (!values[1] && values[1] !== 0) {
        errors.push("Root node (Level 1) cannot be NULL");
    }

    // Check if entire tree is NULL (excluding index 0)
    const hasNonNullNode = values.slice(1).some(v => v !== null);
    if (!hasNonNullNode) {
        errors.push("Tree cannot be entirely NULL");
    }

    return errors;
}

/**
 * Propagates NULL values down the tree
 * If a node is NULL, its children must also be NULL
 * @param values - Array of node values to modify in place
 */
export function propagateNulls(values: (number | null)[]): void {
    for (let i = 1; i <= 15; i++) { // Only check first 15 (parents of level 5)
        if (values[i] === null) {
            const leftChild = i * 2;
            const rightChild = i * 2 + 1;

            if (leftChild <= 31) values[leftChild] = null;
            if (rightChild <= 31) values[rightChild] = null;
        }
    }
}

/**
 * Checks if a node has a left child
 */
export function hasLeftChild(values: (number | null)[], index: number): boolean {
    const leftIndex = index * 2;
    return leftIndex <= 31 && values[leftIndex] !== null;
}

/**
 * Checks if a node has a right child
 */
export function hasRightChild(values: (number | null)[], index: number): boolean {
    const rightIndex = index * 2 + 1;
    return rightIndex <= 31 && values[rightIndex] !== null;
}

/**
 * Checks if a node is a leaf (no children)
 */
export function isLeaf(values: (number | null)[], index: number): boolean {
    return !hasLeftChild(values, index) && !hasRightChild(values, index);
}
