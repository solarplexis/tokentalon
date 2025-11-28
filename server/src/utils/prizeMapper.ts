import path from 'path';
import fs from 'fs';

/**
 * Maps prize IDs to their image files and customizable traits
 * Based on prizes.json configuration
 */

interface PrizeType {
  key: string;
  rarity: string;
  baseSize: number;
  grabDifficulty: number;
  customizableTraits?: Record<string, string[]>;
}

interface PrizesData {
  prizeTypes: PrizeType[];
}

export interface SelectedTraits {
  [traitCategory: string]: string;
}

// Load prizes configuration
// __dirname in tsx points to server/src/utils, so go up 3 levels to workspace root
const prizesJsonPath = path.join(__dirname, '../../../client/public/assets/prizes.json');
const prizesData: PrizesData = JSON.parse(fs.readFileSync(prizesJsonPath, 'utf-8'));

/**
 * Get prize image path by prize ID
 * Prize IDs are 1-indexed and correspond to position in prizeTypes array
 */
export function getPrizeImagePath(prizeId: number): string {
  // PrizeId is 1-indexed in contract, but array is 0-indexed
  const arrayIndex = prizeId - 1;
  
  if (arrayIndex < 0 || arrayIndex >= prizesData.prizeTypes.length) {
    throw new Error(`Invalid prize ID: ${prizeId}. Must be between 1 and ${prizesData.prizeTypes.length}`);
  }
  
  const prize = prizesData.prizeTypes[arrayIndex];
  
  // Convert prize key to image filename
  // e.g., "prize_white_cloud" -> "white_cloud.png"
  const imageName = prize.key.replace('prize_', '') + '.png';
  const imagePath = path.join(__dirname, '../../../client/public/assets/images/prizes', imageName);
  
  // Verify file exists
  if (!fs.existsSync(imagePath)) {
    throw new Error(`Prize image not found: ${imagePath}`);
  }
  
  return imagePath;
}

/**
 * Get prize info by ID
 */
export function getPrizeInfo(prizeId: number): PrizeType {
  const arrayIndex = prizeId - 1;
  
  if (arrayIndex < 0 || arrayIndex >= prizesData.prizeTypes.length) {
    throw new Error(`Invalid prize ID: ${prizeId}`);
  }
  
  return prizesData.prizeTypes[arrayIndex];
}

/**
 * Generate custom traits for a prize based on difficulty and randomness
 * Higher difficulty = rarer trait options
 */
export function generateCustomTraits(
  prizeId: number,
  difficulty: number,
  tokensSpent: number,
  playerAddress: string
): SelectedTraits {
  const prize = getPrizeInfo(prizeId);
  
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
 * Format traits for prompt inclusion
 */
/**
 * Convert prize key to readable name
 * e.g., "prize_nemo" → "Nemo", "prize_dragon_egg" → "Dragon Egg"
 */
export function getPrizeName(prizeKey: string): string {
  // Remove "prize_" prefix and convert to Title Case
  return prizeKey
    .replace('prize_', '')
    .replace(/-/g, ' ')
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function formatTraitsForPrompt(traits: SelectedTraits): string {
  if (Object.keys(traits).length === 0) {
    return '';
  }
  
  const traitDescriptions = Object.entries(traits)
    .map(([category, value]) => {
      // Convert snake_case to readable format. Need to 
      const readableValue = value.replace(/_/g, ' ');
      const readableCategory = category.replace(/_/g, ' ');
      return `${readableCategory}: ${readableValue}`;
    })
    .join(', ');
  
  return `Add these specific customizations: ${traitDescriptions}. `;
}

export default {
  getPrizeImagePath,
  getPrizeInfo,
  generateCustomTraits,
  formatTraitsForPrompt,
  getPrizeName
};
