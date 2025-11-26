# AI Prize Image Generation Flow

## Overview
Each NFT prize gets a **unique, dynamically generated image** at claim time using OpenAI's GPT-4 Vision + DALL-E 3.

**Key Innovation:** Uses the **actual won prize image as reference**, then enhances it with rarity-based effects.

## Architecture

### Flow
1. **Player wins prize** → Claims with signed voucher
2. **Backend validates** → Replay data, difficulty, tokens spent
3. **Map prizeId → image** → Load corresponding prize placeholder image
4. **GPT-4 Vision analyzes** → Describes the prize image in detail
5. **AI generates enhanced image** → DALL-E 3 creates unique version based on:
   - Base prize image description (from GPT-4 Vision)
   - Rarity (Common, Uncommon, Rare, Epic, Legendary)
   - Difficulty level (1-10)
   - Tokens spent
   - Player address
   - Timestamp
6. **Upload to IPFS** → Enhanced image uploaded to Pinata
7. **Create metadata** → NFT metadata with unique image hash
8. **Mint NFT** → On-chain with unique metadata URI

## Two-Step AI Process

### Step 1: Image Analysis (GPT-4 Vision)
```typescript
// Analyze the base prize image
const analysis = await openai.chat.completions.create({
  model: 'gpt-4o', // GPT-4 with vision
  messages: [{
    role: 'user',
    content: [
      { type: 'text', text: 'Analyze this prize image...' },
      { type: 'image_url', image_url: { url: imageDataUrl } }
    ]
  }]
});
```

**Output:** Detailed description of the prize (colors, shape, materials, style, character features)

### Step 2: Enhanced Generation (DALL-E 3)
```typescript
// Generate enhanced version based on analysis
const prompt = buildEnhancedPrompt(analysisDescription, customization);
const image = await openai.images.generate({
  model: 'dall-e-3',
  prompt: prompt,
  size: '1024x1024'
});
```

**Output:** Enhanced version of the original prize with rarity effects

## Implementation

### Backend Services

#### `aiImageService.ts`
- `generatePrizeImage()` - Two-step generation:
  1. GPT-4 Vision analyzes base prize image
  2. DALL-E 3 creates enhanced version
- Dynamic prompt building based on rarity and difficulty
- Returns Buffer for immediate IPFS upload

#### `prizeMapper.ts` (New Utility)
- `getPrizeImagePath()` - Maps prizeId to image file path
- `getPrizeInfo()` - Gets prize configuration from prizes.json
- Validates prize IDs and file existence

#### `ipfsService.ts` (Updated)
- `uploadPrizeImage()` - Now accepts Buffer from AI generation
- Uploads directly to Pinata
- Returns IPFS hash

#### `gameRoutes.ts` (Updated)
- `/api/game/submit-win` endpoint:
  1. Validates replay data
  2. Maps prizeId to image file path
  3. Calculates rarity from difficulty
  4. Analyzes prize image with GPT-4 Vision
  5. Generates enhanced image with DALL-E 3
  6. Uploads to IPFS
  7. Creates metadata
  8. Signs voucher
  9. Returns voucher + metadata

### Frontend (Updated)

#### `useGameFlow.ts`
- Removed `prizeImageHash` parameter
- Backend now handles image generation
- Frontend just sends: `sessionId`, `walletAddress`, `prizeId`, `replayData`

## Prompt Engineering

### Vision Analysis Prompt

```
"Analyze this prize image. Describe it in detail focusing on: 
shape, colors, materials, style, character features, and overall aesthetic. 
Be specific and descriptive - this will be used to generate a similar 
but enhanced version."
```

### Enhancement Prompt Structure

```typescript
`Create a high-quality 3D render based on this description: ${imageDescription}.`
+ rarity-based enhancements
+ difficulty-based details
+ tokens-based elaboration
+ technical requirements
```

### Rarity-Based Styling

**Legendary (Difficulty 8-10)**
- Golden aura, glowing particles
- Ornate decorations, premium materials
- Holographic accents, ethereal effects

**Epic (Difficulty 6-7)**
- Purple/blue energy effects
- Shimmering particles, mystical glow

**Rare (Difficulty 4-5)**
- Blue energy effects, sparkles
- Polished finish, quality craftsmanship

**Uncommon (Difficulty 2-3)**
- Green highlights, clean design
- Slight shimmer

**Common (Difficulty 1)**
- Simple design, basic materials

### Customization Variables

1. **Difficulty** → Detail level and intricacy
2. **Tokens Spent** → Bonus decorative elements
3. **Rarity** → Visual effects and materials
4. **Player Address** → Seed for consistent variation
5. **Timestamp** → Additional uniqueness

## Configuration

### Environment Variables

```bash
# .env
OPENAI_API_KEY=your_openai_api_key_here
```

### DALL-E 3 Settings

```typescript
{
  model: 'dall-e-3',
  prompt: '...', // Built from GPT-4 Vision analysis + enhancements
  n: 1,
  size: '1024x1024',
  quality: 'standard',
  response_format: 'b64_json'
}
```

### GPT-4 Vision Settings

```typescript
{
  model: 'gpt-4o', // GPT-4 with vision
  messages: [/* image + analysis prompt */],
  max_tokens: 300
}
```

## Cost Considerations

### OpenAI Pricing
- GPT-4 Vision (gpt-4o): ~$0.005 per image analysis
- DALL-E 3 Standard (1024x1024): ~$0.04 per image generation
- **Total per NFT: ~$0.045**

### Optimization Strategies
1. **Cache Vision analysis** - Same base prize = reuse description
2. **Batch generation** (future) - Pre-generate popular combinations
3. **Quality tiers** - Use DALL-E 2 for common prizes, DALL-E 3 for rare+
4. **Image variations** - Generate base, then use variations API for similar prizes

## Testing

### Test AI Generation
```bash
cd server
npm run test:services
```

### Manual Test
```typescript
import aiImageService from './services/aiImageService';

const image = await aiImageService.generatePrizeImage({
  basePrizeName: 'white_cloud',
  basePrizeType: 'cute cloud plushie',
  basePrizeImagePath: '/path/to/white_cloud.png',
  rarity: 'Epic',
  difficulty: 7,
  tokensSpent: 30,
  playerAddress: '0x...',
  timestamp: Date.now()
});
```

## Future Enhancements

### Phase 2: Advanced Customization
- Player stats influence image (win streak, total prizes)
- Seasonal themes (holidays, events)
- Player-chosen color schemes
- Special edition variants

### Phase 3: Prize Collections
- Set bonuses (collect 3 similar → unique variant)
- Evolution mechanics (upgrade prize rarity)
- Combination recipes (merge 2 prizes → new prize)

### Phase 4: AI Model Fine-Tuning
- Train custom model on prize aesthetics
- Consistent style across all prizes
- Lower cost per generation
- Faster generation time

## Error Handling

### AI Generation Failures
1. **Rate limiting** → Queue system with retries
2. **Content policy violations** → Fallback to safe prompts
3. **API errors** → Retry with exponential backoff
4. **Timeout** → Default to pre-generated backup image

### IPFS Upload Failures
1. Retry up to 3 times
2. Try alternate gateway
3. Cache locally until successful
4. Alert monitoring system

## Monitoring

### Key Metrics
- Vision analysis time (avg ~2-3 seconds)
- Image generation time (avg ~10-15 seconds)
- IPFS upload time (avg ~2-5 seconds)
- **Total claim time: ~15-25 seconds** (target: <30 seconds)
- Success rate (target: >99%)
- Cost per NFT (target: ~$0.045)

### Logging
```
🎨 Generating unique AI image for prize #7408 (prize_penguin, Epic)...
📁 Base image: /path/to/penguin.png
🔍 Analyzing base prize image with GPT-4 Vision...
📝 Image analysis: "A cute cartoon penguin plushie with..."
🎨 Generating enhanced AI image with DALL-E 3...
📋 Prompt: "Create a high-quality 3D render based on this description..."
✅ AI image generated successfully
📤 Uploading AI-generated image to IPFS...
✅ Image uploaded: ipfs://Qm...
```

## Security

### API Key Protection
- Never expose in frontend
- Environment variable only
- Rotate regularly
- Monitor usage for anomalies

### Image Content
- Family-friendly prompts only
- Filter inappropriate content
- Review flagged images
- Comply with OpenAI policies

## Migration Notes

### From Placeholder System
**Before:**
- Frontend sent static `prizeImageHash`
- Pre-uploaded placeholder images
- Same image for all NFTs
- No customization

**After:**
- Backend analyzes actual prize image with GPT-4 Vision
- Backend generates unique enhanced version with DALL-E 3
- Every NFT gets custom image based on won prize
- Rarity, difficulty, and tokens affect visual enhancement
- Frontend sends prize details only

### No Breaking Changes
- Contract unchanged
- NFT metadata format unchanged
- Frontend API simplified (removed parameter)
- Existing NFTs unaffected

## Resources

- [OpenAI DALL-E 3 Docs](https://platform.openai.com/docs/guides/images)
- [Pinata IPFS Docs](https://docs.pinata.cloud/)
- [NFT Metadata Standard](https://docs.opensea.io/docs/metadata-standards)

---

**Status:** ✅ Implemented
**Ready for:** Testing with real OpenAI API key
