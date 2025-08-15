import React from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { Box } from '../../atoms';
import { Typography, Button } from '../';
import { useTheme } from '../../../theme';

interface LoadMoreIndicatorProps {
  isLoading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  totalShowing: number;
  totalItems: number;
}

export const LoadMoreIndicator: React.FC<LoadMoreIndicatorProps> = ({
  isLoading,
  hasMore,
  onLoadMore,
  totalShowing,
  totalItems
}) => {
  const { theme } = useTheme();

  if (!hasMore) {
    return (
      <Box style={styles.container}>
        <Typography 
          variant="caption" 
          color="secondary" 
          align="center"
          style={styles.endMessage}
        >
          {totalItems > 0 
            ? `All ${totalItems} conversations loaded`
            : 'No conversations to show'
          }
        </Typography>
      </Box>
    );
  }

  return (
    <Box style={styles.container}>
      <Typography 
        variant="caption" 
        color="secondary" 
        align="center"
        style={styles.progressText}
      >
        Showing {totalShowing} of {totalItems} conversations
      </Typography>

      {isLoading ? (
        <Box style={styles.loadingContainer}>
          <ActivityIndicator 
            size="small" 
            color={theme.colors.primary[500]} 
            style={styles.spinner}
          />
          <Typography 
            variant="caption" 
            color="secondary"
            style={styles.loadingText}
          >
            Loading more...
          </Typography>
        </Box>
      ) : (
        <Button
          title={`Load More (${totalItems - totalShowing} remaining)`}
          onPress={onLoadMore}
          variant="secondary"
          size="small"
          style={styles.loadMoreButton}
        />
      )}
    </Box>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  progressText: {
    marginBottom: 12,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spinner: {
    marginRight: 8,
  },
  loadingText: {
    fontStyle: 'italic',
  },
  loadMoreButton: {
    minWidth: 200,
  },
  endMessage: {
    fontStyle: 'italic',
    opacity: 0.7,
  },
});