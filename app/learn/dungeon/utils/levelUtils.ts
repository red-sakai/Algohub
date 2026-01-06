/**
 * Utility functions for enemy level generation and validation
 */

export interface LevelValidationResult {
  success: boolean;
  levels?: number[];
  error?: string;
}

/**
 * Parse and validate level input string
 */
export function validateLevelInput(input: string): LevelValidationResult {
  // Parse input: accept comma or space separated integers
  const parsed = input
    .split(/[,\s]+/)
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !isNaN(n) && n >= 1 && n <= 100);

  if (parsed.length < 10 || parsed.length > 12) {
    return {
      success: false,
      error:
        "Please enter 10-12 integers between 1 and 100 (comma or space separated)",
    };
  }

  // Check for duplicates
  const uniqueLevels = new Set(parsed);
  if (uniqueLevels.size !== parsed.length) {
    const duplicates = parsed.filter(
      (value, index) => parsed.indexOf(value) !== index
    );
    const uniqueDuplicates = [...new Set(duplicates)];
    return {
      success: false,
      error: `Duplicate levels detected: ${uniqueDuplicates.join(
        ", "
      )}\n\nPlease ensure all levels are unique.`,
    };
  }

  return {
    success: true,
    levels: parsed,
  };
}

/**
 * Generate random unique enemy levels
 */
export function generateRandomLevels(): string {
  // Randomly choose between 10, 11, or 12 enemies
  const count = Math.floor(Math.random() * 3) + 10; // Generates 10, 11, or 12

  // Generate unique random levels between 1 and 100
  const usedLevels = new Set<number>();
  const randomLevels: number[] = [];

  // Generate unique random levels (max 100 attempts to prevent infinite loop)
  let attempts = 0;
  const maxAttempts = 100;

  while (randomLevels.length < count && attempts < maxAttempts) {
    const randomLevel = Math.floor(Math.random() * 100) + 1; // 1-100
    if (!usedLevels.has(randomLevel)) {
      usedLevels.add(randomLevel);
      randomLevels.push(randomLevel);
    }
    attempts++;
  }

  // Shuffle the array for randomness
  for (let i = randomLevels.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [randomLevels[i], randomLevels[j]] = [randomLevels[j], randomLevels[i]];
  }

  return randomLevels.join(", ");
}
