import { useSelector, useDispatch } from 'react-redux';
import { useCallback, useEffect, useSyncExternalStore } from 'react';
import {
  selectStreamingMessage,
  updateStreamingContent,
  endStreaming,
  streamingError,
  clearStreamingMessage,
} from '../../store/streamingSlice';
import type { AppDispatch } from '../../store';
import {
  appendStreamingContent,
  clearStreamingContent,
  completeStreamingContent,
  failStreamingContent,
  getStreamingContentSnapshot,
  subscribeStreamingContent,
} from '@/services/streaming/StreamingContentStore';

export interface StreamingMessageHook {
  // State
  content: string;
  isStreaming: boolean;
  cursorVisible: boolean;
  error?: string;
  chunksReceived: number;
  
  // Actions
  appendChunk: (chunk: string) => void;
  completeStream: (finalContent?: string) => void;
  handleError: (error: string) => void;
  clearStream: () => void;
  
  // Metrics
  streamDuration?: number;
  bytesReceived: number;
}

/**
 * Hook to manage streaming state for a specific message
 */
export const useStreamingMessage = (messageId: string): StreamingMessageHook => {
  const dispatch = useDispatch<AppDispatch>();
  
  const externalStream = useSyncExternalStore(
    useCallback((listener) => subscribeStreamingContent(messageId, listener), [messageId]),
    useCallback(() => getStreamingContentSnapshot(messageId), [messageId]),
    useCallback(() => getStreamingContentSnapshot(messageId), [messageId])
  );

  // Redux tracks lifecycle for app-level controls. Hot streaming text is kept
  // outside Redux so each chunk does not re-run middleware and list selectors.
  const streamingMessage = useSelector(selectStreamingMessage(messageId));
  const stream = externalStream.exists ? externalStream : streamingMessage;
  const isStreaming = stream?.isStreaming || false;
  const content = stream?.content || '';
  
  // Append a chunk to the streaming message
  const appendChunk = useCallback((chunk: string) => {
    appendStreamingContent(messageId, chunk);
    dispatch(updateStreamingContent({ messageId, chunk }));
  }, [dispatch, messageId]);
  
  // Complete the streaming session
  const completeStream = useCallback((finalContent?: string) => {
    completeStreamingContent(messageId, finalContent);
    dispatch(endStreaming({ messageId, finalContent }));
  }, [dispatch, messageId]);
  
  // Handle streaming error
  const handleError = useCallback((error: string) => {
    failStreamingContent(messageId, error);
    dispatch(streamingError({ messageId, error }));
  }, [dispatch, messageId]);
  
  // Clear stream data from memory
  const clearStream = useCallback(() => {
    clearStreamingContent(messageId);
    dispatch(clearStreamingMessage(messageId));
  }, [dispatch, messageId]);
  
  // Auto-cleanup completed streams after 5 minutes
  useEffect(() => {
    if (streamingMessage && !streamingMessage.isStreaming && streamingMessage.endTime) {
      const cleanupDelay = 5 * 60 * 1000; // 5 minutes
      const timer = setTimeout(() => {
        clearStream();
      }, cleanupDelay);
      
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [streamingMessage, clearStream]);
  
  // Calculate stream duration
  const streamDuration = stream?.endTime && stream?.startTime
    ? stream.endTime - stream.startTime
    : undefined;
  
  return {
    // State
    content,
    isStreaming,
    cursorVisible: stream?.cursorVisible || false,
    error: stream?.error,
    chunksReceived: stream?.chunksReceived || 0,
    
    // Actions
    appendChunk,
    completeStream,
    handleError,
    clearStream,
    
    // Metrics
    streamDuration,
    bytesReceived: stream?.bytesReceived || 0,
  };
};
