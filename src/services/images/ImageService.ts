import { AIProvider } from '../../types';
import {
  getImageModelDisplayName,
  getResolvedImageModel,
  ImageModelConfig,
} from '../../config/imageGenerationModels';
import { persistImageUri, saveBase64Image } from './fileCache';

const PIXEL_SIZE_TO_ASPECT_RATIO: Record<string, string> = {
  auto: '1:1',
  '1024x1024': '1:1',
  '1024x1536': '9:16',
  '1536x1024': '16:9',
  '1024x1792': '9:16',
  '1792x1024': '16:9',
};

export interface GenerateImageOptions {
  provider: AIProvider;
  model?: string;
  apiKey: string;
  prompt: string;
  size?: string;
  resolution?: string;
  n?: number;
  signal?: AbortSignal;
  sourceImage?: string;
}

export interface GeneratedImage {
  url?: string;
  b64?: string;
  mimeType: string;
}

interface OpenAICompatibleImageResponse {
  data?: Array<{
    url?: string;
    b64_json?: string;
    mime_type?: string;
  }>;
}

interface GoogleGeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
        inlineData?: { data: string; mimeType: string };
      }>;
    };
  }>;
}

interface GoogleImagenResponse {
  generatedImages?: Array<{
    image?: {
      imageBytes?: string;
      mimeType?: string;
    };
  }>;
  predictions?: Array<{
    bytesBase64Encoded?: string;
    mimeType?: string;
    image?: {
      imageBytes?: string;
      mimeType?: string;
    };
  }>;
}

function normalizeAspectRatio(size?: string): string | undefined {
  if (!size) return undefined;
  return PIXEL_SIZE_TO_ASPECT_RATIO[size] || size;
}

function toDataUri(sourceImage: string, mimeType = 'image/png'): string {
  if (sourceImage.startsWith('data:')) {
    return sourceImage;
  }

  const base64Data = sourceImage.includes(',') ? sourceImage.split(',')[1] : sourceImage;
  return `data:${mimeType};base64,${base64Data}`;
}

function getPreferredResolution(model: ImageModelConfig, requestedResolution?: string): string | undefined {
  if (!model.resolutions?.length) {
    return undefined;
  }

  if (requestedResolution && model.resolutions.includes(requestedResolution)) {
    return requestedResolution;
  }

  if (model.resolutions.includes('1K')) {
    return '1K';
  }

  return model.resolutions[0];
}

export class ImageService {
  static async generateImage(opts: GenerateImageOptions): Promise<GeneratedImage[]> {
    const normalizedOpts = {
      ...opts,
      apiKey: opts.apiKey.trim(),
    };
    const model = getResolvedImageModel(normalizedOpts.provider, normalizedOpts.model);
    if (!model) {
      throw new Error(`Image generation not implemented for provider: ${normalizedOpts.provider}`);
    }

    if (!normalizedOpts.apiKey) {
      throw new Error(`No API key for ${normalizedOpts.provider}`);
    }

    if (normalizedOpts.sourceImage && !model.supportsImageInput) {
      throw new Error(`${getImageModelDisplayName(normalizedOpts.provider, model.id)} does not support image refinement.`);
    }

    switch (model.apiFamily) {
      case 'openai-images':
        return this.generateOpenAI(model, normalizedOpts);
      case 'google-gemini-image':
        return this.generateGoogleGemini(model, normalizedOpts);
      case 'google-imagen':
        return this.generateGoogleImagen(model, normalizedOpts);
      case 'xai-images':
        return this.generateXai(model, normalizedOpts);
      default:
        throw new Error(`Image generation not implemented for model: ${model.id}`);
    }
  }

  private static async generateOpenAI(
    model: ImageModelConfig,
    opts: GenerateImageOptions
  ): Promise<GeneratedImage[]> {
    if (opts.sourceImage) {
      return this.generateOpenAIEdit(model, opts);
    }

    const body: Record<string, unknown> = {
      model: model.id,
      prompt: opts.prompt,
      size: opts.size || '1024x1024',
    };

    if (opts.n && opts.n > 1) {
      body.n = opts.n;
    }

    const res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${opts.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: opts.signal,
    });

    const text = await res.text();
    if (!res.ok) {
      throw new Error(`OpenAI Images error ${res.status}: ${text}`);
    }

    return this.parseOpenAICompatibleImages(JSON.parse(text) as OpenAICompatibleImageResponse);
  }

  private static async generateOpenAIEdit(
    model: ImageModelConfig,
    opts: GenerateImageOptions
  ): Promise<GeneratedImage[]> {
    if (!opts.sourceImage) {
      throw new Error('sourceImage is required for img2img');
    }

    const base64Data = opts.sourceImage.includes(',') ? opts.sourceImage.split(',')[1] : opts.sourceImage;
    const fileUri = await saveBase64Image(base64Data, 'image/png', {
      location: 'cache',
      prefix: 'edit-source',
    });

    const formData = new FormData();
    formData.append('model', model.id);
    formData.append('prompt', opts.prompt);
    formData.append('n', String(opts.n || 1));
    formData.append('image', {
      uri: fileUri,
      type: 'image/png',
      name: 'image.png',
    } as unknown as Blob);

    const res = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${opts.apiKey}`,
      },
      body: formData,
      signal: opts.signal,
    });

    const text = await res.text();
    if (!res.ok) {
      throw new Error(`OpenAI Images Edit error ${res.status}: ${text}`);
    }

    return this.parseOpenAICompatibleImages(JSON.parse(text) as OpenAICompatibleImageResponse);
  }

  private static async generateXai(
    model: ImageModelConfig,
    opts: GenerateImageOptions
  ): Promise<GeneratedImage[]> {
    if (opts.sourceImage) {
      return this.generateXaiEdit(model, opts);
    }

    const body: Record<string, unknown> = {
      model: model.id,
      prompt: opts.prompt,
    };

    const aspectRatio = normalizeAspectRatio(opts.size);
    if (aspectRatio) {
      body.aspect_ratio = aspectRatio;
    }
    if (opts.n && opts.n > 1) {
      body.n = opts.n;
    }

    const res = await fetch('https://api.x.ai/v1/images/generations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${opts.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: opts.signal,
    });

    const text = await res.text();
    if (!res.ok) {
      throw new Error(`Grok Images error ${res.status}: ${text}`);
    }

    return this.parseOpenAICompatibleImages(JSON.parse(text) as OpenAICompatibleImageResponse);
  }

  private static async generateXaiEdit(
    model: ImageModelConfig,
    opts: GenerateImageOptions
  ): Promise<GeneratedImage[]> {
    if (!opts.sourceImage) {
      throw new Error('sourceImage is required for img2img');
    }

    const body: Record<string, unknown> = {
      model: model.id,
      prompt: opts.prompt,
      image: {
        url: toDataUri(opts.sourceImage),
      },
    };

    if (opts.n && opts.n > 1) {
      body.n = opts.n;
    }

    const res = await fetch('https://api.x.ai/v1/images/edits', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${opts.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: opts.signal,
    });

    const text = await res.text();
    if (!res.ok) {
      throw new Error(`Grok Images Edit error ${res.status}: ${text}`);
    }

    return this.parseOpenAICompatibleImages(JSON.parse(text) as OpenAICompatibleImageResponse);
  }

  private static async generateGoogleGemini(
    model: ImageModelConfig,
    opts: GenerateImageOptions
  ): Promise<GeneratedImage[]> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model.id}:generateContent`;
    const aspectRatio = normalizeAspectRatio(opts.size) || '1:1';

    const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];

    if (opts.sourceImage) {
      const base64Data = opts.sourceImage.includes(',') ? opts.sourceImage.split(',')[1] : opts.sourceImage;
      parts.push({
        inlineData: {
          mimeType: 'image/png',
          data: base64Data,
        },
      });
      parts.push({
        text: `GENERATE A NEW IMAGE: Take the provided image and create an improved, enhanced version of it. Do NOT just describe or copy the image - you must generate a new image.\n\n${opts.prompt}`,
      });
    } else {
      parts.push({ text: opts.prompt });
    }

    const imageConfig: Record<string, string> = {
      aspectRatio,
    };

    const preferredResolution = getPreferredResolution(model, opts.resolution);
    if (preferredResolution) {
      imageConfig.imageSize = preferredResolution;
    }

    const body = {
      contents: [{ parts }],
      generationConfig: {
        responseModalities: ['IMAGE', 'TEXT'],
        imageConfig,
      },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': opts.apiKey,
      },
      body: JSON.stringify(body),
      signal: opts.signal,
    });

    const text = await res.text();
    if (!res.ok) {
      throw new Error(`Google Images error ${res.status}: ${text}`);
    }

    const data = JSON.parse(text) as GoogleGeminiResponse;
    return this.parseGoogleGeminiImages(data);
  }

  private static async generateGoogleImagen(
    model: ImageModelConfig,
    opts: GenerateImageOptions
  ): Promise<GeneratedImage[]> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model.id}:predict`;
    const aspectRatio = normalizeAspectRatio(opts.size) || '1:1';

    const parameters: Record<string, unknown> = {
      sampleCount: Math.max(1, Math.min(opts.n || 1, 4)),
      aspectRatio,
    };

    const preferredResolution = getPreferredResolution(model, opts.resolution);
    if (preferredResolution && model.id !== 'imagen-4.0-fast-generate-001') {
      parameters.imageSize = preferredResolution;
    }

    const body = {
      instances: [{ prompt: opts.prompt }],
      parameters,
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': opts.apiKey,
      },
      body: JSON.stringify(body),
      signal: opts.signal,
    });

    const text = await res.text();
    if (!res.ok) {
      throw new Error(`Google Images error ${res.status}: ${text}`);
    }

    const data = JSON.parse(text) as GoogleImagenResponse;
    return this.parseGoogleImagenImages(data);
  }

  private static async parseOpenAICompatibleImages(
    data: OpenAICompatibleImageResponse
  ): Promise<GeneratedImage[]> {
    const results: GeneratedImage[] = [];

    for (const item of data.data || []) {
      const mimeType = item.mime_type || 'image/png';

      if (item.b64_json) {
        const fileUri = await saveBase64Image(item.b64_json, mimeType);
        results.push({ url: fileUri, b64: item.b64_json, mimeType });
        continue;
      }

      if (item.url) {
        const persistedUri = await persistImageUri(item.url, { mimeType, prefix: 'generated' });
        results.push({ url: persistedUri || item.url, mimeType });
      }
    }

    return results;
  }

  private static async parseGoogleGeminiImages(
    data: GoogleGeminiResponse
  ): Promise<GeneratedImage[]> {
    const results: GeneratedImage[] = [];

    for (const candidate of data.candidates || []) {
      for (const part of candidate.content?.parts || []) {
        if (!part.inlineData?.data) {
          continue;
        }

        const mimeType = part.inlineData.mimeType || 'image/png';
        const fileUri = await saveBase64Image(part.inlineData.data, mimeType);
        results.push({
          url: fileUri,
          b64: part.inlineData.data,
          mimeType,
        });
      }
    }

    if (results.length === 0) {
      const textPart = data.candidates
        ?.flatMap((candidate) => candidate.content?.parts || [])
        .find((part) => part.text);
      if (textPart?.text) {
        throw new Error(`Google returned text instead of image data: ${textPart.text.slice(0, 160)}`);
      }
      throw new Error('Google returned no image data.');
    }

    return results;
  }

  private static async parseGoogleImagenImages(
    data: GoogleImagenResponse
  ): Promise<GeneratedImage[]> {
    const results: GeneratedImage[] = [];

    for (const item of data.generatedImages || []) {
      const base64 = item.image?.imageBytes;
      if (!base64) {
        continue;
      }

      const mimeType = item.image?.mimeType || 'image/png';
      const fileUri = await saveBase64Image(base64, mimeType);
      results.push({
        url: fileUri,
        b64: base64,
        mimeType,
      });
    }

    for (const item of data.predictions || []) {
      const base64 = item.bytesBase64Encoded || item.image?.imageBytes;
      if (!base64) {
        continue;
      }

      const mimeType = item.mimeType || item.image?.mimeType || 'image/png';
      const fileUri = await saveBase64Image(base64, mimeType);
      results.push({
        url: fileUri,
        b64: base64,
        mimeType,
      });
    }

    if (results.length === 0) {
      throw new Error('Google returned no Imagen image data.');
    }

    return results;
  }

  static async generateMultiple(
    providers: Array<{ provider: AIProvider; apiKey: string }>,
    opts: Omit<GenerateImageOptions, 'provider' | 'apiKey'>
  ): Promise<Map<AIProvider, GeneratedImage[] | Error>> {
    const results = new Map<AIProvider, GeneratedImage[] | Error>();

    await Promise.all(
      providers.map(async ({ provider, apiKey }) => {
        try {
          const images = await this.generateImage({
            ...opts,
            provider,
            apiKey,
          });
          results.set(provider, images);
        } catch (error) {
          results.set(provider, error as Error);
        }
      })
    );

    return results;
  }
}
