/**
 * DebateHeader Organism Component
 * Header component for the debate screen with navigation and status
 */

import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Box } from '../../atoms';
import { Typography } from '../../molecules';
import { useTheme } from '../../../theme';

export interface DebateHeaderProps {
  onStartOver?: () => void;
  currentRound?: number;
  maxRounds?: number;
  isActive?: boolean;
  showStartOver?: boolean;
}

export const DebateHeader: React.FC<DebateHeaderProps> = ({
  onStartOver,
  currentRound,
  maxRounds = 3,
  isActive = false,
  showStartOver = true,
}) => {
  const { theme } = useTheme();

  return (
    <Box style={{
      backgroundColor: theme.colors.surface,
      borderBottomColor: theme.colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
    }}>
      {showStartOver && onStartOver ? (
        <TouchableOpacity 
          onPress={onStartOver}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 16,
            backgroundColor: `${theme.colors.error[500]}15`,
          }}
        >
          <Typography style={{ 
            fontSize: 14,
            fontWeight: '600',
            color: theme.colors.error[500] 
          }}>
            Start Over
          </Typography>
        </TouchableOpacity>
      ) : (
        <Box style={{ width: 80 }} />
      )}
      
      <Typography variant="title" weight="bold">
        🎭 AI Debate Arena
      </Typography>
      
      <Box style={{ minWidth: 80 }}>
        {isActive && currentRound && (
          <Typography 
            variant="body" 
            style={{ 
              color: theme.colors.error[500], 
              fontWeight: '600',
              textAlign: 'right'
            }}
          >
            Round {currentRound}/{maxRounds}
          </Typography>
        )}
      </Box>
    </Box>
  );
};