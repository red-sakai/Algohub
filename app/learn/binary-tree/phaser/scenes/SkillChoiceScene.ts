/**
 * Skill Choice Scene - Choose between good/bad nodes
 */
import * as Phaser from 'phaser';
import { generateGoodNode, generateBadNode, getNodeDescription } from '../../utils/nodeGeneration';
import { getNextSlot, calculateNodeIndex, processSlotInsertion, initializeSlots } from '../../utils/treeInsertion';
import type { Character } from '../../types/character';
import type { SlotInfo } from '../../types/game';

export default class SkillChoiceScene extends Phaser.Scene {
    private character!: Character;
    private treeValues!: (number | null)[];
    private wave!: number;
    private nodeCount!: number;
    private availableSlots!: SlotInfo[];

    constructor() {
        super({ key: 'SkillChoiceScene' });
    }

    init(data: any) {
        this.character = data.character;
        this.treeValues = data.treeValues;
        this.wave = data.wave;
        this.nodeCount = data.nodeCount;

        // Initialize slots if first time
        if (!data.availableSlots) {
            this.availableSlots = initializeSlots();
        } else {
            this.availableSlots = data.availableSlots;
        }
    }

    create() {
        const { width, height } = this.cameras.main;

        // Background
        this.add.rectangle(0, 0, width, height, 0x0f172a).setOrigin(0);

        // Title
        this.add.text(width / 2, 60, 'Enemy Defeated!', {
            fontSize: '32px',
            color: '#fbbf24',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.add.text(width / 2, 100, `Choose Your Skill - Wave ${this.wave}`, {
            fontSize: '24px',
            color: '#fff'
        }).setOrigin(0.5);

        // Get next slot
        const slot = getNextSlot(this.availableSlots);

        if (!slot) {
            // Tree full - go to results
            this.scene.start('ResultsScene', {
                character: this.character,
                treeValues: this.treeValues,
                wave: this.wave,
                nodeCount: this.nodeCount
            });
            return;
        }

        // Generate choices
        const leftNode = generateGoodNode(slot.level);
        const rightNode = generateBadNode(slot.level);

        // Left card (GOOD)
        const leftCard = this.add.rectangle(250, height / 2, 200, 280, 0x10b981)
            .setInteractive({ useHandCursor: true })
            .on('pointerover', () => leftCard.setScale(1.05))
            .on('pointerout', () => leftCard.setScale(1))
            .on('pointerdown', () => this.handleChoice('left', slot, leftNode.value));

        this.add.text(250, height / 2 - 100, 'LEFT', {
            fontSize: '20px',
            color: '#fff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.add.text(250, height / 2, `${leftNode.value > 0 ? '+' : ''}${leftNode.value}`, {
            fontSize: '64px',
            color: '#fff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.add.text(250, height / 2 + 80, 'UPGRADE', {
            fontSize: '18px',
            color: '#dcfce7'
        }).setOrigin(0.5);

        // Right card (BAD)
        const rightCard = this.add.rectangle(550, height / 2, 200, 280, 0xef4444)
            .setInteractive({ useHandCursor: true })
            .on('pointerover', () => rightCard.setScale(1.05))
            .on('pointerout', () => rightCard.setScale(1))
            .on('pointerdown', () => this.handleChoice('right', slot, rightNode.value));

        this.add.text(550, height / 2 - 100, 'RIGHT', {
            fontSize: '20px',
            color: '#fff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.add.text(550, height / 2, `${rightNode.value > 0 ? '+' : ''}${rightNode.value}`, {
            fontSize: '64px',
            color: '#fff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.add.text(550, height / 2 + 80, rightNode.value < 0 ? 'DOWNGRADE' : 'RISK', {
            fontSize: '18px',
            color: '#fecaca'
        }).setOrigin(0.5);

        // Add some particles for effect
        this.add.particles(250, height / 2 - 140, 'particle', {
            speed: 20,
            scale: { start: 0.5, end: 0 },
            tint: 0x10b981,
            lifespan: 1000,
            frequency: 100
        });

        this.add.particles(550, height / 2 - 140, 'particle', {
            speed: 20,
            scale: { start: 0.5, end: 0 },
            tint: 0xef4444,
            lifespan: 1000,
            frequency: 100
        });
    }

    preload() {
        // Reuse particle texture from CombatScene
        if (!this.textures.exists('particle')) {
            const graphics = this.make.graphics({});
            graphics.fillStyle(0xffffff);
            graphics.fillCircle(4, 4, 4);
            graphics.generateTexture('particle', 8, 8);
            graphics.destroy();
        }
    }

    private handleChoice(side: 'left' | 'right', slot: SlotInfo, value: number) {
        const nodeIndex = calculateNodeIndex(slot.parentIndex, side);

        // Update tree
        this.treeValues[nodeIndex] = value;

        // Update slots
        const newSlots = processSlotInsertion(this.availableSlots, nodeIndex, slot.level);

        // Check if should continue or end
        const newNodeCount = this.nodeCount + 1;

        if (newSlots.length === 0 || slot.level >= 5 || this.wave >= 30) {
            // Go to results
            this.scene.start('ResultsScene', {
                character: this.character,
                treeValues: this.treeValues,
                wave: this.wave,
                nodeCount: newNodeCount
            });
        } else {
            // Next wave
            this.scene.start('CombatScene', {
                character: this.character,
                treeValues: this.treeValues,
                wave: this.wave + 1,
                nodeCount: newNodeCount,
                availableSlots: newSlots
            });
        }
    }
}
