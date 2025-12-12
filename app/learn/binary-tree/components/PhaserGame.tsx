"use client";
import { useEffect, useRef } from 'react';
import * as Phaser from 'phaser';
import { gameConfig } from '../phaser/config';
import type { Character } from '../types/character';

interface PhaserGameProps {
    character: Character;
}

export default function PhaserGame({ character }: PhaserGameProps) {
    const gameRef = useRef<Phaser.Game | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (gameRef.current) return;

        // Create game instance
        const config = {
            ...gameConfig,
            parent: containerRef.current || 'phaser-game',
            scale: {
                mode: Phaser.Scale.RESIZE, // Resize to fit parent
                width: '100%',
                height: '100%',
            }
        };

        gameRef.current = new Phaser.Game(config);

        // Start with combat scene and pass character
        setTimeout(() => {
            const scene = gameRef.current?.scene.getScene('CombatScene');
            if (scene) {
                scene.scene.restart({
                    character,
                    treeValues: Array(32).fill(null),
                    wave: 1,
                    nodeCount: 1
                });
            }
        }, 100);

        return () => {
            gameRef.current?.destroy(true);
            gameRef.current = null;
        };
    }, [character]);

    return (
        <div className="fixed inset-0 z-50 bg-black overflow-hidden">
            <div
                ref={containerRef}
                id="phaser-game"
                className="w-full h-full"
            />
        </div>
    );
}
