import type { FloorTile } from "./types";

/**
 * Shared utility for extracting floor tile data from map layers
 * Eliminates duplicate code between enemyController and treeTraversalController
 */
export class MapDataUtils {
  /**
   * Extract floor tiles from nodes layer (id "33")
   * Used for tree building and pathfinding
   */
  static extractNodesFloorTiles(
    mapData: {
      tileSize?: number;
      layers?: Array<{
        name: string;
        tiles?: Array<{ x: number; y: number; id: string }>;
      }>;
    } | null,
    mapScale: number
  ): { tiles: FloorTile[]; tileSize: number } {
    const tileSize = mapData?.tileSize || 64;
    const tiles: FloorTile[] = [];

    if (!mapData || !mapData.layers) {
      return { tiles, tileSize };
    }

    const nodesLayer = mapData.layers.find(
      (layer: {
        name: string;
        tiles?: Array<{ x: number; y: number; id: string }>;
      }) => layer.name === "nodes"
    );

    if (nodesLayer?.tiles) {
      const nodeFloorTiles = nodesLayer.tiles.filter(
        (tile: { x: number; y: number; id: string }) => tile.id === "33"
      );

      tiles.push(
        ...nodeFloorTiles.map((tile: { x: number; y: number; id: string }) => ({
          tileX: tile.x,
          tileY: tile.y,
          worldX: tile.x * tileSize * mapScale + (tileSize * mapScale) / 2,
          worldY: tile.y * tileSize * mapScale + (tileSize * mapScale) / 2,
        }))
      );
    }

    return { tiles, tileSize };
  }

  /**
   * Extract floor tiles from floors layer
   * Used for general floor pathfinding
   */
  static extractFloorsLayerTiles(
    mapData: {
      tileSize?: number;
      layers?: Array<{
        name: string;
        tiles?: Array<{ x: number; y: number; id: string }>;
      }>;
    } | null,
    mapScale: number
  ): { tiles: FloorTile[]; tileSize: number } {
    const tileSize = mapData?.tileSize || 64;
    const tiles: FloorTile[] = [];

    if (!mapData || !mapData.layers) {
      return { tiles, tileSize };
    }

    const floorsLayer = mapData.layers.find(
      (layer: {
        name: string;
        tiles?: Array<{ x: number; y: number; id: string }>;
      }) => layer.name === "floors"
    );

    if (floorsLayer?.tiles && floorsLayer.tiles.length > 0) {
      tiles.push(
        ...floorsLayer.tiles.map(
          (tile: { x: number; y: number; id: string }) => ({
            tileX: tile.x,
            tileY: tile.y,
            worldX: tile.x * tileSize * mapScale + (tileSize * mapScale) / 2,
            worldY: tile.y * tileSize * mapScale + (tileSize * mapScale) / 2,
          })
        )
      );
    }

    return { tiles, tileSize };
  }
}
