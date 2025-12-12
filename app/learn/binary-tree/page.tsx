"use client";
import { useState } from "react";
import CharacterCustomization from "./components/CharacterCustomization";
import ModeSelection from "./components/ModeSelection";
import PhaserGame from "./components/PhaserGame";
import TreeInputPanel from "./components/TreeInputPanel";
import TraversalDisplay from "./components/TraversalDisplay";
import TreeVisualization from "./components/TreeVisualization";
import type { Character } from "./types/character";
import { parseTreeInput, validateTree } from "./utils/validation";
import { preorderTraversal, inorderTraversal, postorderTraversal } from "./utils/traversals";

type GameMode = 'selection' | 'combat' | 'educational';
type EducationalState = 'input' | 'results';

export default function BinarySkillTreePage() {
    // Mode selection
    const [gameMode, setGameMode] = useState<GameMode>('selection');

    // Combat mode state
    const [character, setCharacter] = useState<Character | null>(null);

    // Educational mode state
    const [educationalState, setEducationalState] = useState<EducationalState>('input');
    const [treeInput, setTreeInput] = useState('');
    const [treeValues, setTreeValues] = useState<(number | null)[]>([]);
    const [validationError, setValidationError] = useState('');

    // Handle mode selection
    const handleModeSelect = (mode: 'combat' | 'educational') => {
        if (mode === 'combat') {
            setGameMode('combat');
        } else {
            setGameMode('educational');
            setEducationalState('input');
        }
    };

    // Handle character creation (for combat mode)
    const handleCharacterCreate = (newCharacter: Character) => {
        setCharacter(newCharacter);
    };

    // Handle educational mode tree input
    const handleConfirm = () => {
        const parsed = parseTreeInput(treeInput);
        const errors = validateTree(parsed);

        if (errors.length > 0) {
            setValidationError(errors[0]); // Show first error
            return;
        }

        setTreeValues(parsed);
        setValidationError('');
        setEducationalState('results');
    };

    const handleReset = () => {
        setTreeInput('');
        setTreeValues([]);
        setValidationError('');
        setEducationalState('input');
    };

    const handleBackToSelection = () => {
        setGameMode('selection');
        setCharacter(null);
        handleReset();
    };

    return (
        <div className="relative min-h-[100dvh] w-full bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
                <div
                    className="absolute inset-0"
                    style={{
                        backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
                        backgroundSize: '40px 40px',
                    }}
                />
            </div>

            {/* Content */}
            <div className="relative z-10 min-h-[100dvh] p-6 pb-24">
                {/* Back Button */}
                {gameMode !== 'selection' && (
                    <div className="absolute left-4 top-4 z-30 sm:left-6 sm:top-6">
                        <button
                            onClick={handleBackToSelection}
                            className="inline-flex items-center gap-2 rounded-full bg-black/50 px-3 py-2 text-sm font-semibold text-white ring-1 ring-white/20 backdrop-blur-md transition hover:bg-black/60 sm:px-4 sm:py-2.5"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
                            </svg>
                            <span className="hidden sm:inline">Back</span>
                        </button>
                    </div>
                )}

                {/* Game Title */}
                <div className="text-center pt-16 pb-8">
                    <h1 className="text-5xl font-black text-white tracking-tight">
                        Binary Skill Tree
                    </h1>
                    <p className="mt-2 text-white/70">
                        {gameMode === 'selection' && "Choose Your Learning Path"}
                        {gameMode === 'combat' && "Defeat → Choose → Grow Stronger"}
                        {gameMode === 'educational' && "Build → Visualize → Learn"}
                    </p>
                </div>

                {/* Mode Selection */}
                {gameMode === 'selection' && (
                    <div className="animate-in fade-in duration-500">
                        <ModeSelection onSelectMode={handleModeSelect} />
                    </div>
                )}

                {/* Combat Mode */}
                {gameMode === 'combat' && (
                    <>
                        {!character ? (
                            <div className="flex items-center justify-center">
                                <CharacterCustomization onComplete={handleCharacterCreate} />
                            </div>
                        ) : (
                            <PhaserGame character={character} />
                        )}
                    </>
                )}

                {/* Educational Mode */}
                {gameMode === 'educational' && (
                    <div className="animate-in fade-in duration-500">
                        {educationalState === 'input' ? (
                            <div className="w-full max-w-5xl mx-auto">
                                <TreeInputPanel
                                    value={treeInput}
                                    onChange={setTreeInput}
                                    onConfirm={handleConfirm}
                                    error={validationError}
                                />
                            </div>
                        ) : (
                            <div className="w-full max-w-6xl mx-auto space-y-8">
                                {/* Tree Visualization */}
                                <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-8 border-2 border-white/10">
                                    <h2 className="text-2xl font-bold text-white mb-6 text-center">Your Tree</h2>
                                    <TreeVisualization values={treeValues} />
                                </div>

                                {/* Traversals */}
                                <TraversalDisplay
                                    preorder={preorderTraversal(treeValues)}
                                    inorder={inorderTraversal(treeValues)}
                                    postorder={postorderTraversal(treeValues)}
                                />

                                {/* Actions */}
                                <div className="flex justify-center gap-4">
                                    <button
                                        onClick={handleReset}
                                        className="px-8 py-3 bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-400 transition"
                                    >
                                        Build New Tree
                                    </button>
                                    <button
                                        onClick={handleBackToSelection}
                                        className="px-8 py-3 bg-white/10 border-2 border-white/20 text-white font-bold rounded-xl hover:bg-white/20 transition"
                                    >
                                        Change Mode
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
