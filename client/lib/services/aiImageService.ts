import OpenAI from 'openai';

/**
 * AI Image Generation Service using OpenAI DALL-E
 * Generates customized prize images based on base prize and attributes
 */

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export interface PrizeCustomization {
  basePrizeName: string;
  basePrizeType: string; // 'plushie', 'trophy', 'gadget', etc.
  basePrizeImagePath: string; // Path to base prize image
  customTraits: Record<string, string>; // e.g., { eyewear: "sunglasses", expression: "winking" }
  rarity: string;
  difficulty: number;
  tokensSpent: number;
  playerAddress: string;
  timestamp: number;
}

/**
 * Generate a unique prize image using OpenAI DALL-E 3 with reference image analysis
 * Takes base prize image and customization attributes
 * Returns base64 encoded image data
 */
export async function generatePrizeImage(
  customization: PrizeCustomization
): Promise<Buffer> {
  try {
    // Step 1: Read base prize image
    const fs = await import('fs');
    const path = await import('path');
    
    const imageBuffer = fs.readFileSync(customization.basePrizeImagePath);
    const base64Image = imageBuffer.toString('base64');
    const imageDataUrl = `data:image/png;base64,${base64Image}`;
    
    console.log('🔍 Analyzing base prize image with GPT-4 Vision...');
    
    // Step 2: Use GPT-4 Vision to analyze the prize image
    const analysisResponse = await openai.chat.completions.create({
      model: 'gpt-4o', // GPT-4 with vision
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Analyze this plushie/stuffed toy prize image. Describe it as a SOFT, CUDDLY PLUSHIE focusing on: the character design, plushie proportions, soft fabric textures, stitching details, cute features, stuffed toy aesthetic, and overall plushie style. Emphasize that this is a STUFFED TOY with plush fabric materials. Be specific and descriptive - this will be used to generate a similar but enhanced plushie version.'
            },
            {
              type: 'image_url',
              image_url: {
                url: imageDataUrl
              }
            }
          ]
        }
      ],
      max_tokens: 300
    });
    
    const imageDescription = analysisResponse.choices[0].message.content || '';
    console.log('📝 Image analysis:', imageDescription);
    
    // Step 3: Build enhanced prompt based on analysis + customization
    const prompt = buildEnhancedPrompt(imageDescription, customization);
    
    console.log('🎨 Generating enhanced AI image with DALL-E 3...');
    console.log('📋 Prompt:', prompt);

    // Step 4: Generate enhanced image with DALL-E 3
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
      response_format: 'b64_json'
    });

    if (!response.data || !response.data[0]?.b64_json) {
      throw new Error('No image data returned from OpenAI');
    }

    // Convert base64 to buffer
    const outputBuffer = Buffer.from(response.data[0].b64_json, 'base64');
    
    console.log('✅ AI image generated successfully');
    return outputBuffer;

  } catch (error: any) {
    console.error('❌ Error generating AI image:', error);
    throw new Error(`Failed to generate AI image: ${error.message}`);
  }
}

/**
 * Build enhanced DALL-E prompt based on GPT-4 Vision analysis + customization
 */
function buildEnhancedPrompt(imageDescription: string, customization: PrizeCustomization): string {
  const { rarity, difficulty, tokensSpent, customTraits, playerAddress } = customization;

  // Generate random background color based on player address for uniqueness
  const solidColors = [
    '#FFB6C1', '#87CEEB', '#98FB98', '#DDA0DD', // Light pink, sky blue, pale green, plum
    '#F0E68C', '#FFE4B5', '#FFDAB9', '#E0FFFF', // Khaki, moccasin, peach, light cyan
    '#F5DEB3', '#FFE4E1', '#F0FFF0', '#FFF0F5', // Wheat, misty rose, honeydew, lavender blush
    '#FFFACD', '#E6E6FA', '#FFF5EE', '#F0F8FF', // Lemon chiffon, lavender, seashell, alice blue
    '#FDF5E6', '#FAF0E6', '#FFEFD5', '#FFE4C4'  // Old lace, linen, papaya, bisque
  ];

  const addressSeed = parseInt(playerAddress.slice(2, 10), 16);
  const backgroundColor = solidColors[addressSeed % solidColors.length];
  
  // Start with the analyzed image description - EMPHASIZE PLUSHIE NATURE
  let prompt = `Create a high-quality 3D render of an adorable PLUSHIE / STUFFED TOY based on this description: ${imageDescription}. `;
  prompt += `CRITICAL: This MUST look like a soft, cuddly STUFFED TOY / PLUSHIE with fabric texture, stitching, and a cute stuffed toy aesthetic. `;
  prompt += `Think of it as a collectible plushie you'd win from a claw machine - soft, huggable, with visible plush fabric material. `;

  // Add custom trait-based modifications FIRST (most specific)
  if (Object.keys(customTraits).length > 0) {
    const traitDescriptions = Object.entries(customTraits)
      .map(([category, value]) => {
        const readableValue = value.replace(/_/g, ' ');
        const readableCategory = category.replace(/_/g, ' ');
        return `${readableCategory}: ${readableValue}`;
      })
      .join(', ');
    
    prompt += `IMPORTANT: Add these specific customizations: ${traitDescriptions}. `;
  }
  
  // Add rarity-based enhancements - KEEP IT PLUSHIE!
  switch (rarity.toLowerCase()) {
    case 'legendary':
      prompt += `Transform it into a LEGENDARY plushie with premium ultra-soft golden fabric, intricate golden embroidered patterns, and deluxe stitching. `;
      prompt += `Add a radiant golden aura and glowing magical particles around the plushie, holographic rainbow fabric accents, celestial glow effects. `;
      prompt += `This is still a STUFFED TOY but made with the most premium plush materials and magical enhancements. `;
      break;
    case 'epic':
      prompt += `Transform it into an EPIC plushie with high-quality purple and blue fabric, magical embroidered symbols, shimmering sequins or metallic thread. `;
      prompt += `Add purple/blue mystical energy effects around the plushie, small crystal decorations sewn on, powerful mystical glow. `;
      prompt += `This is still a STUFFED TOY but with premium magical fabric and mystical plush effects. `;
      break;
    case 'rare':
      prompt += `Transform it into a RARE plushie with quality blue-accented fabric, magical sparkle effects, polished stitching and embroidery. `;
      prompt += `Add blue energy effects around the plushie, subtle magical glow, refined plush details. `;
      prompt += `This is still a STUFFED TOY but with enhanced magical fabric and quality craftsmanship. `;
      break;
    case 'uncommon':
      prompt += `Transform it into an UNCOMMON plushie with enhanced fabric quality, soft green highlights in the stitching, slight shimmer effect. `;
      prompt += `Clean plushie design with improved materials, light glow accents around the stuffed toy. `;
      prompt += `This is still a STUFFED TOY but with better plush materials and subtle improvements. `;
      break;
    default: // common
      prompt += `Keep the basic plushie design clean and polished, with simple soft fabric materials and gentle lighting. Classic stuffed toy look. `;
  }
  
  // Add difficulty-based detail enhancements - PLUSHIE FOCUSED
  if (difficulty >= 8) {
    prompt += `Add extremely intricate embroidered patterns, ultra-detailed plush fabric textures, masterwork quality plushie stitching, complex ornamental embroidery. `;
  } else if (difficulty >= 6) {
    prompt += `Add detailed embroidered decorations, special unique plushie elements, enhanced fabric texturing and stitching. `;
  } else if (difficulty >= 4) {
    prompt += `Add clean plushie details, nice subtle fabric features, smooth polished stuffed toy look. `;
  }

  // Add uniqueness based on tokens spent (more tokens = more elaborate) - PLUSHIE FOCUSED
  if (tokensSpent > 50) {
    prompt += `Extra elaborate plushie with bonus premium fabric elements, luxury plush accents, special unique stuffed toy features. `;
  } else if (tokensSpent > 30) {
    prompt += `Enhanced plushie with additional fabric touches, refined stitching details, quality plush improvements. `;
  }

  // Technical requirements - STRICT BACKGROUND RULES + PLUSHIE EMPHASIS
  prompt += `CRITICAL: Place this PLUSHIE/STUFFED TOY on a completely SOLID FLAT background color ${backgroundColor}. `;
  prompt += `ABSOLUTELY NO gradients, NO textures, NO patterns on the background - it must be a single uniform flat color. `;
  prompt += `The plushie should have NO drop shadows, NO cast shadows on the background. `;
  prompt += `Professional product photography style with soft studio lighting that highlights the soft plush fabric texture. `;
  prompt += `Isolated stuffed toy on the solid flat background, premium collectible plushie NFT quality. `;
  prompt += `REMEMBER: This must look like a SOFT, CUDDLY STUFFED TOY with visible fabric texture and plushie characteristics. `;
  prompt += `Maintain the character and essence of the original plushie but make it more impressive and collectible-looking. `;
  prompt += `No text, no watermarks, no UI elements, no logos.`;

  return prompt;
}

/**
 * Validate OpenAI API configuration
 */
export function validateOpenAIConfig(): boolean {
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY not configured');
    return false;
  }
  return true;
}

/**
 * Test OpenAI connection
 */
export async function testOpenAIConnection(): Promise<boolean> {
  try {
    // Simple test - just check API key validity with a basic completion
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'test' }],
      max_tokens: 5
    });
    
    console.log('✅ OpenAI connection successful');
    return true;
  } catch (error) {
    console.error('❌ OpenAI connection failed:', error);
    return false;
  }
}

export default {
  generatePrizeImage,
  validateOpenAIConfig,
  testOpenAIConnection
};
