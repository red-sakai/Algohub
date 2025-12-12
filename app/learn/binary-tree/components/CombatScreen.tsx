"use client";
import type { Enemy } from '../types/game';
import type { Character } from '../types/character';
import { CHARACTER_COLORS } from '../types/character';

interface CombatScreenProps {
    wave: number;
    enemy: Enemy;
    basePower: number;
    nodeCount: number;
    treeValues: (number | null)[];
    character: Character;
    onAttack: () => void;
}

export default function CombatScreen({
    wave,
    enemy,
    basePower,
    nodeCount,
    treeValues,
    character,
    onAttack,
}: CombatScreenProps) {
    const healthPercent = (enemy.currentHealth / enemy.maxHealth) * 100;
    const characterColor = CHARACTER_COLORS[character.color];

    return (
        <div className="w-full max-w-5xl mx-auto space-y-8">
            {/* Wave Info */}
            <div className="text-center">
                <div className="inline-block px-6 py-2 bg-sky-500/20 border-2 border-sky-500 rounded-full">
                    <span className="text-2xl font-bold text-white">Wave {wave}</span>
                </div>
            </div>

            {/* Battle Arena */}
            <div className="relative grid md:grid-cols-2 gap-8 items-center">
                {/* Player Character */}
                <div className="text-center space-y-4">
                    <div className={`inline-flex items-center justify-center w-48 h-48 rounded-full bg-gradient-to-br ${characterColor.primary} border-4 border-white/50 shadow-2xl`}>
                        <span className="text-7xl">{character.emoji}</span>
                    </div>
                    <div className="space-y-1">
                        <div className="text-2xl font-bold text-white">{character.name}</div>
                        <div className="text-white/60 text-sm">Power: {basePower}</div>
                    </div>
                </div>

                {/* VS Text */}
                <div className="hidden md:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                    <div className="text-6xl font-black text-white/20">VS</div>
                </div>

                {/* Enemy */}
                <div className="text-center space-y-4">
                    <div className="inline-flex items-center justify-center w-48 h-48 rounded-full bg-gradient-to-br from-red-500 to-rose-700 border-4 border-red-400 shadow-2xl">
                        <span className="text-7xl">👾</span>
                    </div>
                    <div className="space-y-1">
                        <div className="text-2xl font-bold text-white">{enemy.name}</div>
                        <div className="text-white/60 text-sm">Wave {wave}</div>
                    </div>
                </div>
            </div>

            {/* Enemy Health Bar */}
            <div className="max-w-md mx-auto space-y-2">
                <div className="flex justify-between text-sm text-white/70">
                    <span>Enemy HP</span>
                    <span>{enemy.currentHealth} / {enemy.maxHealth}</span>
                </div>
                <div className="relative h-6 bg-black/40 rounded-full overflow-hidden border-2 border-white/20">
                    <div
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-red-500 to-rose-500 transition-all duration-300"
                        style={{ width: `${healthPercent}%` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent" />
                </div>
            </div>

            {/* Attack Button */}
            <div className="text-center space-y-4">
                <button
                    onClick={onAttack}
                    className={`group relative px-12 py-6 bg-gradient-to-r ${characterColor.primary} text-white text-2xl font-black rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-transform`}
                >
                    <span className="relative z-10">{character.emoji} ATTACK</span>
                    <div className="absolute inset-0 bg-white/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>

                <p className="text-white/60 text-sm">
                    Deal {basePower} damage
                </p>
            </div>

            {/* Stats Panel */}
            <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                    <div className="text-white/60 text-xs uppercase tracking-wider mb-1">Base Power</div>
                    <div className="text-white text-2xl font-bold">{basePower}</div>
                </div>
                <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                    <div className="text-white/60 text-xs uppercase tracking-wider mb-1">Nodes</div>
                    <div className="text-white text-2xl font-bold">{nodeCount}</div>
                </div>
                <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                    <div className="text-white/60 text-xs uppercase tracking-wider mb-1">Wave</div>
                    <div className="text-white text-2xl font-bold">{wave}</div>
                </div>
            </div>

            {/* Mini Tree Preview */}
            {nodeCount > 1 && (
                <div className="text-center">
                    <p className="text-white/50 text-xs uppercase tracking-wider mb-2">Your Skill Tree</p>
                    <div className="inline-flex gap-1">
                        {treeValues.slice(1, 8).map((val, idx) => (
                            val !== null && (
                                <div
                                    key={idx}
                                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${val > 0 ? 'bg-green-500/30 text-green-300' :
                                            val < 0 ? 'bg-red-500/30 text-red-300' :
                                                'bg-gray-500/30 text-gray-300'
                                        }`}
                                >
                                    {val > 0 ? '+' : val < 0 ? '-' : '0'}
                                </div>
                            )
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
