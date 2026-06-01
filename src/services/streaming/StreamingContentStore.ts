import type { StreamingMessage } from '@/store/streamingSlice';

type Listener = () => void;

export type StreamingContentSnapshot = StreamingMessage & {
  exists: boolean;
};

const EMPTY_SNAPSHOT: StreamingContentSnapshot = Object.freeze({
  exists: false,
  messageId: '',
  content: '',
  isStreaming: false,
  startTime: 0,
  aiProvider: '',
  cursorVisible: false,
  chunksReceived: 0,
  bytesReceived: 0,
});

const streams = new Map<string, StreamingContentSnapshot>();
const listeners = new Map<string, Set<Listener>>();

const notify = (messageId: string): void => {
  listeners.get(messageId)?.forEach(listener => listener());
};

export const subscribeStreamingContent = (messageId: string, listener: Listener): (() => void) => {
  const messageListeners = listeners.get(messageId) || new Set<Listener>();
  messageListeners.add(listener);
  listeners.set(messageId, messageListeners);

  return () => {
    messageListeners.delete(listener);
    if (messageListeners.size === 0) {
      listeners.delete(messageId);
    }
  };
};

export const getStreamingContentSnapshot = (messageId: string): StreamingContentSnapshot => (
  streams.get(messageId) || EMPTY_SNAPSHOT
);

export const startStreamingContent = (input: {
  messageId: string;
  aiProvider: string;
}): void => {
  streams.set(input.messageId, {
    exists: true,
    messageId: input.messageId,
    content: '',
    isStreaming: true,
    status: 'streaming',
    startTime: Date.now(),
    aiProvider: input.aiProvider,
    cursorVisible: true,
    chunksReceived: 0,
    bytesReceived: 0,
  });
  notify(input.messageId);
};

export const appendStreamingContent = (messageId: string, chunk: string): void => {
  if (!chunk) return;

  const current = streams.get(messageId);
  if (!current || !current.isStreaming) return;

  const chunksReceived = current.chunksReceived + 1;
  streams.set(messageId, {
    ...current,
    content: current.content + chunk,
    chunksReceived,
    bytesReceived: current.bytesReceived + chunk.length,
    cursorVisible: chunksReceived % 3 !== 0,
  });
  notify(messageId);
};

export const completeStreamingContent = (messageId: string, finalContent?: string): void => {
  const current = streams.get(messageId);
  if (!current) return;

  streams.set(messageId, {
    ...current,
    content: finalContent ?? current.content,
    isStreaming: false,
    status: 'completed',
    endTime: Date.now(),
    cursorVisible: false,
    error: undefined,
  });
  notify(messageId);
};

export const failStreamingContent = (
  messageId: string,
  error: string,
  status: StreamingMessage['status'] = 'failed'
): void => {
  const current = streams.get(messageId);
  if (!current) return;

  streams.set(messageId, {
    ...current,
    isStreaming: false,
    status,
    error,
    endTime: Date.now(),
    cursorVisible: false,
  });
  notify(messageId);
};

export const cancelActiveStreamingContent = (
  messageId: string,
  reason: 'cancelled' | 'interrupted' = 'cancelled'
): void => {
  failStreamingContent(
    messageId,
    reason === 'interrupted' ? 'Stream interrupted' : 'Stream cancelled',
    reason
  );
};

export const clearStreamingContent = (messageId: string): void => {
  streams.delete(messageId);
  notify(messageId);
};

export const clearCompletedStreamingContent = (): void => {
  Array.from(streams.entries()).forEach(([messageId, stream]) => {
    if (!stream.isStreaming) {
      clearStreamingContent(messageId);
    }
  });
};

export const getActiveStreamingContentIds = (): string[] => (
  Array.from(streams.values())
    .filter(stream => stream.isStreaming)
    .map(stream => stream.messageId)
);

export const resetStreamingContentStore = (): void => {
  const messageIds = Array.from(streams.keys());
  streams.clear();
  messageIds.forEach(notify);
};
