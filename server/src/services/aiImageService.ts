import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

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
              text: 'Analyze this prize image. Describe it in detail focusing on: shape, colors, materials, style, character features, and overall aesthetic. Be specific and descriptive - this will be used to generate a similar but enhanced version.'
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

    if (!response.data[0].b64_json) {
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
  const { rarity, difficulty, tokensSpent, customTraits } = customization;
  
  // Start with the analyzed image description
  let prompt = `Create a high-quality 3D render based on this description: ${imageDescription}. `;
  
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
  
  // Add rarity-based enhancements
  switch (rarity.toLowerCase()) {
    case 'legendary':
      prompt += `Transform it into a LEGENDARY version with a radiant golden aura, glowing magical particles floating around it, ornate golden decorations and patterns. `;
      prompt += `Premium mystical materials, holographic rainbow accents, ethereal divine glow effects, celestial energy. `;
      break;
    case 'epic':
      prompt += `Transform it into an EPIC version with purple and blue mystical energy effects, shimmering magical particles. `;
      prompt += `Enhanced with crystals, arcane symbols, high-quality enchanted materials, powerful mystical glow. `;
      break;
    case 'rare':
      prompt += `Transform it into a RARE version with blue energy effects, magical sparkles, and polished enchanted finish. `;
      prompt += `Quality craftsmanship with subtle magical glow, refined details, gentle shimmer. `;
      break;
    case 'uncommon':
      prompt += `Transform it into an UNCOMMON version with soft green highlights, slight magical shimmer, and enhanced clean design. `;
      prompt += `Good quality with subtle improvements, light glow accents. `;
      break;
    default: // common
      prompt += `Keep the basic design but make it look clean and polished, with simple materials and soft lighting. `;
  }
  
  // Add difficulty-based detail enhancements
  if (difficulty >= 8) {
    prompt += `Add extremely intricate patterns, ultra-detailed textures, masterwork quality embellishments, complex ornamental features. `;
  } else if (difficulty >= 6) {
    prompt += `Add detailed decorative features, special unique elements, enhanced texturing. `;
  } else if (difficulty >= 4) {
    prompt += `Add clean detailed elements, nice subtle features, smooth polished look. `;
  }
  
  // Add uniqueness based on tokens spent (more tokens = more elaborate)
  if (tokensSpent > 50) {
    prompt += `Extra elaborate with bonus premium decorative elements, luxury accents, special unique features. `;
  } else if (tokensSpent > 30) {
    prompt += `Enhanced with additional decorative touches, refined details, quality improvements. `;
  }
  
  // Technical requirements
  prompt += `Professional product photography style, soft studio lighting with dramatic highlights, `;
  prompt += `slight depth of field, isolated subject on clean gradient background, premium NFT artwork quality. `;
  prompt += `Maintain the character and essence of the original but make it more impressive and valuable-looking. `;
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
