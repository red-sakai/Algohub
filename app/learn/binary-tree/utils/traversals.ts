/**
 * Binary Tree Traversal Utilities
 * Implements preorder, inorder, and postorder traversals for a binary tree
 * represented as a 1-indexed array (root at index 1)
 */

/**
 * Preorder Traversal: Root → Left → Right
 * @param values - Array of node values (1-indexed, values[0] is unused)
 * @param index - Current node index (default: 1 for root)
 * @returns Array of values in preorder sequence
 */
export function preorderTraversal(
    values: (number | null)[],
    index = 1
): number[] {
    // Base case: out of bounds or NULL node
    if (index > 31 || index >= values.length || values[index] === null) {
        return [];
    }

    return [
        values[index] as number,
        ...preorderTraversal(values, index * 2),       // Left child
        ...preorderTraversal(values, index * 2 + 1),   // Right child
    ];
}

/**
 * Inorder Traversal: Left → Root → Right
 * @param values - Array of node values (1-indexed)
 * @param index - Current node index (default: 1 for root)
 * @returns Array of values in inorder sequence
 */
export function inorderTraversal(
    values: (number | null)[],
    index = 1
): number[] {
    if (index > 31 || index >= values.length || values[index] === null) {
        return [];
    }

    return [
        ...inorderTraversal(values, index * 2),        // Left child
        values[index] as number,
        ...inorderTraversal(values, index * 2 + 1),    // Right child
    ];
}

/**
 * Postorder Traversal: Left → Right → Root
 * @param values - Array of node values (1-indexed)
 * @param index - Current node index (default: 1 for root)
 * @returns Array of values in postorder sequence
 */
export function postorderTraversal(
    values: (number | null)[],
    index = 1
): number[] {
    if (index > 31 || index >= values.length || values[index] === null) {
        return [];
    }

    return [
        ...postorderTraversal(values, index * 2),      // Left child
        ...postorderTraversal(values, index * 2 + 1),  // Right child
        values[index] as number,
    ];
}

/**
 * Get the sign of a node value
 * @param value - The node value
 * @returns Sign indicator: '+', '-', '0', or 'NULL'
 */
export function getSign(value: number | null): '+' | '-' | '0' | 'NULL' {
    if (value === null) return 'NULL';
    if (value > 0) return '+';
    if (value < 0) return '-';
    return '0';
}
