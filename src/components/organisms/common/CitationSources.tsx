import React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { CitationList } from './CitationList';
import type { CitationListVariant } from './CitationList';
import { useCitationInteractions } from '@/hooks/useCitationInteractions';
import type { Citation } from '@/types';

export interface CitationSourcesProps {
  citations?: Citation[];
  variant?: CitationListVariant;
  initialVisible?: number;
  brandColor?: string;
  showHeader?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const CitationSources: React.FC<CitationSourcesProps> = React.memo(({
  citations,
  variant = 'compact',
  initialVisible = 3,
  brandColor,
  showHeader = true,
  style,
}) => {
  const { handleCitationPress } = useCitationInteractions(brandColor);

  if (!citations || citations.length === 0) {
    return null;
  }

  return (
    <CitationList
      citations={citations}
      variant={variant}
      initialVisible={initialVisible}
      brandColor={brandColor}
      showHeader={showHeader}
      style={style}
      onCitationPress={handleCitationPress}
    />
  );
});

CitationSources.displayName = 'CitationSources';
