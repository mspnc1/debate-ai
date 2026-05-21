import { useCallback } from 'react';
import { Dimensions, Linking } from 'react-native';
import { useCitationPreview } from '@/providers/CitationPreviewProvider';
import { findCitationByUrl } from '@/utils/citationUtils';
import type { Citation } from '@/types';

export const useCitationInteractions = (brandColor?: string) => {
  const { showPreview } = useCitationPreview();

  const handleCitationPress = useCallback((citation: Citation) => {
    const screenWidth = Dimensions.get('window').width;
    const screenHeight = Dimensions.get('window').height;
    showPreview(citation, { x: screenWidth / 2, y: screenHeight / 3 }, brandColor);
  }, [brandColor, showPreview]);

  const handleCitationLinkPress = useCallback((url: string, citations?: Citation[]): boolean => {
    const citation = citations?.length ? findCitationByUrl(url, citations) : undefined;

    if (citation) {
      handleCitationPress(citation);
      return false;
    }

    Linking.openURL(url).catch(err => console.error('Failed to open URL:', err));
    return false;
  }, [handleCitationPress]);

  return {
    handleCitationPress,
    handleCitationLinkPress,
  };
};
