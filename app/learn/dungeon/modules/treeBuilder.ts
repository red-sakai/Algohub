import type { TreeNode, FloorTile } from "./types";
import { Pathfinding } from "./pathfinding";

export class TreeBuilder {
  /**
   * Build binary tree structure based on spatial position
   * Uses floor pathfinding to determine parent-child relationships
   */
  static buildBinaryTreeStructure(
    nodes: Array<{ x: number; y: number; level: number; index: number }>,
    floorTiles: FloorTile[],
    tileSize: number,
    mapScale: number
  ): TreeNode | null {
    if (nodes.length === 0) return null;

    // Root should be the topmost node (smallest Y), then leftmost if tie
    const sortedNodes = [...nodes].sort((a, b) => {
      if (a.y !== b.y) return a.y - b.y;
      return a.x - b.x;
    });

    const root = sortedNodes[0];
    const remainingNodes = sortedNodes.slice(1);

    console.log(
      `Building tree: Root is node ${root.index} at (${root.x.toFixed(
        0
      )}, ${root.y.toFixed(0)})`
    );

    const leftSubtree: Array<{
      x: number;
      y: number;
      level: number;
      index: number;
    }> = [];
    const rightSubtree: Array<{
      x: number;
      y: number;
      level: number;
      index: number;
    }> = [];

    const xThreshold = tileSize * mapScale * 0.3;

    for (const node of remainingNodes) {
      const path = Pathfinding.findPathThroughFloors(
        root.x,
        root.y,
        node.x,
        node.y,
        floorTiles,
        tileSize,
        mapScale
      );

      if (path && path.length > 0) {
        const dx = node.x - root.x;
        const dy = node.y - root.y;

        if (dx < -xThreshold) {
          leftSubtree.push(node);
          console.log(
            `  Node ${node.index} (x:${node.x.toFixed(
              0
            )}) -> LEFT subtree (root x:${root.x.toFixed(0)}, dx:${dx.toFixed(
              1
            )})`
          );
        } else if (dx > xThreshold) {
          rightSubtree.push(node);
          console.log(
            `  Node ${node.index} (x:${node.x.toFixed(
              0
            )}) -> RIGHT subtree (root x:${root.x.toFixed(0)}, dx:${dx.toFixed(
              1
            )})`
          );
        } else {
          // Approximately vertically aligned
          if (path.length > 1) {
            const firstStepDx = path[1].x - path[0].x;
            if (Math.abs(firstStepDx) > xThreshold) {
              if (firstStepDx < 0) {
                leftSubtree.push(node);
                console.log(
                  `  Node ${node.index} (same X, path left) -> LEFT subtree`
                );
              } else {
                rightSubtree.push(node);
                console.log(
                  `  Node ${node.index} (same X, path right) -> RIGHT subtree`
                );
              }
            } else {
              if (dy < 0) {
                leftSubtree.push(node);
                console.log(
                  `  Node ${node.index} (same X, above root) -> LEFT subtree`
                );
              } else {
                rightSubtree.push(node);
                console.log(
                  `  Node ${node.index} (same X, below root) -> RIGHT subtree`
                );
              }
            }
          } else {
            if (dy < 0) {
              leftSubtree.push(node);
              console.log(
                `  Node ${node.index} (same X, above root, no path) -> LEFT subtree`
              );
            } else {
              rightSubtree.push(node);
              console.log(
                `  Node ${node.index} (same X, below root, no path) -> RIGHT subtree`
              );
            }
          }
        }
      } else {
        // No floor path found - use spatial position as fallback
        console.warn(
          `No floor path from root (node ${root.index}) to node ${node.index}, using spatial position fallback`
        );
        if (node.x < root.x) {
          leftSubtree.push(node);
        } else if (node.x > root.x) {
          rightSubtree.push(node);
        } else {
          if (node.y < root.y) {
            leftSubtree.push(node);
          } else {
            rightSubtree.push(node);
          }
        }
      }
    }

    // Sort subtrees by spatial position
    leftSubtree.sort((a, b) => {
      if (a.y !== b.y) return a.y - b.y;
      return a.x - b.x;
    });
    rightSubtree.sort((a, b) => {
      if (a.y !== b.y) return a.y - b.y;
      return a.x - b.x;
    });

    console.log(
      `  Left subtree: ${leftSubtree.length} nodes (will get levels 2-${
        1 + leftSubtree.length
      })`
    );
    console.log(
      `  Right subtree: ${rightSubtree.length} nodes (will get levels ${
        2 + leftSubtree.length
      }-${1 + leftSubtree.length + rightSubtree.length})`
    );

    // Recursively build subtrees - each subtree can have both left and right children
    return {
      node: root,
      left:
        leftSubtree.length > 0
          ? TreeBuilder.buildBinaryTreeStructure(
              leftSubtree,
              floorTiles,
              tileSize,
              mapScale
            )
          : null,
      right:
        rightSubtree.length > 0
          ? TreeBuilder.buildBinaryTreeStructure(
              rightSubtree,
              floorTiles,
              tileSize,
              mapScale
            )
          : null,
    };
  }

  /**
   * Assign traversal order numbers to tree nodes (in-order: left, root, right)
   */
  static assignTraversalOrder(
    tree: TreeNode | null,
    orderCounter: { value: number }
  ): void {
    if (!tree) return;

    if (tree.left) {
      TreeBuilder.assignTraversalOrder(tree.left, orderCounter);
    }

    tree.traversalOrder = orderCounter.value++;

    if (tree.right) {
      TreeBuilder.assignTraversalOrder(tree.right, orderCounter);
    }
  }
}
