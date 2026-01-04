/**
 * Binary Search Tree - Pure Algorithm Implementation
 * 
 * ACADEMIC REQUIREMENTS:
 * - All algorithms are deterministic
 * - Traversal order is mathematically correct
 * - No rendering logic in this file
 * - All functions are pure (no side effects)
 * 
 * This file is the single source of truth for tree operations.
 */

import { BSTNode, TreeNode3D, TraversalStep, TraversalResult, TraversalType } from '@/types/pinball';

// ============================================================================
// CORE BST OPERATIONS (Algorithm Layer)
// ============================================================================

/**
 * Insert a value into Binary Search Tree
 * Time Complexity: O(h) where h is height
 * Space Complexity: O(h) for recursion stack
 * 
 * BST Property: left.value < node.value < right.value
 */
export function insertBST(root: BSTNode | null, value: number): BSTNode {
  // Base case: create new node
  if (root === null) {
    return {
      value,
      left: null,
      right: null,
      nodeId: `node-${value}-${Date.now()}-${Math.random()}`
    };
  }

  // Duplicate handling: skip insertion
  if (value === root.value) {
    return root;
  }

  // Recursive insertion
  if (value < root.value) {
    root.left = insertBST(root.left, value);
  } else {
    root.right = insertBST(root.right, value);
  }

  return root;
}

/**
 * Build complete BST from array of values
 * Returns root of constructed tree
 */
export function buildBST(values: number[]): BSTNode | null {
  let root: BSTNode | null = null;
  
  for (const value of values) {
    root = insertBST(root, value);
  }
  
  return root;
}

// ============================================================================
// TRAVERSAL ALGORITHMS (The Core Teaching Content)
// ============================================================================

/**
 * PREORDER TRAVERSAL: Root → Left → Right
 * 
 * Use cases:
 * - Tree copying
 * - Prefix expression evaluation
 * - Creating tree from serialization
 * 
 * Mnemonic: "Visit before exploring"
 */
function preorderRecursive(node: BSTNode | null, result: BSTNode[]): void {
  if (node === null) return;
  
  // 1. Visit root
  result.push(node);
  
  // 2. Traverse left subtree
  preorderRecursive(node.left, result);
  
  // 3. Traverse right subtree
  preorderRecursive(node.right, result);
}

export function preorder(root: BSTNode | null): BSTNode[] {
  const result: BSTNode[] = [];
  preorderRecursive(root, result);
  return result;
}

/**
 * INORDER TRAVERSAL: Left → Root → Right
 * 
 * Use cases:
 * - Get sorted sequence from BST
 * - Infix expression evaluation
 * - Validation (BST property checking)
 * 
 * Mnemonic: "Visit in between"
 * 
 * CRITICAL: For BST, this ALWAYS produces sorted order
 */
function inorderRecursive(node: BSTNode | null, result: BSTNode[]): void {
  if (node === null) return;
  
  // 1. Traverse left subtree
  inorderRecursive(node.left, result);
  
  // 2. Visit root
  result.push(node);
  
  // 3. Traverse right subtree
  inorderRecursive(node.right, result);
}

export function inorder(root: BSTNode | null): BSTNode[] {
  const result: BSTNode[] = [];
  inorderRecursive(root, result);
  return result;
}

/**
 * POSTORDER TRAVERSAL: Left → Right → Root
 * 
 * Use cases:
 * - Tree deletion (delete children before parent)
 * - Postfix expression evaluation
 * - Calculate tree properties bottom-up
 * 
 * Mnemonic: "Visit after exploring"
 */
function postorderRecursive(node: BSTNode | null, result: BSTNode[]): void {
  if (node === null) return;
  
  // 1. Traverse left subtree
  postorderRecursive(node.left, result);
  
  // 2. Traverse right subtree
  postorderRecursive(node.right, result);
  
  // 3. Visit root
  result.push(node);
}

export function postorder(root: BSTNode | null): BSTNode[] {
  const result: BSTNode[] = [];
  postorderRecursive(root, result);
  return result;
}

/**
 * Execute specified traversal type
 * Returns array of nodes in traversal order
 */
export function executeTraversal(root: BSTNode | null, type: TraversalType): BSTNode[] {
  switch (type) {
    case 'preorder':
      return preorder(root);
    case 'inorder':
      return inorder(root);
    case 'postorder':
      return postorder(root);
    default:
      throw new Error(`Unknown traversal type: ${type}`);
  }
}

// ============================================================================
// TREE PROPERTIES (Utility Functions)
// ============================================================================

/**
 * Calculate tree height (longest path from root to leaf)
 */
export function getTreeHeight(node: BSTNode | null): number {
  if (node === null) return 0;
  
  const leftHeight = getTreeHeight(node.left);
  const rightHeight = getTreeHeight(node.right);
  
  return 1 + Math.max(leftHeight, rightHeight);
}

/**
 * Count total nodes in tree
 */
export function countNodes(node: BSTNode | null): number {
  if (node === null) return 0;
  return 1 + countNodes(node.left) + countNodes(node.right);
}

/**
 * Check if node is a leaf (no children)
 */
export function isLeaf(node: BSTNode): boolean {
  return node.left === null && node.right === null;
}

/**
 * Validate BST property
 * For testing/debugging purposes
 */
export function validateBST(
  node: BSTNode | null,
  min: number = -Infinity,
  max: number = Infinity
): boolean {
  if (node === null) return true;
  
  // Check current node satisfies constraints
  if (node.value <= min || node.value >= max) {
    return false;
  }
  
  // Recursively validate subtrees
  return (
    validateBST(node.left, min, node.value) &&
    validateBST(node.right, node.value, max)
  );
}

// ============================================================================
// ALGORITHM VERIFICATION (Academic Justification)
// ============================================================================

/**
 * Verify inorder traversal produces sorted sequence
 * This is the fundamental BST property
 */
export function verifyInorderSorted(traversal: BSTNode[]): boolean {
  for (let i = 1; i < traversal.length; i++) {
    if (traversal[i - 1].value >= traversal[i].value) {
      return false;
    }
  }
  return true;
}

/**
 * Generate human-readable explanation of traversal
 */
export function explainTraversal(type: TraversalType): string {
  const explanations = {
    preorder: `Preorder (Root → Left → Right):
• Visit the current node FIRST
• Then recursively visit left subtree
• Finally recursively visit right subtree
• Think: "Check the root before exploring children"
• Visual: Ball cascades down from top, hitting parent before children`,

    inorder: `Inorder (Left → Root → Right):
• Recursively visit left subtree FIRST
• Then visit the current node
• Finally recursively visit right subtree  
• Think: "Visit in ascending order" (for BST)
• Visual: Ball sweeps left-to-right in sorted sequence`,

    postorder: `Postorder (Left → Right → Root):
• Recursively visit left subtree FIRST
• Then recursively visit right subtree
• Finally visit the current node
• Think: "Children before parent"
• Visual: Ball climbs from bottom-left, reaching root last`
  };

  return explanations[type];
}

/**
 * Generate step-by-step trace for educational purposes
 */
export function traceTraversal(root: BSTNode | null, type: TraversalType): string[] {
  const trace: string[] = [];
  
  function tracePreorder(node: BSTNode | null, depth: number = 0): void {
    if (node === null) return;
    const indent = '  '.repeat(depth);
    trace.push(`${indent}Visit ${node.value}`);
    trace.push(`${indent}Go left from ${node.value}`);
    tracePreorder(node.left, depth + 1);
    trace.push(`${indent}Go right from ${node.value}`);
    tracePreorder(node.right, depth + 1);
  }
  
  function traceInorder(node: BSTNode | null, depth: number = 0): void {
    if (node === null) return;
    const indent = '  '.repeat(depth);
    trace.push(`${indent}Go left from ${node.value}`);
    traceInorder(node.left, depth + 1);
    trace.push(`${indent}Visit ${node.value}`);
    trace.push(`${indent}Go right from ${node.value}`);
    traceInorder(node.right, depth + 1);
  }
  
  function tracePostorder(node: BSTNode | null, depth: number = 0): void {
    if (node === null) return;
    const indent = '  '.repeat(depth);
    trace.push(`${indent}Go left from ${node.value}`);
    tracePostorder(node.left, depth + 1);
    trace.push(`${indent}Go right from ${node.value}`);
    tracePostorder(node.right, depth + 1);
    trace.push(`${indent}Visit ${node.value}`);
  }
  
  switch (type) {
    case 'preorder':
      tracePreorder(root);
      break;
    case 'inorder':
      traceInorder(root);
      break;
    case 'postorder':
      tracePostorder(root);
      break;
  }
  
  return trace;
}
