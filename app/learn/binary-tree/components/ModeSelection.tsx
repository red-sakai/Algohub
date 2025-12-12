"use client";

interface ModeSelectionProps {
    onSelectMode: (mode: 'combat' | 'educational') => void;
}

export default function ModeSelection({ onSelectMode }: ModeSelectionProps) {
    return (
        <div className="w-full max-w-5xl mx-auto space-y-8">
            {/* Header */}
            <div className="text-center space-y-2">
                <h2 className="text-5xl font-black text-white">Choose Your Mode</h2>
                <p className="text-white/70 text-lg">
                    How would you like to build your skill tree?
                </p>
            </div>

            {/* Mode Cards */}
            <div className="grid md:grid-cols-2 gap-8">
                {/* Combat Mode */}
                <button
                    onClick={() => onSelectMode('combat')}
                    className="group relative bg-gradient-to-br from-red-500/20 to-orange-500/20 border-4 border-red-500 rounded-3xl p-8 text-left hover:scale-105 transition-transform"
                >
                    <div className="absolute inset-0 bg-red-500/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />

                    <div className="relative space-y-4">
                        {/* Icon */}
                        <div className="text-7xl">⚔️</div>

                        {/* Title */}
                        <div>
                            <h3 className="text-3xl font-bold text-white mb-2">Combat Mode</h3>
                            <p className="text-white/80 text-sm">Roguelike Adventure</p>
                        </div>

                        {/* Description */}
                        <div className="space-y-2 text-white/70 text-sm">
                            <p>• Fight waves of enemies</p>
                            <p>• Choose upgrades or downgrades</p>
                            <p>• Build tree through combat</p>
                            <p>• Animated sprite battles</p>
                        </div>

                        {/* Button */}
                        <div className="pt-4">
                            <div className="w-full py-3 bg-red-500 text-white font-bold rounded-xl text-center group-hover:bg-red-400 transition">
                                Start Combat
                            </div>
                        </div>
                    </div>
                </button>

                {/* Educational Mode */}
                <button
                    onClick={() => onSelectMode('educational')}
                    className="group relative bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-4 border-blue-500 rounded-3xl p-8 text-left hover:scale-105 transition-transform"
                >
                    <div className="absolute inset-0 bg-blue-500/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />

                    <div className="relative space-y-4">
                        {/* Icon */}
                        <div className="text-7xl">📚</div>

                        {/* Title */}
                        <div>
                            <h3 className="text-3xl font-bold text-white mb-2">Educational Mode</h3>
                            <p className="text-white/80 text-sm">Manual Tree Building</p>
                        </div>

                        {/* Description */}
                        <div className="space-y-2 text-white/70 text-sm">
                            <p>• Manually input node values</p>
                            <p>• Set nodes to NULL</p>
                            <p>• Max 5 levels (31 nodes)</p>
                            <p>• Learn tree traversals</p>
                        </div>

                        {/* Button */}
                        <div className="pt-4">
                            <div className="w-full py-3 bg-blue-500 text-white font-bold rounded-xl text-center group-hover:bg-blue-400 transition">
                                Start Learning
                            </div>
                        </div>
                    </div>
                </button>
            </div>

            {/* Info */}
            <div className="text-center">
                <p className="text-white/50 text-sm">
                    Both modes teach binary tree traversals (preorder, inorder, postorder)
                </p>
            </div>
        </div>
    );
}
