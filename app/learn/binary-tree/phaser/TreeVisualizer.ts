/**
 * Tree Visualization Helper for Phaser
 * Draws a binary tree in a Phaser scene
 */
import * as Phaser from 'phaser';

export class TreeVisualizer {
    private scene: Phaser.Scene;
    private container: Phaser.GameObjects.Container;
    private nodeRadius: number = 20;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.container = scene.add.container(0, 0);
    }

    /**
     * Draws the tree at specified position
     */
    public drawTree(x: number, y: number, values: (number | null)[], width: number = 250, height: number = 200) {
        // Clear previous drawing
        this.container.removeAll(true);
        this.container.setPosition(x, y);

        // Node positions (level-based layout)
        const positions = this.calculatePositions(width, height);

        // Draw connections first (so they appear behind nodes)
        this.drawConnections(values, positions);

        // Draw nodes
        this.drawNodes(values, positions);

        return this.container;
    }

    private calculatePositions(width: number, height: number): { x: number; y: number }[] {
        const positions: { x: number; y: number }[] = [{ x: 0, y: 0 }]; // Index 0 unused

        // Level-by-level positioning
        const levels = [
            [1],                    // Level 1: root
            [2, 3],                // Level 2
            [4, 5, 6, 7],         // Level 3
            [8, 9, 10, 11, 12, 13, 14, 15], // Level 4
            [16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31] // Level 5
        ];

        const levelHeight = height / 5;

        levels.forEach((levelNodes, levelIdx) => {
            const y = levelIdx * levelHeight;
            const nodeCount = levelNodes.length;
            const spacing = width / (nodeCount + 1);

            levelNodes.forEach((nodeIndex, posIdx) => {
                const x = (posIdx + 1) * spacing - width / 2;
                positions[nodeIndex] = { x, y };
            });
        });

        return positions;
    }

    private drawConnections(values: (number | null)[], positions: { x: number; y: number }[]) {
        for (let i = 1; i <= 15; i++) { // Only parents (up to index 15 can have children in 5-level tree)
            if (values[i] === null) continue;

            const leftChild = i * 2;
            const rightChild = i * 2 + 1;

            // Draw line to left child
            if (leftChild <= 31 && values[leftChild] !== null) {
                const line = this.scene.add.line(
                    0, 0,
                    positions[i].x, positions[i].y,
                    positions[leftChild].x, positions[leftChild].y,
                    0x4a5568, 0.5
                );
                line.setLineWidth(2);
                this.container.add(line);
            }

            // Draw line to right child
            if (rightChild <= 31 && values[rightChild] !== null) {
                const line = this.scene.add.line(
                    0, 0,
                    positions[i].x, positions[i].y,
                    positions[rightChild].x, positions[rightChild].y,
                    0x4a5568, 0.5
                );
                line.setLineWidth(2);
                this.container.add(line);
            }
        }
    }

    private drawNodes(values: (number | null)[], positions: { x: number; y: number }[]) {
        for (let i = 1; i <= 31; i++) {
            const value = values[i];
            if (value === null) continue;

            const pos = positions[i];

            // Node circle color based on value
            let color = 0x64748b; // Neutral gray
            if (value > 0) color = 0x22c55e; // Green for positive
            if (value < 0) color = 0xef4444; // Red for negative

            // Draw circle
            const circle = this.scene.add.circle(pos.x, pos.y, this.nodeRadius, color);
            circle.setStrokeStyle(2, 0xffffff, 0.8);
            this.container.add(circle);

            // Draw value text
            const text = this.scene.add.text(pos.x, pos.y, `${value > 0 ? '+' : ''}${value}`, {
                fontSize: '14px',
                color: '#ffffff',
                fontStyle: 'bold'
            }).setOrigin(0.5);
            this.container.add(text);
        }
    }

    public destroy() {
        this.container.destroy();
    }
}
