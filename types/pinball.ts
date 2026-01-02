/**
 * Binary Tree Pinball Game - Type Definitions
 * Academic-grade type system for tree algorithms and 3D visualization
 */

// ============================================================================
// CORE TREE STRUCTURE (Algorithm Layer)
// ============================================================================

/**
 * Binary Search Tree Node
 * Pure data structure - no rendering logic
 */
export interface BSTNode {
  value: number;
  left: BSTNode | null;
  right: BSTNode | null;
  nodeId: string; // Unique identifier for tracking
}

/**
 * Extended node with 3D world position
 * Links algorithm to visualization
 */
export interface TreeNode3D extends Omit<BSTNode, 'left' | 'right'> {
  worldPosition: { x: number; y: number; z: number };
  depth: number; // Distance from root (for layout)
  horizontalOffset: number; // Position in level
  left: TreeNode3D | null;
  right: TreeNode3D | null;
}

// ============================================================================
// TRAVERSAL SYSTEM (Algorithm Output)
// ============================================================================

export type TraversalType = 'preorder' | 'inorder' | 'postorder';

/**
 * Single step in traversal sequence
 * This is the single source of truth for animation
 */
export interface TraversalStep {
  value: number;
  nodeId: string;
  worldPosition: { x: number; y: number; z: number };
  sequenceIndex: number; // Order in traversal (0, 1, 2, ...)
  depth: number;
  isLeaf: boolean;
}

/**
 * Complete traversal result
 * Algorithm output that drives all animation
 */
export interface TraversalResult {
  type: TraversalType;
  steps: TraversalStep[];
  totalNodes: number;
  treeHeight: number;
}

// ============================================================================
// PINBALL ANIMATION (Visualization Layer)
// ============================================================================

export interface PinballConfig {
  entryPoint: { x: number; y: number; z: number };
  launcherPosition: { x: number; y: number; z: number }; // Where ball starts
  motionStyle: 'cascade' | 'zigzag' | 'climb';
  speed: number; // Units per second
  accentColor: string;
}

export interface PinballState {
  currentPosition: { x: number; y: number; z: number };
  targetNodeIndex: number; // Index into TraversalResult.steps
  isMoving: boolean;
  progress: number; // 0 to 1 between nodes
  launcherCharge: number; // 0 to 1, how charged the launcher is
  isLaunched: boolean; // Has the ball been launched yet
  isLaunching: boolean; // Currently in launch animation
}

// ============================================================================
// VISUAL EFFECTS (Enhancement Layer)
// ============================================================================

export interface NodeVisualState {
  nodeId: string;
  isActive: boolean; // Currently being visited
  wasVisited: boolean;
  visitOrder: number | null;
  glowIntensity: number; // 0 to 1
}

export interface ParticleEmission {
  position: { x: number; y: number; z: number };
  color: string;
  intensity: number;
  timestamp: number;
}

// ============================================================================
// GAME STATE (Control Layer)
// ============================================================================

export type GamePhase = 
  | 'input' // User entering tree values
  | 'building' // Animating tree construction
  | 'intro' // Cabinet intro cinematic
  | 'select' // Selecting traversal type
  | 'ready' // Tree built, launcher ready
  | 'traversing' // Pinball animation in progress
  | 'paused' // Step-through mode
  | 'complete'; // Traversal finished

export interface GameState {
  phase: GamePhase;
  tree: TreeNode3D | null;
  currentTraversal: TraversalResult | null;
  pinball: PinballState | null;
  visualStates: Map<string, NodeVisualState>;
  inputValues: number[];
  selectedTraversal: TraversalType;
}

// ============================================================================
// EDUCATIONAL OUTPUT
// ============================================================================

export interface AlgorithmJustification {
  traversalType: TraversalType;
  description: string;
  expectedOrder: number[];
  actualOrder: number[];
  isCorrect: boolean;
  explanation: string;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface PinballGameConfig {
  // Tree Layout
  verticalSpacing: number;
  horizontalSpacing: number;
  baseNodeSize: number;

  // Animation
  basePinballSpeed: number;
  pauseBetweenNodes: number; // ms
  
  // Visual
  cameraConfig: {
    fov: number;
    near: number;
    far: number;
    initialPosition: { x: number; y: number; z: number };
  };

  // Arcade Feel
  enableParticles: boolean;
  enableGlow: boolean;
  enableCameraShake: boolean;
  shakeMagnitude: number;
}

export const DEFAULT_CONFIG: PinballGameConfig = {
  verticalSpacing: 4,
  horizontalSpacing: 3,
  baseNodeSize: 0.8,
  basePinballSpeed: 5,
  pauseBetweenNodes: 300,
  cameraConfig: {
    fov: 60,
    near: 0.1,
    far: 1000,
    initialPosition: { x: 0, y: 0, z: 25 }
  },
  enableParticles: true,
  enableGlow: true,
  enableCameraShake: true,
  shakeMagnitude: 0.1
};

// ============================================================================
// TRAVERSAL METADATA (Per-Type Behavior)
// ============================================================================

export const TRAVERSAL_CONFIGS: Record<TraversalType, PinballConfig> = {
  preorder: {
    launcherPosition: { x: 10, y: -8, z: 0 }, // RIGHT SIDE launcher lane
    entryPoint: { x: 0, y: 8, z: 0 }, // Top of tree (root entry)
    motionStyle: 'cascade',
    speed: 6,
    accentColor: '#ff4444' // Red - aggressive
  },
  inorder: {
    launcherPosition: { x: 10, y: -8, z: 0 }, // RIGHT SIDE launcher lane
    entryPoint: { x: 0, y: 8, z: 0 }, // Top of tree (root entry)
    motionStyle: 'zigzag',
    speed: 4,
    accentColor: '#44ff44' // Green - systematic
  },
  postorder: {
    launcherPosition: { x: 10, y: -8, z: 0 }, // RIGHT SIDE launcher lane
    entryPoint: { x: 0, y: 8, z: 0 }, // Top of tree (root entry)
    motionStyle: 'climb',
    speed: 5,
    accentColor: '#4444ff' // Blue - building up
  }
};
