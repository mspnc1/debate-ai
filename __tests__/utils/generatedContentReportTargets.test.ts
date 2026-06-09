import {
  buildGalleryAssetReportTarget,
  buildMessageReportTarget,
} from '@/utils/generatedContentReportTargets';
import type { GalleryAsset, GeneratedImageEntry } from '@/store/createSlice';
import type { Message } from '@/types';

describe('generatedContentReportTargets', () => {
  it('builds chat message report targets with generated image prompt context', () => {
    const message: Message = {
      id: 'msg-image',
      sender: 'Claude',
      senderType: 'ai',
      content: '',
      timestamp: Date.now(),
      attachments: [
        { type: 'image', uri: 'file:///local/image.png', mimeType: 'image/png' },
      ],
      metadata: {
        sessionId: 'session-1',
        generatedImage: {
          url: 'file:///local/image.png',
          prompt: 'A policy diagram',
          providerId: 'openai',
          model: 'gpt-image-1',
        },
      },
    };

    expect(buildMessageReportTarget(message, 'chat')).toMatchObject({
      surface: 'chat',
      contentType: 'image',
      contentId: 'msg-image',
      sessionId: 'session-1',
      prompt: 'A policy diagram',
      providerId: 'openai',
      modelId: 'gpt-image-1',
      metadata: {
        sender: 'Claude',
        attachmentCount: 1,
      },
    });
  });

  it('omits inline base64 from text excerpts', () => {
    const message: Message = {
      id: 'msg-text',
      sender: 'Gemini',
      senderType: 'ai',
      content: 'Here is an image data:image/png;base64,abcdef123456== in markdown.',
      timestamp: Date.now(),
    };

    const target = buildMessageReportTarget(message, 'chat', 'session-2');

    expect(target.contentText).toBe('Here is an image [base64 omitted] in markdown.');
  });

  it('builds compare message report targets with session context', () => {
    const message: Message = {
      id: 'compare-msg',
      sender: 'ChatGPT',
      senderType: 'ai',
      content: 'Compare answer',
      timestamp: Date.now(),
      metadata: {
        providerId: 'openai',
        modelUsed: 'gpt-5.5',
      },
    };

    expect(buildMessageReportTarget(message, 'compare', 'compare-session')).toMatchObject({
      surface: 'compare',
      contentType: 'text',
      contentId: 'compare-msg',
      sessionId: 'compare-session',
      title: 'Compare text from ChatGPT',
      contentText: 'Compare answer',
      providerId: 'openai',
      modelId: 'gpt-5.5',
    });
  });

  it('builds Create gallery asset report targets without local media upload data', () => {
    const entry: GeneratedImageEntry = {
      id: 'img-1',
      uri: 'file:///local/gallery/img-1.png',
      prompt: 'A concept sketch',
      originalPrompt: 'A concept sketch',
      provider: 'openai',
      model: 'gpt-image-1',
      createdAt: Date.now(),
      isRefinement: false,
      isUploaded: false,
    };
    const asset: GalleryAsset = {
      id: entry.id,
      type: 'image',
      source: 'image',
      entry,
      prompt: entry.prompt,
      originalPrompt: entry.originalPrompt,
      providerId: entry.provider,
      modelId: entry.model,
      uri: entry.uri,
      createdAt: entry.createdAt,
      isRefinement: entry.isRefinement,
      isUploaded: entry.isUploaded,
    };

    const target = buildGalleryAssetReportTarget(asset);

    expect(target).toMatchObject({
      surface: 'create',
      contentType: 'image',
      contentId: 'img-1',
      prompt: 'A concept sketch',
      providerId: 'openai',
      modelId: 'gpt-image-1',
    });
    expect(target).not.toHaveProperty('contentText');
  });
});
