'use client';

import { useState, useEffect } from 'react';
import { highScoreManager, HighScore } from '@/lib/pinball/highScores';
import { TraversalType } from '@/types/pinball';

interface HighScoreDisplayProps {
  currentScore: number;
  currentAlgorithm: TraversalType | null;
}

export default function HighScoreDisplay({ currentScore, currentAlgorithm }: HighScoreDisplayProps) {
  const [highScores, setHighScores] = useState<HighScore[]>([]);
  const [filter, setFilter] = useState<'all' | TraversalType>('all');
  const [personalBest, setPersonalBest] = useState<number>(0);
  const [showPanel, setShowPanel] = useState<boolean>(false);

  useEffect(() => {
    loadScores();
  }, [filter]);

  useEffect(() => {
    if (currentAlgorithm) {
      const best = highScoreManager.getPersonalBest(currentAlgorithm);
      setPersonalBest(best?.score || 0);
    }
  }, [currentAlgorithm]);

  const loadScores = () => {
    const scores = filter === 'all' 
      ? highScoreManager.getAllScores()
      : highScoreManager.getScoresByAlgorithm(filter as TraversalType);
    
    setHighScores(scores.slice(0, 10));
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const isNewHighScore = currentAlgorithm && currentScore > 0 
    ? highScoreManager.isNewHighScore(currentScore, currentAlgorithm)
    : false;

  return (
    <div className="fixed top-4 right-4 z-30">
      {/* Current Score Display */}
      <div className="bg-gradient-to-br from-purple-900/90 to-slate-900/90 backdrop-blur-md rounded-2xl px-6 py-4 shadow-2xl border-2 border-purple-500/30 mb-2">
        <div className="text-purple-300 text-sm font-medium mb-1">SCORE</div>
        <div className="text-white text-4xl font-bold tracking-wider">
          {currentScore.toLocaleString()}
        </div>
        
        {personalBest > 0 && currentAlgorithm && (
          <div className="mt-2 text-sm">
            <span className="text-purple-400">Personal Best: </span>
            <span className="text-white font-semibold">{personalBest.toLocaleString()}</span>
          </div>
        )}
        
        {isNewHighScore && (
          <div className="mt-2 text-yellow-400 text-sm font-bold animate-pulse">
            🏆 NEW HIGH SCORE!
          </div>
        )}
        
        <button
          onClick={() => setShowPanel(!showPanel)}
          className="mt-3 w-full py-2 bg-purple-600/50 hover:bg-purple-600/70 rounded-lg text-white text-sm font-medium transition-colors"
        >
          {showPanel ? 'Hide' : 'View'} Leaderboard
        </button>
      </div>

      {/* High Scores Panel */}
      {showPanel && (
        <div className="bg-gradient-to-br from-slate-900/95 to-purple-900/95 backdrop-blur-md rounded-2xl p-6 shadow-2xl border-2 border-purple-500/30 w-80">
          <h3 className="text-2xl font-bold text-white mb-4">🏆 Top Scores</h3>
          
          {/* Filter Buttons */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setFilter('all')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'all' 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('preorder')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'preorder' 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Pre
            </button>
            <button
              onClick={() => setFilter('inorder')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'inorder' 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
              }`}
            >
              In
            </button>
            <button
              onClick={() => setFilter('postorder')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'postorder' 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Post
            </button>
          </div>

          {/* Scores List */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {highScores.length === 0 ? (
              <div className="text-center text-slate-400 py-8">
                No scores yet. Be the first!
              </div>
            ) : (
              highScores.map((score, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    index === 0 
                      ? 'bg-gradient-to-r from-yellow-600/30 to-yellow-700/30 border-2 border-yellow-500/50' 
                      : 'bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`text-lg font-bold ${
                      index === 0 ? 'text-yellow-400' : 
                      index === 1 ? 'text-slate-300' : 
                      index === 2 ? 'text-amber-600' : 
                      'text-slate-500'
                    }`}>
                      #{index + 1}
                    </div>
                    <div>
                      <div className="text-white font-semibold">
                        {score.score.toLocaleString()}
                        {score.perfect && <span className="ml-1 text-yellow-400">⭐</span>}
                      </div>
                      <div className="text-xs text-slate-400">
                        {score.algorithm.charAt(0).toUpperCase() + score.algorithm.slice(1)} • {score.nodeCount} nodes • {formatTime(score.timestamp)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Legend */}
          <div className="mt-4 pt-4 border-t border-slate-700">
            <div className="text-xs text-slate-400">
              <span className="text-yellow-400">⭐</span> = Perfect run (no misses)
            </div>
          </div>
        </div>
      )}
      
      {/* Keyboard Shortcuts Hint */}
      <div className="mt-2 text-xs text-purple-300 text-right">
        Press <kbd className="px-1 py-0.5 bg-purple-900/50 rounded">M</kbd> to toggle sound
      </div>
    </div>
  );
}
