/**
 * Results Scene - Show final score and stats
 */
import * as Phaser from 'phaser';
import { preorderTraversal, inorderTraversal, postorderTraversal } from '../../utils/traversals';
import type { Character } from '../../types/character';
import { TreeVisualizer } from '../TreeVisualizer';

export default class ResultsScene extends Phaser.Scene {
    private character!: Character;
    private treeValues!: (number | null)[];
    private wave!: number;
    private nodeCount!: number;
    private treeVisualizer!: TreeVisualizer;

    constructor() {
        super({ key: 'ResultsScene' });
    }

    init(data: any) {
        this.character = data.character;
        this.treeValues = data.treeValues;
        this.wave = data.wave;
        this.nodeCount = data.nodeCount;
    }

    create() {
        const { width, height } = this.cameras.main;

        // Background
        this.add.rectangle(0, 0, width, height, 0x0f172a).setOrigin(0);

        // Title
        this.add.text(width / 2, 60, 'Run Complete!', {
            fontSize: '48px',
            color: '#fbbf24',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Calculate traversals
        const preorder = preorderTraversal(this.treeValues);
        const inorder = inorderTraversal(this.treeValues);
        const postorder = postorderTraversal(this.treeValues);

        const preSum = preorder.reduce((acc, v) => acc + v, 0);
        const inoSum = inorder.reduce((acc, v) => acc + v, 0);
        const postSum = postorder.reduce((acc, v) => acc + v, 0);

        const basePower = 10;
        const prePower = Math.max(basePower + preSum, 1);
        const inoPower = Math.max(basePower + inoSum, 1);
        const postPower = Math.max(basePower + postSum, 1);

        // Show traversal options
        let yPos = 100;

        this.add.text(width / 2, yPos, 'Your Binary Skill Tree', {
            fontSize: '20px',
            color: '#0ea5e9',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        yPos += 30;

        // Tree visualization
        this.treeVisualizer = new TreeVisualizer(this);
        this.treeVisualizer.drawTree(width / 2, yPos + 80, this.treeValues, 400, 140);

        yPos += 200;

        this.add.text(width / 2, yPos, 'Choose a Traversal Method:', {
            fontSize: '24px',
            color: '#fff'
        }).setOrigin(0.5);

        yPos += 60;

        // Preorder
        const preCard = this.createTraversalCard(width / 2 - 220, yPos, 'Preorder', prePower, preorder.slice(0, 5));
        preCard.on('pointerdown', () => this.showFinalScore(prePower, 'Preorder', preorder));

        // Inorder
        const inoCard = this.createTraversalCard(width / 2, yPos, 'Inorder', inoPower, inorder.slice(0, 5));
        inoCard.on('pointerdown', () => this.showFinalScore(inoPower, 'Inorder', inorder));

        // Postorder
        const postCard = this.createTraversalCard(width / 2 + 220, yPos, 'Postorder', postPower, postorder.slice(0, 5));
        postCard.on('pointerdown', () => this.showFinalScore(postPower, 'Postorder', postorder));

        // Stats at bottom
        yPos = height - 100;
        this.add.text(width / 2, yPos, `Waves: ${this.wave} | Nodes: ${this.nodeCount}`, {
            fontSize: '18px',
            color: '#94a3b8'
        }).setOrigin(0.5);
    }

    private createTraversalCard(x: number, y: number, name: string, power: number, preview: number[]) {
        const card = this.add.rectangle(x, y, 200, 200, 0x1e293b)
            .setInteractive({ useHandCursor: true })
            .on('pointerover', function (this: Phaser.GameObjects.Rectangle) { this.setScale(1.05); })
            .on('pointerout', function (this: Phaser.GameObjects.Rectangle) { this.setScale(1); });

        // Border
        const border = this.add.rectangle(x, y, 200, 200)
            .setStrokeStyle(2, 0x0ea5e9);

        this.add.text(x, y - 70, name, {
            fontSize: '20px',
            color: '#fff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.add.text(x, y - 30, `Power: ${power}`, {
            fontSize: '32px',
            color: '#0ea5e9',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.add.text(x, y + 20, preview.map(v => v > 0 ? `+${v}` : `${v}`).join(' '), {
            fontSize: '14px',
            color: '#94a3b8'
        }).setOrigin(0.5);

        this.add.text(x, y + 60, 'Click to Select', {
            fontSize: '12px',
            color: '#64748b'
        }).setOrigin(0.5);

        return card;
    }

    private showFinalScore(finalPower: number, traversal: string, values: number[]) {
        // Clear scene
        this.children.removeAll();

        const { width, height } = this.cameras.main;

        // Background
        this.add.rectangle(0, 0, width, height, 0x0f172a).setOrigin(0);

        // Celebration particles
        this.add.particles(width / 2, height / 2, 'particle', {
            speed: { min: 50, max: 200 },
            angle: { min: 0, max: 360 },
            scale: { start: 1, end: 0 },
            tint: [0xfbbf24, 0x0ea5e9, 0x22c55e],
            lifespan: 2000,
            frequency: 50
        });

        // Title
        this.add.text(width / 2, 80, 'FINAL POWER', {
            fontSize: '32px',
            color: '#fbbf24',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Big number
        this.add.text(width / 2, height / 2 - 50, `${finalPower}`, {
            fontSize: '128px',
            color: '#fff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.add.text(width / 2, height / 2 + 60, `Traversal: ${traversal}`, {
            fontSize: '24px',
            color: '#94a3b8'
        }).setOrigin(0.5);

        // Buttons
        const playAgainBtn = this.add.rectangle(width / 2 - 120, height - 80, 200, 50, 0x0ea5e9)
            .setInteractive({ useHandCursor: true })
            .on('pointerover', function (this: Phaser.GameObjects.Rectangle) { this.setScale(1.05); })
            .on('pointerout', function (this: Phaser.GameObjects.Rectangle) { this.setScale(1); })
            .on('pointerdown', () => {
                // Restart game
                this.scene.start('CombatScene', {
                    character: this.character,
                    treeValues: Array(32).fill(null),
                    wave: 1,
                    nodeCount: 1
                });
            });

        this.add.text(width / 2 - 120, height - 80, 'Play Again', {
            fontSize: '18px',
            color: '#fff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        const menuBtn = this.add.rectangle(width / 2 + 120, height - 80, 200, 50, 0x475569)
            .setInteractive({ useHandCursor: true })
            .on('pointerover', function (this: Phaser.GameObjects.Rectangle) { this.setScale(1.05); })
            .on('pointerout', function (this: Phaser.GameObjects.Rectangle) { this.setScale(1); })
            .on('pointerdown', () => {
                // Signal to React to go back
                window.location.href = '/learn';
            });

        this.add.text(width / 2 + 120, height - 80, 'Menu', {
            fontSize: '18px',
            color: '#fff',
            fontStyle: 'bold'
        }).setOrigin(0.5);
    }

    preload() {
        if (!this.textures.exists('particle')) {
            const graphics = this.make.graphics({});
            graphics.fillStyle(0xffffff);
            graphics.fillCircle(4, 4, 4);
            graphics.generateTexture('particle', 8, 8);
            graphics.destroy();
        }
    }
}
