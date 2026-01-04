/**
 * High Score Manager
 * Stores and retrieves high scores using localStorage
 */

import { TraversalType } from '@/types/pinball';

export interface HighScore {
  score: number;
  algorithm: TraversalType;
  nodeCount: number;
  timestamp: number;
  perfect: boolean;
}

const STORAGE_KEY = 'pinball-high-scores';
const MAX_SCORES = 10;

class HighScoreManager {
  /**
   * Save a new score
   */
  saveScore(score: HighScore): boolean {
    const scores = this.getAllScores();
    scores.push(score);
    
    // Sort by score descending
    scores.sort((a, b) => b.score - a.score);
    
    // Keep only top scores
    const topScores = scores.slice(0, MAX_SCORES);
    
    // Check if this score made it to the list
    const madeTheList = topScores.some(s => 
      s.timestamp === score.timestamp && s.score === score.score
    );
    
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(topScores));
    }
    
    return madeTheList;
  }

  /**
   * Get all high scores
   */
  getAllScores(): HighScore[] {
    if (typeof window === 'undefined') return [];
    
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }

  /**
   * Get high scores for specific algorithm
   */
  getScoresByAlgorithm(algorithm: TraversalType): HighScore[] {
    return this.getAllScores().filter(s => s.algorithm === algorithm);
  }

  /**
   * Get personal best for algorithm
   */
  getPersonalBest(algorithm: TraversalType): HighScore | null {
    const scores = this.getScoresByAlgorithm(algorithm);
    return scores.length > 0 ? scores[0] : null;
  }

  /**
   * Check if score is a new high score
   */
  isNewHighScore(score: number, algorithm: TraversalType): boolean {
    const best = this.getPersonalBest(algorithm);
    return !best || score > best.score;
  }

  /**
   * Clear all high scores
   */
  clearScores(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  /**
   * Get rank for a score
   */
  getRank(score: number): number {
    const scores = this.getAllScores();
    return scores.filter(s => s.score > score).length + 1;
  }
}

export const highScoreManager = new HighScoreManager();
