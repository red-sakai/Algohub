'use client';

import { useState, useEffect } from 'react';
import { soundEffects } from '@/lib/audio/soundEffects';
import { backgroundMusic } from '@/lib/audio/backgroundMusic';

export default function VolumeControl() {
  const [volume, setVolume] = useState<number>(30); // 0-100
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showSlider, setShowSlider] = useState<boolean>(false);

  useEffect(() => {
    // Set initial volume from sound effects
    const initialVolume = soundEffects.getVolume() * 100;
    setVolume(initialVolume);
  }, []);

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    const normalizedVolume = newVolume / 100;
    
    // Update both sound effects and music
    soundEffects.setVolume(normalizedVolume);
    backgroundMusic.setVolume(normalizedVolume * 0.5); // Music at 50% of SFX volume
    
    if (newVolume === 0) {
      setIsMuted(true);
    } else if (isMuted) {
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    if (isMuted) {
      // Unmute
      handleVolumeChange(volume || 30);
      setIsMuted(false);
    } else {
      // Mute
      soundEffects.setVolume(0);
      backgroundMusic.setVolume(0);
      setIsMuted(true);
    }
  };

  return (
    <div className="fixed top-4 left-4 z-40">
      <div className="relative">
        {/* Volume Button */}
        <button
          onClick={() => setShowSlider(!showSlider)}
          onDoubleClick={toggleMute}
          className="w-12 h-12 bg-purple-600/80 hover:bg-purple-600 backdrop-blur-md rounded-full text-white text-xl shadow-lg hover:shadow-purple-500/50 transition-all hover:scale-110 flex items-center justify-center"
          title={`Volume: ${volume}% (Double-click to ${isMuted ? 'unmute' : 'mute'})`}
        >
          {isMuted || volume === 0 ? '🔇' : volume < 50 ? '🔉' : '🔊'}
        </button>

        {/* Volume Slider Panel */}
        {showSlider && (
          <div className="absolute top-14 left-0 bg-gradient-to-br from-slate-900/95 to-purple-900/95 backdrop-blur-md rounded-2xl p-4 shadow-2xl border-2 border-purple-500/30 w-64">
            <div className="flex items-center justify-between mb-3">
              <span className="text-white font-semibold text-sm">Volume</span>
              <span className="text-purple-300 text-sm font-mono">{volume}%</span>
            </div>

            {/* Slider */}
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
              style={{
                background: `linear-gradient(to right, rgb(168, 85, 247) 0%, rgb(168, 85, 247) ${volume}%, rgb(51, 65, 85) ${volume}%, rgb(51, 65, 85) 100%)`
              }}
            />

            {/* Preset Buttons */}
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => handleVolumeChange(0)}
                className="flex-1 py-1.5 bg-slate-700/50 hover:bg-slate-700 rounded text-white text-xs transition-colors"
              >
                Mute
              </button>
              <button
                onClick={() => handleVolumeChange(30)}
                className="flex-1 py-1.5 bg-slate-700/50 hover:bg-slate-700 rounded text-white text-xs transition-colors"
              >
                30%
              </button>
              <button
                onClick={() => handleVolumeChange(50)}
                className="flex-1 py-1.5 bg-slate-700/50 hover:bg-slate-700 rounded text-white text-xs transition-colors"
              >
                50%
              </button>
              <button
                onClick={() => handleVolumeChange(100)}
                className="flex-1 py-1.5 bg-slate-700/50 hover:bg-slate-700 rounded text-white text-xs transition-colors"
              >
                100%
              </button>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-700">
              <p className="text-xs text-slate-400">
                🎵 Music: {Math.round(volume * 0.5)}% | 🔊 SFX: {volume}%
              </p>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          background: white;
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 0 8px rgba(168, 85, 247, 0.8);
        }

        .slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          background: white;
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 0 8px rgba(168, 85, 247, 0.8);
          border: none;
        }
      `}</style>
    </div>
  );
}
