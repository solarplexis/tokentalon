# Prize Custom Traits System

## Overview
Each prize type has **unique customizable trait categories** that make every NFT truly unique. Traits are selected based on **difficulty, tokens spent, and player address** for deterministic but varied results.

## Example: Nemo Fish Prize

```json
{
  "key": "prize_nemo",
  "customizableTraits": {
    "eyewear": ["none", "sunglasses", "eye_patch", "long_lashes", "reading_glasses"],
    "expression": ["happy", "surprised", "winking", "sleepy"],
    "accessory": ["none", "bubbles", "seaweed_crown", "pearl_necklace"]
  }
}
```

**Generated NFT might have:**
- Eyewear: `sunglasses` (Epic rarity = cooler traits)
- Expression: `winking`
- Accessory: `pearl_necklace`

## Prize-Specific Trait Categories

### Fish (Nemo, etc.)
- `eyewear`: Visual accessories
- `expression`: Facial expression
- `accessory`: Additional items

### Penguin
- `outfit`: Clothing (scarf, bow_tie, top_hat, earmuffs)
- `accessory`: Items (fish, snowflake, ice_cream)

### Alien
- `antenna`: Antenna style (single, double, spiral, glowing)
- `eye_count`: Number of eyes (two, three, four, one_large)
- `accessory`: Space items (space_helmet, ray_gun, flying_saucer)

### Dragon Egg
- `egg_color`: Base color (red, blue, green, purple, gold, crystal)
- `pattern`: Surface pattern (scales, gems, runes, flames)
- `glow`: Intensity (none, soft, pulsing, intense)

### Unicorn (Legendary)
- `horn_style`: Horn appearance (spiral, crystal, rainbow, glowing)
- `mane_color`: Mane coloring (rainbow, pastel, starlight, galaxy)
- `magic_aura`: Magical effects (sparkles, stars, aurora, celestial)

## Trait Selection Algorithm

```typescript
function generateCustomTraits(
  prizeId: number,
  difficulty: number,      // 1-10
  tokensSpent: number,     // 10-100+
  playerAddress: string    // Seed for randomness
): SelectedTraits
```

### Selection Weighting

1. **Difficulty Bonus** (0-1):
   - Difficulty 10 = 1.0 bonus
   - Difficulty 5 = 0.5 bonus
   - Higher difficulty → rarer traits

2. **Tokens Bonus** (0-0.5):
   - 100+ tokens = 0.5 bonus
   - 50 tokens = 0.25 bonus
   - More tokens spent → better traits

3. **Player Address**:
   - Used as deterministic seed
   - Same address + prize = same traits
   - Different addresses = different traits

4. **Combined Score** (0-1.5):
   - Biases selection toward end of trait array
   - Rarer options listed last in array

### Example Calculation

```typescript
// Prize: Nemo Fish, Difficulty: 7, Tokens: 30, Address: 0xabc...
difficultyBonus = 0.7  // 7/10
tokensBonus = 0.15     // 30/100 * 0.5
totalBonus = 0.85

// eyewear options: ["none", "sunglasses", "eye_patch", "long_lashes", "reading_glasses"]
// With 0.85 bonus → likely selects "eye_patch" or "long_lashes"
```

## NFT Metadata Format

### On-Chain Metadata
```json
{
  "name": "Prize #7408",
  "description": "TokenTalon Claw Machine Prize",
  "image": "ipfs://QmCustomGeneratedImage...",
  "attributes": [
    { "trait_type": "Prize ID", "value": 7408 },
    { "trait_type": "Difficulty", "value": 7 },
    { "trait_type": "Tokens Spent", "value": 30 },
    { "trait_type": "Rarity", "value": "Epic" },
    { "trait_type": "Eyewear", "value": "sunglasses" },
    { "trait_type": "Expression", "value": "winking" },
    { "trait_type": "Accessory", "value": "pearl necklace" }
  ]
}
```

### OpenSea Display
Traits show up as **filterable attributes** on OpenSea:
- Filter by "Eyewear: Sunglasses"
- Filter by "Expression: Winking"
- Collect specific combinations
- Trade based on rare trait combos

## AI Image Generation Flow

1. **Load base prize image** (e.g., `nemo.png`)
2. **Generate custom traits** based on difficulty/tokens/address
3. **GPT-4 Vision analyzes** base image
4. **Build enhanced prompt** with traits:
   ```
   "Create a high-quality 3D render based on this description: [GPT-4 analysis].
   IMPORTANT: Add these specific customizations: eyewear: sunglasses, 
   expression: winking, accessory: pearl necklace.
   Transform it into an EPIC version with purple and blue mystical energy..."
   ```
5. **DALL-E 3 generates** unique image with all traits + rarity effects
6. **Upload to IPFS** with metadata including traits

## Trait Rarity Distribution

### Common Prizes (Difficulty 1-3)
- First 2 options in each category (40% of options)
- "none", "basic" traits common

### Uncommon Prizes (Difficulty 4-5)
- First 3 options (60% of options)
- Some interesting traits appear

### Rare Prizes (Difficulty 6-7)
- First 4 options (80% of options)
- Cool combinations possible

### Epic/Legendary Prizes (Difficulty 8-10)
- All options available (100%)
- Best traits guaranteed
- Rarest combinations

## Future Enhancements

### Phase 2: Trait Synergies
- **Set Bonuses**: Collect 3 penguins with "top_hat" → special animation
- **Trait Evolution**: Merge 2 NFTs → combine traits
- **Seasonal Traits**: Holiday-specific options

### Phase 3: Dynamic Traits
- **Leveling**: NFT gains XP → unlock new trait options
- **Mutations**: Small chance of ultra-rare "mutant" trait
- **Time-based**: Traits change based on claim time/date

### Phase 4: Player Choice
- Player picks 1 trait category during claim
- Other categories auto-generated
- Premium mode: choose all traits (higher token cost)

## Trading & Marketplace Value

### High-Value Combinations
1. **Perfect Legendary**: Legendary prize + all best traits
2. **Rare Combo**: Uncommon prize with legendary-tier traits (lucky!)
3. **Thematic Sets**: All matching themes (e.g., all "cyberpunk" traits)
4. **Historical**: First NFT with specific trait combo

### OpenSea Filters
Players can search:
- "Show all Nemo with sunglasses"
- "Show all Epic with eye_patch"
- "Show all with pearl_necklace"

This creates **genuine scarcity** for specific trait combinations!

## Adding New Traits

### Steps to Add New Category

1. **Update prizes.json**:
```json
{
  "key": "prize_robot",
  "customizableTraits": {
    "antenna": ["basic", "satellite", "wifi", "holographic"],
    "lights": ["blue", "red", "rainbow", "pulsing"]
  }
}
```

2. **Order matters**: Last items in array = rarest
3. **Use snake_case**: Converts to "Title Case" in metadata
4. **Test generation**: Verify AI interprets traits correctly

### Trait Naming Best Practices
- ✅ `"long_lashes"` → Converts to "Long Lashes"
- ✅ `"eye_patch"` → Converts to "Eye Patch"
- ❌ Avoid special characters
- ❌ Keep names concise (< 20 chars)

## Cost Impact

**No additional cost!** Traits are:
- Generated algorithmically (free)
- Included in same AI prompt
- Stored in metadata (same IPFS upload)

**Total cost per NFT: Still ~$0.045**

---

**Status:** ✅ Implemented
**Next Step:** Generate OpenAI API key and test end-to-end
