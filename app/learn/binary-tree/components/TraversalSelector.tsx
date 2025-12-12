"use client";
import { useState, useMemo } from "react";
import type { TraversalType } from '../types/game';
import { preorderTraversal, inorderTraversal, postorderTraversal } from '../utils/traversals';

interface TraversalSelectorProps {
    treeValues: (number | null)[];
    basePower: number;
    onSelect: (type: TraversalType) => void;
}

export default function TraversalSelector({
    treeValues,
    basePower,
    onSelect,
}: TraversalSelectorProps) {
    const [hoveredType, setHoveredType] = useState<TraversalType | null>(null);

    // Calculate all traversals and their sums
    const traversals = useMemo(() => {
        const pre = preorderTraversal(treeValues);
        const ino = inorderTraversal(treeValues);
        const post = postorderTraversal(treeValues);

        const preSum = pre.reduce((acc, v) => acc + v, 0);
        const inoSum = ino.reduce((acc, v) => acc + v, 0);
        const postSum = post.reduce((acc, v) => acc + v, 0);

        return {
            preorder: { values: pre, sum: preSum, power: Math.max(basePower + preSum, 1) },
            inorder: { values: ino, sum: inoSum, power: Math.max(basePower + inoSum, 1) },
            postorder: { values: post, sum: postSum, power: Math.max(basePower + postSum, 1) },
        };
    }, [treeValues, basePower]);

    const getTraversalInfo = (type: TraversalType) => {
        const data = traversals[type];
        return {
            title: type.charAt(0).toUpperCase() + type.slice(1),
            description:
                type === 'preorder' ? 'Root → Left → Right' :
                    type === 'inorder' ? 'Left → Root → Right' :
                        'Left → Right → Root',
            values: data.values,
            sum: data.sum,
            power: data.power,
        };
    };

    return (
        <div className="w-full max-w-5xl mx-auto space-y-8">
            {/* Header */}
            <div className="text-center space-y-2">
                <h2 className="text-4xl font-black text-white">Choose Your Traversal</h2>
                <p className="text-white/70 text-lg">
                    This determines how your skill tree is calculated
                </p>
            </div>

            {/* Traversal Options */}
            <div className="grid md:grid-cols-3 gap-6">
                {(['preorder', 'inorder', 'postorder'] as TraversalType[]).map((type) => {
                    const info = getTraversalInfo(type);
                    const isHovered = hoveredType === type;

                    return (
                        <button
                            key={type}
                            onClick={() => onSelect(type)}
                            onMouseEnter={() => setHoveredType(type)}
                            onMouseLeave={() => setHoveredType(null)}
                            className="group relative bg-white/5 backdrop-blur-sm border-4 border-white/20 hover:border-sky-500 rounded-3xl p-6 text-left transition-all hover:scale-105"
                        >
                            {/* Glow on hover */}
                            <div className={`absolute inset-0 bg-sky-500/20 rounded-3xl blur-xl transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0'
                                }`} />

                            <div className="relative space-y-4">
                                {/* Title */}
                                <div>
                                    <h3 className="text-2xl font-bold text-white mb-1">{info.title}</h3>
                                    <p className="text-white/60 text-sm">{info.description}</p>
                                </div>

                                {/* Estimated Power */}
                                <div className="bg-black/30 rounded-xl p-4 border border-white/10">
                                    <div className="text-white/60 text-xs uppercase tracking-wider mb-1">
                                        Final Power
                                    </div>
                                    <div className="text-white text-4xl font-black">
                                        {info.power}
                                    </div>
                                </div>

                                {/* Preview */}
                                <div className="space-y-2">
                                    <div className="text-white/60 text-xs uppercase tracking-wider">
                                        Sequence
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                        {info.values.slice(0, 5).map((val, idx) => (
                                            <span
                                                key={idx}
                                                className={`px-2 py-1 rounded text-xs font-mono font-bold ${val > 0 ? 'bg-green-500/20 text-green-400' :
                                                        val < 0 ? 'bg-red-500/20 text-red-400' :
                                                            'bg-gray-500/20 text-gray-400'
                                                    }`}
                                            >
                                                {val > 0 ? '+' : ''}{val}
                                            </span>
                                        ))}
                                        {info.values.length > 5 && (
                                            <span className="px-2 py-1 text-white/40 text-xs">
                                                +{info.values.length - 5} more
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Sum */}
                                <div className="text-sm text-white/70">
                                    Base: {basePower} + Sum: {info.sum > 0 ? '+' : ''}{info.sum} = {info.power}
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Hint */}
            <div className="text-center">
                <p className="text-white/50 text-sm">
                    💡 All traversals visit the same nodes, just in different order!
                </p>
            </div>
        </div>
    );
}
