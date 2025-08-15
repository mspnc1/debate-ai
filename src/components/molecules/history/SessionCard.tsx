import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Box } from '../../atoms';
import { Typography } from '../Typography';
import { useTheme } from '../../../theme';
import { dateFormatterService } from '../../../services/history';
import { SessionCardProps } from '../../../types/history';
import { SessionPreview } from './SessionPreview';
import { HighlightedText } from './HighlightedText';

export const SessionCard: React.FC<SessionCardProps> = ({
  session,
  onPress,
  searchTerm,
  index,
  testID
}) => {
  const { theme } = useTheme();
  
  const lastMessage = session.messages[session.messages.length - 1];
  const preview = lastMessage?.content || 'No messages yet';
  const aiNames = session.selectedAIs.map(ai => ai.name).join(' • ');
  
  // Check if this session contains the search term for highlighting
  const containsSearchTerm = searchTerm && (
    session.selectedAIs.some(ai => 
      ai.name.toLowerCase().includes(searchTerm.toLowerCase())
    ) ||
    session.messages.some(msg => 
      msg.content.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const handlePress = () => {
    onPress(session);
  };

  return (
    <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
      <TouchableOpacity
        onPress={handlePress}
        testID={testID}
        style={[
          styles.container,
          {
            backgroundColor: theme.colors.card,
            borderColor: containsSearchTerm ? theme.colors.primary[500] : theme.colors.border,
            borderWidth: containsSearchTerm ? 2 : 1,
            shadowColor: theme.colors.shadow,
          }
        ]}
      >
        <Box style={styles.content}>
          {/* Header */}
          <Box style={styles.header}>
            <Box style={{ flex: 1 }}>
              {searchTerm ? (
                <HighlightedText
                  text={aiNames}
                  searchTerm={searchTerm}
                  style={{ 
                    ...styles.aiNames, 
                    color: theme.colors.text.primary 
                  }}
                />
              ) : (
                <Typography 
                  variant="subtitle" 
                  weight="semibold" 
                  numberOfLines={1}
                  style={{ flex: 1 }}
                >
                  {aiNames}
                </Typography>
              )}
            </Box>
            <Typography variant="caption" color="secondary">
              {dateFormatterService.formatRelativeDate(session.createdAt)}
            </Typography>
          </Box>
          
          {/* Message Preview */}
          <SessionPreview 
            text={preview}
            searchTerm={searchTerm}
            style={styles.preview}
            maxLines={2}
          />
          
          {/* Footer */}
          <Box style={styles.footer}>
            <Typography variant="caption" color="secondary">
              {session.messages.length} message{session.messages.length !== 1 ? 's' : ''}
            </Typography>
            
            {/* Search Match Badge */}
            {containsSearchTerm && (
              <Box 
                style={[
                  styles.matchBadge, 
                  { backgroundColor: theme.colors.warning[50] }
                ]}
              >
                <Typography 
                  variant="caption" 
                  style={{ color: theme.colors.warning[600] }}
                >
                  Match found
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  preview: {
    marginBottom: 8,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  matchBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  aiNames: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
});