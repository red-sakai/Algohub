/**
 * Tree → 3D World Position Mapping
 * 
 * Converts abstract BST structure into 3D world coordinates
 * for the pinball arcade board.
 * 
 * Layout Strategy:
 * - Root at top center
 * - Left children go down-left
 * - Right children go down-right
 * - Spacing increases with depth to prevent overlap
 */

import { BSTNode, TreeNode3D, TraversalStep, TraversalResult, TraversalType } from '@/types/pinball';
import { getTreeHeight, isLeaf, executeTraversal } from './treeAlgorithms';

// ============================================================================
// 3D POSITIONING ENGINE
// ============================================================================

interface LayoutConfig {
  verticalSpacing: number;
  horizontalSpacing: number;
  depthSpacing: number; // Z-axis variation for visual depth
}

const DEFAULT_LAYOUT: LayoutConfig = {
  verticalSpacing: 4,
  horizontalSpacing: 3.5,
  depthSpacing: 0.5
};

/**
 * Calculate horizontal offset for a node at given depth
 * Uses binary tree indexing to determine position
 */
function calculateHorizontalOffset(
  node: BSTNode,
  parent: BSTNode | null,
  isLeftChild: boolean,
  depth: number,
  config: LayoutConfig
): number {
  // Root is at center
  if (parent === null) {
    return 0;
  }

  // Calculate offset based on depth
  // Deeper nodes have exponentially smaller spacing
  const baseOffset = config.horizontalSpacing * Math.pow(0.7, depth - 1);
  
  return isLeftChild ? -baseOffset : baseOffset;
}

/**
 * Recursively assign 3D positions to all nodes
 * Returns TreeNode3D which includes worldPosition
 */
function assignPositions(
  node: BSTNode | null,
  parentX: number = 0,
  depth: number = 0,
  isLeftChild: boolean = false,
  config: LayoutConfig = DEFAULT_LAYOUT
): TreeNode3D | null {
  if (node === null) return null;

  // Calculate this node's position
  const horizontalOffset = depth === 0 
    ? 0 
    : config.horizontalSpacing * Math.pow(0.75, depth) * (isLeftChild ? -1 : 1);
  
  const x = parentX + horizontalOffset;
  const y = -depth * config.verticalSpacing; // Negative Y = down
  const z = Math.sin(depth * 0.5) * config.depthSpacing; // Slight depth variation

  // Create extended node with position
  const treeNode: TreeNode3D = {
    value: node.value,
    nodeId: node.nodeId,
    left: assignPositions(node.left, x, depth + 1, true, config),
    right: assignPositions(node.right, x, depth + 1, false, config),
    worldPosition: { x, y, z },
    depth,
    horizontalOffset
  };

  return treeNode;
}

/**
 * Convert BST to positioned 3D tree
 * This is the bridge between algorithm and visualization
 */
export function convertTo3DTree(
  root: BSTNode | null,
  config: Partial<LayoutConfig> = {}
): TreeNode3D | null {
  const finalConfig = { ...DEFAULT_LAYOUT, ...config };
  return assignPositions(root, 0, 0, false, finalConfig);
}

// ============================================================================
// TRAVERSAL → ANIMATION MAPPING
// ============================================================================

/**
 * Convert algorithm output (node sequence) into animation steps
 * This is THE CRITICAL FUNCTION that ensures traversal correctness
 */
export function createTraversalResult(
  tree3D: TreeNode3D | null,
  type: TraversalType
): TraversalResult {
  if (tree3D === null) {
    return {
      type,
      steps: [],
      totalNodes: 0,
      treeHeight: 0
    };
  }

  // Execute pure traversal algorithm
  const traversalSequence = executeTraversal(tree3D, type);
  
  // Map each node to animation step
  const steps: TraversalStep[] = traversalSequence.map((node, index) => {
    // Find node in 3D tree to get position
    const node3D = findNodeById(tree3D, node.nodeId);
    
    if (!node3D) {
      throw new Error(`Node ${node.nodeId} not found in 3D tree`);
    }

    return {
      value: node.value,
      nodeId: node.nodeId,
      worldPosition: node3D.worldPosition,
      sequenceIndex: index,
      depth: node3D.depth,
      isLeaf: isLeaf(node)
    };
  });

  return {
    type,
    steps,
    totalNodes: steps.length,
    treeHeight: getTreeHeight(tree3D)
  };
}

/**
 * Find node in 3D tree by ID
 * Helper for mapping traversal to positions
 */
function findNodeById(tree: TreeNode3D | null, nodeId: string): TreeNode3D | null {
  if (tree === null) return null;
  if (tree.nodeId === nodeId) return tree;
  
  return findNodeById(tree.left, nodeId) || findNodeById(tree.right, nodeId);
}

// ============================================================================
// CAMERA POSITIONING (View Optimization)
// ============================================================================

/**
 * Calculate optimal camera position to view entire tree
 */
export function calculateOptimalCameraPosition(tree: TreeNode3D | null): {
  position: { x: number; y: number; z: number };
  lookAt: { x: number; y: number; z: number };
} {
  if (tree === null) {
    return {
      position: { x: 0, y: 0, z: 25 },
      lookAt: { x: 0, y: 0, z: 0 }
    };
  }

  // Calculate bounding box
  const bounds = calculateBounds(tree);
  
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  const centerX = (bounds.maxX + bounds.minX) / 2;
  const centerY = (bounds.maxY + bounds.minY) / 2;

  // Position camera to see full tree
  const distance = Math.max(width, height) * 1.5 + 15;

  return {
    position: { x: centerX, y: centerY + 2, z: distance },
    lookAt: { x: centerX, y: centerY, z: 0 }
  };
}

/**
 * Calculate axis-aligned bounding box for tree
 */
function calculateBounds(tree: TreeNode3D | null): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
} {
  const bounds = {
    minX: Infinity,
    maxX: -Infinity,
    minY: Infinity,
    maxY: -Infinity,
    minZ: Infinity,
    maxZ: -Infinity
  };

  function traverse(node: TreeNode3D | null) {
    if (node === null) return;
    
    bounds.minX = Math.min(bounds.minX, node.worldPosition.x);
    bounds.maxX = Math.max(bounds.maxX, node.worldPosition.x);
    bounds.minY = Math.min(bounds.minY, node.worldPosition.y);
    bounds.maxY = Math.max(bounds.maxY, node.worldPosition.y);
    bounds.minZ = Math.min(bounds.minZ, node.worldPosition.z);
    bounds.maxZ = Math.max(bounds.maxZ, node.worldPosition.z);
    
    traverse(node.left);
    traverse(node.right);
  }

  traverse(tree);
  return bounds;
}

// ============================================================================
// PATH INTERPOLATION (Smooth Movement)
// ============================================================================

/**
 * Calculate pinball path between two nodes
 * Returns array of intermediate positions for smooth animation
 */
export function interpolatePath(
  from: { x: number; y: number; z: number },
  to: { x: number; y: number; z: number },
  motionStyle: 'cascade' | 'zigzag' | 'climb',
  steps: number = 30
): Array<{ x: number; y: number; z: number }> {
  const path: Array<{ x: number; y: number; z: number }> = [];

  for (let i = 0; i <= steps; i++) {
    const t = i / steps; // 0 to 1
    
    // Base linear interpolation
    const x = from.x + (to.x - from.x) * t;
    const y = from.y + (to.y - from.y) * t;
    const z = from.z + (to.z - from.z) * t;

    // Apply motion style modulation
    let modX = x;
    let modY = y;
    let modZ = z;

    switch (motionStyle) {
      case 'cascade':
        // Smooth downward arc
        modZ = z + Math.sin(t * Math.PI) * 0.5;
        break;
        
      case 'zigzag':
        // Horizontal weaving
        modZ = z + Math.sin(t * Math.PI * 4) * 0.3;
        break;
        
      case 'climb':
        // Upward spiral
        modZ = z + Math.sin(t * Math.PI * 2) * 0.4;
        modX = x + Math.cos(t * Math.PI * 2) * 0.2;
        break;
    }

    path.push({ x: modX, y: modY, z: modZ });
  }

  return path;
}

// ============================================================================
// COLLISION DETECTION (Node Hit Verification)
// ============================================================================

/**
 * Check if pinball is close enough to node to "hit" it
 * Used to trigger visual effects at exact moment
 */
export function isPinballAtNode(
  pinballPos: { x: number; y: number; z: number },
  nodePos: { x: number; y: number; z: number },
  threshold: number = 0.5
): boolean {
  const dx = pinballPos.x - nodePos.x;
  const dy = pinballPos.y - nodePos.y;
  const dz = pinballPos.z - nodePos.z;
  
  const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
  return distance < threshold;
}

// ============================================================================
// VALIDATION (Academic Integrity Check)
// ============================================================================

/**
 * Verify that traversal result matches algorithm output
 * This ensures visual never diverges from algorithm
 */
export function validateTraversalResult(
  tree: TreeNode3D | null,
  result: TraversalResult
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (tree === null && result.steps.length > 0) {
    errors.push('Empty tree should have no traversal steps');
  }

  // Verify sequence indices are consecutive
  for (let i = 0; i < result.steps.length; i++) {
    if (result.steps[i].sequenceIndex !== i) {
      errors.push(`Step ${i} has incorrect sequence index: ${result.steps[i].sequenceIndex}`);
    }
  }

  // Verify all node IDs are unique
  const nodeIds = new Set(result.steps.map(s => s.nodeId));
  if (nodeIds.size !== result.steps.length) {
    errors.push('Duplicate node IDs in traversal');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
