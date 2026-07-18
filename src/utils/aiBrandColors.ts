import { AI_BRAND_COLORS, BrandColor } from '@/constants/aiColors';

const PROVIDER_TO_BRAND: Record<string, keyof typeof AI_BRAND_COLORS> = {
  claude: 'claude',
  anthropic: 'claude',
  openai: 'openai',
  chatgpt: 'openai',
  gpt: 'openai',
  google: 'gemini',
  gemini: 'gemini',
  perplexity: 'perplexity',
  mistral: 'mistral',
  cohere: 'cohere',
  deepseek: 'deepseek',
  grok: 'grok',
};

const NAME_KEYWORDS: Array<{ keyword: string; brand: keyof typeof AI_BRAND_COLORS }> = [
  { keyword: 'claude', brand: 'claude' },
  { keyword: 'anthropic', brand: 'claude' },
  { keyword: 'gpt', brand: 'openai' },
  { keyword: 'openai', brand: 'openai' },
  { keyword: 'chatgpt', brand: 'openai' },
  { keyword: 'gemini', brand: 'gemini' },
  { keyword: 'google', brand: 'gemini' },
  { keyword: 'perplexity', brand: 'perplexity' },
  { keyword: 'mistral', brand: 'mistral' },
  { keyword: 'cohere', brand: 'cohere' },
  { keyword: 'deepseek', brand: 'deepseek' },
  { keyword: 'grok', brand: 'grok' },
];

const normalize = (value?: string) => value?.toLowerCase().replace(/[^a-z0-9]/g, '') ?? '';

export function getBrandPalette(provider?: string, fallbackName?: string): BrandColor | null {
  const normalizedProvider = normalize(provider);
  if (normalizedProvider && PROVIDER_TO_BRAND[normalizedProvider]) {
    const brandKey = PROVIDER_TO_BRAND[normalizedProvider];
    return AI_BRAND_COLORS[brandKey];
  }

  const normalizedName = normalize(fallbackName);
  if (normalizedName) {
    const match = NAME_KEYWORDS.find(({ keyword }) => normalizedName.includes(keyword));
    if (match) {
      return AI_BRAND_COLORS[match.brand];
    }
  }

  return null;
}

export function getBrandAccent(provider?: string, fallbackName?: string): string | null {
  const palette = getBrandPalette(provider, fallbackName);
  return palette ? palette[500] : null;
}

// Perceived luminance (0–255) via the sRGB weighted formula.
const hexLuminance = (hex: string): number => {
  const normalized = hex.replace('#', '');
  if (normalized.length < 6) return 128;
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  if ([r, g, b].some(Number.isNaN)) return 128;
  return 0.299 * r + 0.587 * g + 0.114 * b;
};

/**
 * Resolve a brand accent that stays legible against the active surface.
 * Near-monochrome palettes (e.g. Grok) have a [500] shade that vanishes on a
 * dark surface; step to a lighter shade in dark mode so the border, header
 * label and streaming indicator remain visible and on-brand. Saturated
 * palettes are returned unchanged.
 */
export function getReadableBrandAccent(palette: BrandColor, isDark: boolean): string {
  const accent = palette[500];
  const luminance = hexLuminance(accent);
  if (isDark && luminance < 80) {
    return palette[300];
  }
  if (!isDark && luminance > 200) {
    return palette[700];
  }
  return accent;
}
