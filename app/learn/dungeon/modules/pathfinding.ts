import type { FloorTile } from "./types";

export class Pathfinding {
  /**
   * Find path through floor tiles between two points using A* pathfinding
   */
  static findPathThroughFloors(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    floorTiles: FloorTile[],
    tileSize: number,
    mapScale: number
  ): Array<{ x: number; y: number }> | null {
    if (floorTiles.length === 0) return null;

    const maxSearchDistance = tileSize * mapScale * 1.5;
    let startTile: FloorTile | null = null;
    let endTile: FloorTile | null = null;
    let startDist = Infinity;
    let endDist = Infinity;

    // Find closest floor tiles to start and end
    for (const floor of floorTiles) {
      const distToStart = Math.sqrt(
        Math.pow(startX - floor.worldX, 2) + Math.pow(startY - floor.worldY, 2)
      );
      const distToEnd = Math.sqrt(
        Math.pow(endX - floor.worldX, 2) + Math.pow(endY - floor.worldY, 2)
      );

      if (distToStart < startDist && distToStart <= maxSearchDistance) {
        startDist = distToStart;
        startTile = floor;
      }
      if (distToEnd < endDist && distToEnd <= maxSearchDistance) {
        endDist = distToEnd;
        endTile = floor;
      }
    }

    // If no tiles found within tolerance, try again with unlimited distance
    if (!startTile || !endTile) {
      for (const floor of floorTiles) {
        const distToStart = Math.sqrt(
          Math.pow(startX - floor.worldX, 2) +
            Math.pow(startY - floor.worldY, 2)
        );
        const distToEnd = Math.sqrt(
          Math.pow(endX - floor.worldX, 2) + Math.pow(endY - floor.worldY, 2)
        );

        if (distToStart < startDist) {
          startDist = distToStart;
          startTile = floor;
        }
        if (distToEnd < endDist) {
          endDist = distToEnd;
          endTile = floor;
        }
      }
    }

    if (!startTile || !endTile) return null;

    const startKey = `${startTile.tileX},${startTile.tileY}`;
    const endKey = `${endTile.tileX},${endTile.tileY}`;

    if (startKey === endKey) {
      return [{ x: startX, y: startY }, { x: endX, y: endY }];
    }

    // Create a map of floor tiles for quick lookup
    const tileMap = new Map<string, FloorTile>();
    for (const tile of floorTiles) {
      const key = `${tile.tileX},${tile.tileY}`;
      tileMap.set(key, tile);
    }

    // A* pathfinding
    const openSet: Array<{
      tile: FloorTile;
      g: number;
      f: number;
      cameFrom: { tileX: number; tileY: number } | null;
    }> = [];
    const closedSet = new Set<string>();
    const gScore = new Map<string, number>();
    const fScore = new Map<string, number>();
    const cameFrom = new Map<string, { tileX: number; tileY: number } | null>();

    gScore.set(startKey, 0);
    fScore.set(
      startKey,
      Math.sqrt(
        Math.pow(startTile.worldX - endTile.worldX, 2) +
          Math.pow(startTile.worldY - endTile.worldY, 2)
      )
    );

    openSet.push({
      tile: startTile,
      g: 0,
      f: fScore.get(startKey)!,
      cameFrom: null,
    });

    while (openSet.length > 0) {
      openSet.sort((a, b) => a.f - b.f);
      const current = openSet.shift()!;
      const currentKey = `${current.tile.tileX},${current.tile.tileY}`;

      if (currentKey === endKey) {
        // Reconstruct path
        const path: Array<{ x: number; y: number }> = [];
        let pathKey: string | null = endKey;
        while (pathKey) {
          const pathTile = tileMap.get(pathKey);
          if (pathTile) {
            path.unshift({ x: pathTile.worldX, y: pathTile.worldY });
          }
          const from = cameFrom.get(pathKey);
          pathKey = from ? `${from.tileX},${from.tileY}` : null;
        }

        // Ensure path starts with actual start position and ends with actual end position
        if (path.length > 0) {
          const startDist = Math.sqrt(
            Math.pow(startX - path[0].x, 2) + Math.pow(startY - path[0].y, 2)
          );
          const endDist = Math.sqrt(
            Math.pow(endX - path[path.length - 1].x, 2) +
              Math.pow(endY - path[path.length - 1].y, 2)
          );

          if (startDist < tileSize * mapScale * 0.5) {
            path[0] = { x: startX, y: startY };
          }
          if (endDist < tileSize * mapScale * 0.5) {
            path[path.length - 1] = { x: endX, y: endY };
          }
        }

        return path;
      }

      closedSet.add(currentKey);

      // Check neighbors (adjacent tiles)
      const neighbors = [
        { dx: -1, dy: 0 },
        { dx: 1, dy: 0 },
        { dx: 0, dy: -1 },
        { dx: 0, dy: 1 },
      ];

      for (const neighbor of neighbors) {
        const neighborTileX = current.tile.tileX + neighbor.dx;
        const neighborTileY = current.tile.tileY + neighbor.dy;
        const neighborKey = `${neighborTileX},${neighborTileY}`;

        if (closedSet.has(neighborKey)) continue;

        const neighborTile = tileMap.get(neighborKey);
        if (!neighborTile) continue;

        const tentativeG =
          (gScore.get(currentKey) || Infinity) +
          Math.sqrt(
            Math.pow(current.tile.worldX - neighborTile.worldX, 2) +
              Math.pow(current.tile.worldY - neighborTile.worldY, 2)
          );

        const neighborG = gScore.get(neighborKey) || Infinity;
        if (tentativeG < neighborG) {
          cameFrom.set(neighborKey, {
            tileX: current.tile.tileX,
            tileY: current.tile.tileY,
          });
          gScore.set(neighborKey, tentativeG);
          const h = Math.sqrt(
            Math.pow(neighborTile.worldX - endTile.worldX, 2) +
              Math.pow(neighborTile.worldY - endTile.worldY, 2)
          );
          fScore.set(neighborKey, tentativeG + h);

          if (
            !openSet.some(
              (n) => `${n.tile.tileX},${n.tile.tileY}` === neighborKey
            )
          ) {
            openSet.push({
              tile: neighborTile,
              g: tentativeG,
              f: tentativeG + h,
              cameFrom: {
                tileX: current.tile.tileX,
                tileY: current.tile.tileY,
              },
            });
          }
        }
      }
    }

    return null;
  }
}
