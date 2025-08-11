// Helper to get AI provider logos with automatic fallback
// NOTE: Due to React Native bundler limitations, we must explicitly require all possible logos
// To update logos: 1) Replace the file 2) Clear Metro cache: npx expo start -c

/* eslint-disable @typescript-eslint/no-require-imports */
const aiProviderLogos: { [key: string]: number } = {
  // Add logos here as they become available
  // Uncomment when logo files exist:
  claude: require('../../assets/ai-providers/claude/logo.png'),
  openai: require('../../assets/ai-providers/openai/logo.png'),
  // google: require('../../assets/ai-providers/google/logo.png'),
  // nomi: require('../../assets/ai-providers/nomi/logo.png'),
  // character: require('../../assets/ai-providers/character/logo.png'),
  // replika: require('../../assets/ai-providers/replika/logo.png'),
  // cohere: require('../../assets/ai-providers/cohere/logo.png'),
  // mistral: require('../../assets/ai-providers/mistral/logo.png'),
  // perplexity: require('../../assets/ai-providers/perplexity/logo.png'),
};
/* eslint-enable @typescript-eslint/no-require-imports */

export function getAIProviderIcon(providerId: string) {
  // Check if we have a logo for this provider
  if (aiProviderLogos[providerId]) {
    return {
      icon: aiProviderLogos[providerId],
      iconType: 'image' as const,
    };
  }
  
  // Fallback to letter-based icon
  const letterMap: { [key: string]: string } = {
    claude: 'C',
    openai: 'GPT',
    google: 'G',
    nomi: 'N',
    character: 'CA',
    replika: 'R',
    cohere: 'Co',
    mistral: 'M',
    perplexity: 'P',
  };
  
  return {
    icon: letterMap[providerId] || providerId.charAt(0).toUpperCase(),
    iconType: 'letter' as const,
  };
}