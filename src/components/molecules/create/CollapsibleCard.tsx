/**
 * CollapsibleCard
 *
 * A bordered card with a tappable header that expands/collapses its content.
 * Used for grouping optional/advanced settings (e.g. per-model image output
 * settings, audio settings) so the default view stays uncluttered.
 */

import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Typography } from '../common/Typography';
import { InfoButton } from '../common/InfoButton';
import { HelpTopicId } from '@/config/help/types';
import { useTheme } from '@/theme';

interface CollapsibleCardProps {
  title: string;
  /** One-line summary shown under the title when collapsed. */
  summary?: string;
  expanded: boolean;
  onToggle: () => void;
  /** Optional contextual (i) help button in the header. */
  helpTopicId?: HelpTopicId;
  /** Optional leading element (e.g. a provider avatar). */
  leading?: React.ReactNode;
  children: React.ReactNode;
  testID?: string;
}

export const CollapsibleCard: React.FC<CollapsibleCardProps> = ({
  title,
  summary,
  expanded,
  onToggle,
  helpTopicId,
  leading,
  children,
  testID,
}) => {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
      ]}
      testID={testID}
    >
      <TouchableOpacity
        style={styles.header}
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={title}
        testID={testID ? `${testID}-toggle` : undefined}
      >
        {leading}
        <View style={styles.headerText}>
          <Typography variant="body" weight="semibold" numberOfLines={1}>
            {title}
          </Typography>
          {summary ? (
            <Typography variant="caption" color="secondary" numberOfLines={1}>
              {summary}
            </Typography>
          ) : null}
        </View>
        {helpTopicId && <InfoButton topicId={helpTopicId} size="small" />}
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={theme.colors.text.secondary}
        />
      </TouchableOpacity>

      {expanded && (
        <View
          style={[styles.content, { borderTopColor: theme.colors.border }]}
          testID={testID ? `${testID}-content` : undefined}
        >
          {children}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  header: {
    minHeight: 64,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  content: {
    borderTopWidth: 1,
    padding: 12,
    gap: 12,
  },
});
