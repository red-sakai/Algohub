'use client';

/**
 * Binary Tree Pinball - Main Game Page
 * Educational 3D arcade game for teaching tree traversal algorithms
 */

import { useState, useEffect, useRef } from 'react';
import { buildBST } from '@/lib/pinball/treeAlgorithms';
import { convertTo3DTree, createTraversalResult } from '@/lib/pinball/positioningEngine';
import { PinballAnimator, NodeVisualStateManager } from '@/lib/pinball/animationController';
import { GameState, GamePhase, TraversalType, TreeNode3D, TraversalStep } from '@/types/pinball';
import PinballScene3D from './PinballScene3D';
import GameControls from './GameControls';
import TraversalInfo from './TraversalInfo';
import AlgorithmExplanation from './AlgorithmExplanation';

export default function PinballGamePage() {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  const [gameState, setGameState] = useState<GameState>({
    phase: 'input',
    tree: null,
    currentTraversal: null,
    pinball: null,
    visualStates: new Map(),
    inputValues: [],
    selectedTraversal: 'preorder'
  });

  const [inputText, setInputText] = useState<string>('');
  const [showExplanation, setShowExplanation] = useState<boolean>(true);
  const [showCabinetIntro, setShowCabinetIntro] = useState<boolean>(false);
  const [skipIntro, setSkipIntro] = useState<boolean>(false);

  // Animation refs
  const animatorRef = useRef<PinballAnimator>(new PinballAnimator());
  const visualStateManagerRef = useRef<NodeVisualStateManager>(new NodeVisualStateManager());
  const animationFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  // ============================================================================
  // TREE BUILDING
  // ============================================================================

  const handleBuildTree = () => {
    // Parse input
    const values = inputText
      .split(/[,\s]+/)
      .map(v => parseFloat(v.trim()))
      .filter(v => !isNaN(v));

    if (values.length === 0) {
      alert('Please enter at least one number');
      return;
    }

    // Build BST using pure algorithm
    const bstRoot = buildBST(values);
    
    // Convert to 3D positioned tree
    const tree3D = convertTo3DTree(bstRoot);

    // Trigger cabinet intro sequence
    setShowCabinetIntro(true);
    setSkipIntro(false);

    // Set state (will transition to 'select' after intro completes)
    setGameState(prev => ({
      ...prev,
      phase: 'intro', // New phase for intro sequence
      tree: tree3D,
      inputValues: values
    }));

    // Initialize visual states
    if (tree3D) {
      const nodeIds = collectNodeIds(tree3D);
      visualStateManagerRef.current.initializeNodes(nodeIds);
    }
  };

  const handleIntroComplete = () => {
    setShowCabinetIntro(false);
    setGameState(prev => ({
      ...prev,
      phase: 'select'
    }));
  };

  const handleSkipIntro = () => {
    setSkipIntro(true);
    setShowCabinetIntro(false);
    setGameState(prev => ({
      ...prev,
      phase: 'select'
    }));
  };

  // ============================================================================
  // TRAVERSAL EXECUTION
  // ============================================================================

  const handleStartTraversal = (type: TraversalType) => {
    if (!gameState.tree) return;

    // Generate traversal using pure algorithm
    const traversalResult = createTraversalResult(gameState.tree, type);

    setGameState(prev => ({
      ...prev,
      phase: 'ready', // Ready to launch
      selectedTraversal: type,
      currentTraversal: traversalResult
    }));

    // Reset visual states
    visualStateManagerRef.current.reset();

    // Initialize animator at launcher position (not moving yet)
    animatorRef.current.startTraversal(
      traversalResult,
      (step: TraversalStep) => {
        // Node hit callback
        visualStateManagerRef.current.hitNode(step.nodeId, step.sequenceIndex);
      },
      () => {
        // Traversal complete callback
        setGameState(prev => ({ ...prev, phase: 'complete' }));
      }
    );

    // Start animation loop for launcher charging
    startAnimationLoop();

    // Update state with initial pinball state
    setGameState(prev => ({
      ...prev,
      pinball: animatorRef.current.getState()
    }));
  };

  // ============================================================================
  // ANIMATION LOOP
  // ============================================================================

  const startAnimationLoop = () => {
    lastTimeRef.current = performance.now();
    
    console.log('🎬 Animation loop started');
    
    const animate = (currentTime: number) => {
      const deltaTime = (currentTime - lastTimeRef.current) / 1000;
      lastTimeRef.current = currentTime;

      // Update animator
      const pinballPosition = animatorRef.current.update(deltaTime);
      
      // Update visual states
      visualStateManagerRef.current.update(deltaTime);

      // Update game state
      setGameState(prev => ({
        ...prev,
        pinball: animatorRef.current.getState()
      }));

      const currentState = animatorRef.current.getState();
      console.log('🔄 Frame update - isMoving:', currentState.isMoving, 'pos:', pinballPosition);

      // Continue loop if still moving
      if (currentState.isMoving) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        console.log('⏹️ Animation loop stopped - ball not moving');
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);
  };

  // ============================================================================
  // LAUNCH CONTROLS
  // ============================================================================

  const handleLaunchStart = (startY?: number) => {
    if (gameState.phase === 'ready' && gameState.pinball && !gameState.pinball.isLaunched) {
      if (startY !== undefined) {
        animatorRef.current.startChargingLauncher(startY);
      }
    }
  };

  const handleLaunchChange = (currentY: number) => {
    if (gameState.phase === 'ready' && gameState.pinball && !gameState.pinball.isLaunched) {
      animatorRef.current.updatePlungerPull(currentY);
      setGameState(prev => ({
        ...prev,
        pinball: animatorRef.current.getState()
      }));
    }
  };

  const handleLaunchEnd = () => {
    if (gameState.phase === 'ready' && gameState.pinball && !gameState.pinball.isLaunched) {
      console.log('🚀 Launching ball');
      
      // Cancel any existing animation loop
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = 0;
      }
      
      // Launch the ball
      animatorRef.current.launchBall();
      setGameState(prev => ({ ...prev, phase: 'traversing' }));
      
      // Restart animation loop for launch
      console.log('⚡ Restarting animation loop for launch');
      startAnimationLoop();
    }
  };

  // ============================================================================
  // CONTROL HANDLERS
  // ============================================================================

  const handlePause = () => {
    animatorRef.current.pause();
    cancelAnimationFrame(animationFrameRef.current);
    setGameState(prev => ({ ...prev, phase: 'paused' }));
  };

  const handleResume = () => {
    animatorRef.current.resume();
    startAnimationLoop();
    setGameState(prev => ({ ...prev, phase: 'traversing' }));
  };

  const handleReset = () => {
    animatorRef.current.reset();
    visualStateManagerRef.current.reset();
    cancelAnimationFrame(animationFrameRef.current);
    setGameState(prev => ({
      ...prev,
      phase: 'select',
      currentTraversal: null,
      pinball: null
    }));
  };

  const handleNewTree = () => {
    animatorRef.current.reset();
    visualStateManagerRef.current.reset();
    cancelAnimationFrame(animationFrameRef.current);
    setInputText('');
    setGameState({
      phase: 'input',
      tree: null,
      currentTraversal: null,
      pinball: null,
      visualStates: new Map(),
      inputValues: [],
      selectedTraversal: 'preorder'
    });
  };

  // ============================================================================
  // CLEANUP
  // ============================================================================

  useEffect(() => {
    return () => {
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="w-full h-screen bg-gradient-to-b from-slate-950 via-purple-950 to-slate-950 flex flex-col overflow-hidden relative">
      {/* Arcade scanlines effect */}
      <div className="absolute inset-0 pointer-events-none opacity-5" style={{
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)'
      }} />
      
      {/* Top Bar - Arcade Marquee Style */}
      <div className="p-2 sm:p-4 text-center bg-gradient-to-r from-purple-900/80 via-pink-900/80 to-purple-900/80 backdrop-blur-sm border-b-2 sm:border-b-4 border-purple-500/60 shadow-[0_0_40px_rgba(139,92,246,0.5)] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 via-pink-600/20 to-cyan-600/20 animate-pulse pointer-events-none" />
        <h1 className="text-xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 drop-shadow-[0_0_20px_rgba(139,92,246,1)] uppercase tracking-wider relative z-10">
          🎯 Binary Tree Pinball 🕹️
        </h1>
        <div className="text-[0.5rem] sm:text-xs text-purple-300 mt-0.5 sm:mt-1 font-bold uppercase tracking-widest drop-shadow-[0_0_8px_rgba(168,85,247,0.8)] relative z-10">
          ⚡ Arcade Edition ⚡
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* 3D Scene - Main Area (full screen on mobile) */}
        <div className="absolute inset-0">
          <PinballScene3D
            tree={gameState.tree}
            pinballState={gameState.pinball}
            visualStateManager={visualStateManagerRef.current}
            traversalType={gameState.selectedTraversal}
            animationController={animatorRef.current}
            onLaunchStart={handleLaunchStart}
            onLaunchChange={handleLaunchChange}
            onLaunchEnd={handleLaunchEnd}
            showCabinetIntro={showCabinetIntro}
            skipIntro={skipIntro}
            onIntroComplete={handleIntroComplete}
          />
        </div>
      </div>

      {/* Progress Modal - Shows when traversal complete */}
      {gameState.phase === 'complete' && gameState.currentTraversal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-auto bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-2xl mx-4 animate-in zoom-in-95 slide-in-from-bottom-4 duration-500 relative">
            {/* Close button */}
            <button
              onClick={handleReset}
              className="absolute -top-4 -right-4 z-10 w-12 h-12 rounded-full bg-gradient-to-r from-red-600 to-red-500 text-white font-black text-2xl hover:from-red-500 hover:to-red-400 transition-all shadow-[0_0_20px_rgba(239,68,68,0.6)] hover:shadow-[0_0_30px_rgba(239,68,68,0.9)] border-2 border-red-400/50 hover:scale-110 active:scale-95 flex items-center justify-center"
            >
              ✕
            </button>
            <TraversalInfo
              traversal={gameState.currentTraversal}
              currentStep={animatorRef.current.getCurrentStep()}
              visitedSteps={animatorRef.current.getVisitedSteps()}
            />
          </div>
        </div>
      )}

      {/* Bottom Compact UI Overlay */}
      <div className="absolute inset-0 flex flex-col pointer-events-none">
        {/* Spacer - takes up space but doesn't block pointer events */}
        <div className="flex-1 pointer-events-none" />

        {/* Input Phase - Arcade Cabinet */}
        {gameState.phase === 'input' && (
          <div className="flex items-center justify-center h-full pointer-events-auto">
            <div className="bg-gradient-to-br from-slate-900/98 via-purple-950/95 to-slate-900/98 backdrop-blur-lg p-10 rounded-3xl shadow-[0_0_60px_rgba(139,92,246,0.6)] border-4 border-purple-500/60 max-w-2xl relative overflow-hidden">
              {/* Neon glow layers */}
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/15 via-transparent to-cyan-500/15 pointer-events-none" />
              <div className="absolute -inset-2 bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-600 opacity-20 blur-2xl pointer-events-none" />
              
              <div className="relative z-10">
                <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 mb-5 text-center drop-shadow-[0_0_15px_rgba(139,92,246,1)] uppercase">
                  🌳 Build Your Binary Tree
                </h2>
                <p className="text-cyan-200 mb-6 text-base text-center font-semibold drop-shadow-[0_0_6px_rgba(34,211,238,0.6)]">
                  Enter numbers separated by commas or spaces. The BST will be constructed using the standard insertion algorithm.
                </p>
              
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="e.g., 50, 30, 70, 20, 40, 60, 80"
                className="w-full px-5 py-4 bg-slate-900/90 text-white rounded-xl border-2 border-purple-400/50 focus:border-cyan-400 focus:outline-none focus:shadow-[0_0_25px_rgba(34,211,238,0.5)] mb-5 text-lg font-semibold placeholder:text-slate-500"
                onKeyPress={(e) => e.key === 'Enter' && handleBuildTree()}
              />

              <div className="flex gap-4 mb-6">
                <button
                  onClick={handleBuildTree}
                  className="flex-1 px-8 py-4 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white rounded-xl font-black hover:from-blue-500 hover:via-purple-500 hover:to-pink-500 transition-all shadow-[0_0_30px_rgba(139,92,246,0.7)] hover:shadow-[0_0_40px_rgba(139,92,246,1)] border-2 border-purple-400/50 hover:border-purple-300 text-lg hover:scale-105 active:scale-95"
                >
                  🚀 BUILD TREE
                </button>
                <button
                  onClick={() => setInputText('50,30,70,20,40,60,80')}
                  className="px-8 py-4 bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700 text-white rounded-xl hover:from-slate-600 hover:via-slate-500 hover:to-slate-600 transition-all font-black border-2 border-slate-500/50 hover:border-slate-400 shadow-[0_0_15px_rgba(100,116,139,0.4)] hover:scale-105 active:scale-95"
                >
                  🎲 EXAMPLE
                </button>
              </div>

              <div className="text-sm text-purple-300 space-y-2 bg-slate-900/50 p-4 rounded-xl border-2 border-purple-500/30">
                <p className="font-black text-cyan-300 mb-2 uppercase tracking-wider drop-shadow-[0_0_6px_rgba(34,211,238,0.8)]">💡 SUGGESTED INPUTS:</p>
                <p className="font-semibold"><span className="text-green-400">• Balanced:</span> <span className="text-white">50,30,70,20,40,60,80</span></p>
                <p className="font-semibold"><span className="text-yellow-400">• Left-heavy:</span> <span className="text-white">10,5,15,3,7</span></p>
                <p className="font-semibold"><span className="text-red-400">• Sequential:</span> <span className="text-white">1,2,3,4,5,6,7</span></p>
              </div>
              </div>
            </div>
          </div>
        )}

        {/* Skip Intro Button - Top Right */}
        {showCabinetIntro && !skipIntro && (
          <div className="absolute top-8 right-8 pointer-events-auto z-50">
            <button
              onClick={handleSkipIntro}
              className="px-6 py-3 bg-gradient-to-r from-slate-800/90 to-slate-900/90 text-cyan-300 rounded-xl font-black border-2 border-cyan-500/50 hover:border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.5)] hover:shadow-[0_0_30px_rgba(34,211,238,0.8)] transition-all hover:scale-105 active:scale-95 backdrop-blur-sm"
            >
              ⏭️ SKIP INTRO
            </button>
          </div>
        )}

        {/* Game Controls - Bottom (compact on mobile) */}
        {(gameState.phase === 'select' || gameState.phase === 'ready' || gameState.phase === 'traversing' || gameState.phase === 'paused' || gameState.phase === 'complete') && (
          <div className="p-2 sm:p-4 pointer-events-auto select-none w-full sm:w-auto">
            <GameControls
              phase={gameState.phase}
              onStartTraversal={handleStartTraversal}
              onPause={handlePause}
              onResume={handleResume}
              onReset={handleReset}
              onNewTree={handleNewTree}
              selectedTraversal={gameState.selectedTraversal}
              pinballState={gameState.pinball}
              onLaunchStart={handleLaunchStart}
              onLaunchEnd={handleLaunchEnd}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function collectNodeIds(tree: TreeNode3D | null): string[] {
  if (tree === null) return [];
  return [
    tree.nodeId,
    ...collectNodeIds(tree.left),
    ...collectNodeIds(tree.right)
  ];
}
