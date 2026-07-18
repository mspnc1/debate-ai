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

// Streaming chunks can arrive far faster than the display can render. Notifying
// subscribers on every chunk forces the (growing) streaming cell to re-render
// and FlatList to re-measure it each time — the source of RN's "VirtualizedList
// is slow to update" warning. Coalesce notifications to ~30fps: the snapshot is
// always updated synchronously (so getSnapshot stays fresh for any render that
// happens for another reason), but listeners fire at most once per interval.
// Terminal transitions flush immediately so final content never waits on a timer.
const NOTIFY_INTERVAL_MS = 33;

const pendingNotify = new Map<string, ReturnType<typeof setTimeout>>();
const lastNotifyAt = new Map<string, number>();

const notify = (messageId: string): void => {
  listeners.get(messageId)?.forEach(listener => listener());
};

const cancelPendingNotify = (messageId: string): void => {
  const timer = pendingNotify.get(messageId);
  if (timer) {
    clearTimeout(timer);
    pendingNotify.delete(messageId);
  }
};

// Fire listeners now and reset the throttle window. Used for stream start and
// every terminal transition.
const flushNotify = (messageId: string): void => {
  cancelPendingNotify(messageId);
  lastNotifyAt.set(messageId, Date.now());
  notify(messageId);
};

// Coalescing notify for the hot append path: fire immediately when the window
// has elapsed (leading edge), otherwise schedule a single trailing notify at the
// window boundary. Repeated calls inside the window collapse into that one timer.
const scheduleNotify = (messageId: string): void => {
  if (pendingNotify.has(messageId)) return;
  const elapsed = Date.now() - (lastNotifyAt.get(messageId) ?? 0);
  if (elapsed >= NOTIFY_INTERVAL_MS) {
    flushNotify(messageId);
    return;
  }
  const timer = setTimeout(() => {
    pendingNotify.delete(messageId);
    lastNotifyAt.set(messageId, Date.now());
    notify(messageId);
  }, NOTIFY_INTERVAL_MS - elapsed);
  pendingNotify.set(messageId, timer);
};

const forgetNotifyBookkeeping = (messageId: string): void => {
  cancelPendingNotify(messageId);
  lastNotifyAt.delete(messageId);
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
  flushNotify(input.messageId);
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
  scheduleNotify(messageId);
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
  flushNotify(messageId);
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
  flushNotify(messageId);
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
  forgetNotifyBookkeeping(messageId);
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
  pendingNotify.forEach(timer => clearTimeout(timer));
  pendingNotify.clear();
  lastNotifyAt.clear();
  streams.clear();
  messageIds.forEach(notify);
};
