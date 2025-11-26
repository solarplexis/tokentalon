/**
 * Prize trait generation - matches backend algorithm for consistency
 */

import prizesData from '@/public/assets/prizes.json';

interface Prize {
  key: string;
  name: string;
  image: string;
  rarity: string;
  customizableTraits?: Record<string, string[]>;
}

export type SelectedTraits = Record<string, string>;

/**
 * Generate custom traits for a prize - MUST match backend algorithm
 * @param prizeId Prize ID (1-based index)
 * @param difficulty Game difficulty (1-10)
 * @param tokensSpent Tokens spent on this game
 * @param playerAddress Player's wallet address
 * @returns Selected traits object
 */
export function generateCustomTraits(
  prizeId: number,
  difficulty: number,
  tokensSpent: number,
  playerAddress: string
): SelectedTraits {
  const prizes = (prizesData as any).prizeTypes as Prize[];
  const prizeIndex = prizeId - 1; // Convert to 0-based index
  
  if (prizeIndex < 0 || prizeIndex >= prizes.length) {
    console.error(`Invalid prize ID: ${prizeId}`);
    return {};
  }
  
  const prize = prizes[prizeIndex];
  
  if (!prize.customizableTraits) {
    return {};
  }
  
  const selectedTraits: SelectedTraits = {};
  
  // Use player address as seed for deterministic but unique randomness
  const seed = parseInt(playerAddress.slice(2, 10), 16);
  
  for (const [category, options] of Object.entries(prize.customizableTraits)) {
    // Weight selection based on difficulty and tokens spent
    // Higher difficulty = higher chance of rarer options (later in array)
    const difficultyBonus = Math.min(difficulty / 10, 1); // 0-1 range
    const tokensBonus = Math.min(tokensSpent / 100, 0.5); // 0-0.5 range
    const totalBonus = difficultyBonus + tokensBonus; // 0-1.5 range
    
    // Calculate index with bias toward end of array for higher bonuses
    const randomFactor = (seed % 1000) / 1000; // Pseudo-random 0-1
    const biasedIndex = Math.floor(
      (randomFactor + totalBonus) * (options.length / 2)
    );
    
    const selectedIndex = Math.min(biasedIndex, options.length - 1);
    selectedTraits[category] = options[selectedIndex];
  }
  
  return selectedTraits;
}

/**
 * Format traits for display (snake_case to Title Case)
 */
export function formatTraitForDisplay(trait: string): string {
  return trait
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
