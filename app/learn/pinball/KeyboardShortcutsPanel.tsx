'use client';

import { useState, useEffect } from 'react';

export default function KeyboardShortcutsPanel() {
  const [showPanel, setShowPanel] = useState<boolean>(true);
  const [hasInteracted, setHasInteracted] = useState<boolean>(false);

  useEffect(() => {
    // Check if user has seen shortcuts before
    const seen = localStorage.getItem('shortcuts-seen');
    if (seen) {
      setShowPanel(false);
      setHasInteracted(true);
    }
  }, []);

  const handleClose = () => {
    setShowPanel(false);
    localStorage.setItem('shortcuts-seen', 'true');
    setHasInteracted(true);
  };

  if (!showPanel && hasInteracted) {
    // Show minimized "?" button
    return (
      <button
        onClick={() => setShowPanel(true)}
        className="fixed top-4 right-4 z-40 w-12 h-12 bg-purple-600/80 hover:bg-purple-600 backdrop-blur-md rounded-full text-white text-xl font-bold shadow-lg hover:shadow-purple-500/50 transition-all hover:scale-110"
        title="Show keyboard shortcuts"
      >
        ⌨️
      </button>
    );
  }

  if (!showPanel) return null;

  const shortcuts = [
    { key: 'R', description: 'Reset current game', icon: '🔄' },
    { key: 'N', description: 'Build new tree', icon: '🌳' },
    { key: '1', description: 'Preorder traversal', icon: '1️⃣' },
    { key: '2', description: 'Inorder traversal', icon: '2️⃣' },
    { key: '3', description: 'Postorder traversal', icon: '3️⃣' },
    { key: 'P', description: 'Pause/Resume game', icon: '⏯️' },
    { key: 'M', description: 'Toggle sound & music', icon: '🔊' },
  ];

  return (
    <div className="fixed top-4 right-4 z-40 bg-gradient-to-br from-slate-900/95 to-purple-900/95 backdrop-blur-md rounded-2xl p-6 shadow-2xl border-2 border-purple-500/30 w-80">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          ⌨️ Keyboard Shortcuts
        </h3>
        <button
          onClick={handleClose}
          className="text-slate-400 hover:text-white transition-colors text-2xl"
        >
          ×
        </button>
      </div>

      <div className="space-y-2">
        {shortcuts.map((shortcut, index) => (
          <div
            key={index}
            className="flex items-center gap-3 p-2 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors"
          >
            <span className="text-xl">{shortcut.icon}</span>
            <kbd className="px-2 py-1 bg-purple-900/50 rounded text-purple-200 font-mono text-sm min-w-[2.5rem] text-center">
              {shortcut.key}
            </kbd>
            <span className="text-sm text-slate-300">{shortcut.description}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-slate-700">
        <p className="text-xs text-slate-400 text-center">
          Press <kbd className="px-1 py-0.5 bg-purple-900/50 rounded text-purple-200">⌨️</kbd> button anytime to see shortcuts
        </p>
      </div>
    </div>
  );
}
